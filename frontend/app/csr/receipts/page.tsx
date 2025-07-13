"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter } from 'next/navigation'
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { useSearchDebounce } from "@/hooks/useDebounce"
import { ReceiptTableRow } from "@/app/components/ReceiptTableRow"
import { 
  Search, Download, Filter, AlertTriangle, Loader2,
  CheckSquare, Square, Receipt as ReceiptIcon, CheckCircle, 
  FileText, Edit, Plus
} from "lucide-react"
import { 
  getReceipts,
  createUnassignedDraftReceipt,
  type Receipt,
  type ReceiptListFilters,
  deleteDraftReceipt
} from "@/app/services/receipt-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// Types for receipt stats (calculated from server response)
interface ReceiptStats {
  total_receipts: number
  drafts_count: number
  generated_count: number
  paid_today_count: number
  total_revenue: number
}

function ReceiptsPageInternal() {
  const router = useRouter()

  // State management
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([])
  
  // Server-side filter states
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateRangeFilter, setDateRangeFilter] = useState({
    startDate: "",
    endDate: ""
  })
  
  // Client-side search state (debounced)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  
  // UI states
  const [isExporting, setIsExporting] = useState(false)
  const [isCreatingReceipt, setIsCreatingReceipt] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Debounce search input to prevent excessive re-renders
  const { debouncedSearchTerm, isSearching } = useSearchDebounce(searchTerm, 300)

  // Use React Query with server-side filtering and pagination
  const {
    data,
    isLoading: queryIsLoading,
    isError: queryIsError,
    error: queryError,
    isFetching,
    refetch,
  } = useQuery<{ receipts: Receipt[]; stats: ReceiptStats; pagination: { total: number; page: number; per_page: number; total_pages: number } }, Error>({
    queryKey: ['receipts', { statusFilter, dateRangeFilter, debouncedSearchTerm, currentPage, itemsPerPage }],
    queryFn: async () => {
      // Build filter params for server-side filtering
      const filters: ReceiptListFilters = {
        page: currentPage,
        per_page: itemsPerPage
      }
      
      if (statusFilter !== "all") {
        filters.status = statusFilter
      }
      
      if (dateRangeFilter.startDate) {
        filters.date_from = dateRangeFilter.startDate
      }
      
      if (dateRangeFilter.endDate) {
        filters.date_to = dateRangeFilter.endDate
      }
      
      if (debouncedSearchTerm) {
        filters.search = debouncedSearchTerm
      }

      // Use updated getReceipts function with server-side filtering
      const response = await getReceipts(filters)
      
      // Calculate stats from the receipts (could be moved to server-side later)
      const stats: ReceiptStats = {
        total_receipts: response.total,
        drafts_count: response.receipts.filter(r => r.status === 'DRAFT').length,
        generated_count: response.receipts.filter(r => r.status === 'GENERATED').length,
        paid_today_count: response.receipts.filter(r => {
          const today = new Date().toDateString()
          const receiptDate = new Date(r.paid_at || '').toDateString()
          return r.status === 'PAID' && receiptDate === today
        }).length,
        total_revenue: response.receipts
          .filter(r => r.status === 'PAID')
          .reduce((sum, r) => sum + parseFloat(r.grand_total_amount), 0)
      }
      
      return { 
        receipts: response.receipts, 
        stats,
        pagination: {
          total: response.total,
          page: response.page,
          per_page: response.per_page,
          total_pages: response.total_pages
        }
      }
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    // Auto-refresh disabled as requested
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  })

  // All filtering is now done server-side
  const displayedReceipts = data?.receipts || []

  // Get pagination info from server response
  const totalPages = data?.pagination.total_pages || 1
  const totalReceipts = data?.pagination.total || 0

  // Reset pagination when server-side filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, dateRangeFilter, debouncedSearchTerm])

  // Event handlers
  const handleViewReceipt = useCallback((receipt: Receipt) => {
    router.push(`/csr/receipts/${receipt.id}`)
  }, [router])

  const handleEditReceipt = useCallback((receipt: Receipt) => {
    if (receipt.status === 'DRAFT') {
      router.push(`/csr/receipts/${receipt.id}`)
    } else {
      // View only for non-draft receipts
      router.push(`/csr/receipts/${receipt.id}`)
    }
  }, [router])

  const handleVoidReceipt = useCallback(async (receipt: Receipt) => {
    // TODO: Implement void functionality
    console.log("Void receipt:", receipt.id)
    toast.info("Void functionality coming soon")
  }, [])

  const handleAddReceipt = useCallback(async () => {
    setIsCreatingReceipt(true)
    try {
      const newReceipt = await createUnassignedDraftReceipt()
      router.push(`/csr/receipts/${newReceipt.id}`)
      toast.success("New receipt created successfully")
    } catch (error) {
      toast.error("Failed to create new receipt")
      console.error("Error creating receipt:", error)
    } finally {
      setIsCreatingReceipt(false)
    }
  }, [router])

  const handleDeleteDraft = useCallback(async (receipt: Receipt) => {
    if (receipt.status !== 'DRAFT') return;
    setDeletingId(receipt.id)
    try {
      await deleteDraftReceipt(receipt.id)
      toast.success('Draft receipt deleted successfully')
      refetch()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete draft receipt')
    } finally {
      setDeletingId(null)
    }
  }, [refetch])

  const toggleReceiptSelection = useCallback((receiptId: string) => {
    setSelectedReceipts(prev => 
      prev.includes(receiptId) 
        ? prev.filter(id => id !== receiptId)
        : [...prev, receiptId]
    )
  }, [])

  const toggleAllReceipts = useCallback(() => {
    if (selectedReceipts.length === displayedReceipts.length) {
      setSelectedReceipts([])
    } else {
      setSelectedReceipts(displayedReceipts.map(r => r.id.toString()))
    }
  }, [selectedReceipts.length, displayedReceipts])



  // Export functionality
  const exportToCSV = () => {
    setIsExporting(true)
    try {
      const headers = [
        "Receipt #",
        "Generation Date", 
        "Paid Date",
        "Status",
        "Tail #",
        "Customer Name",
        "Fuel Type",
        "Quantity",
        "Amount"
      ]
      
      const csvContent = [
        headers.join(","),
        ...displayedReceipts.map((receipt) =>
          [
            receipt.receipt_number,
            receipt.generated_at || "",
            receipt.paid_at || "",
            receipt.status,
            receipt.fuel_order_tail_number || "N/A",
            `Customer ${receipt.customer_id}`,
            receipt.fuel_type_at_receipt_time || "N/A",
            receipt.fuel_quantity_gallons_at_receipt_time || "N/A",
            receipt.grand_total_amount
          ].join(","),
        ),
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `receipts-export-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success("Receipts exported successfully")
    } catch (error) {
      toast.error("Failed to export receipts")
    } finally {
      setIsExporting(false)
    }
  }

  // Manual refresh removed; rely on user navigation or filter changes

  // Handle loading state
  if (queryIsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p>Loading receipts...</p>
        </div>
      </div>
    )
  }

  // Handle error state
  if (queryIsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <p className="text-red-600 text-lg font-semibold">Error Loading Receipts</p>
          <p className="text-muted-foreground">{queryError?.message}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    )
  }

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'GENERATED', label: 'Generated' },
    { value: 'PAID', label: 'Paid' },
    { value: 'VOID', label: 'Void' },
  ]


  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header with Stats */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Receipts Management</h1>
            <p className="text-muted-foreground">Search, filter, and manage all customer receipts</p>
          </div>
          {/* Auto-refresh and manual Refresh controls have been removed */}
        </div>

        {/* Stats Cards - Following fuel-orders pattern */}
        {data?.stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Receipts (Last 30 Days)</CardTitle>
                <ReceiptIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.total_receipts}</div>
                <p className="text-xs text-muted-foreground">Non-draft receipts</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Drafts</CardTitle>
                <Edit className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.drafts_count}</div>
                <p className="text-xs text-muted-foreground">In progress</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Generated (Unpaid)</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.generated_count}</div>
                <p className="text-xs text-muted-foreground">Awaiting payment</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.paid_today_count}</div>
                <p className="text-xs text-muted-foreground">Today's payments</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2">
          <Button onClick={handleAddReceipt} className="gap-2" disabled={isCreatingReceipt}>
            {isCreatingReceipt ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add Receipt
          </Button>
          <Button onClick={exportToCSV} variant="outline" className="gap-2" disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Advanced Filters - Following fuel-orders pattern */}
      <Card>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <Label htmlFor="search">Search Receipts</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Receipt #, Tail #, or Customer Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter} disabled={isFetching}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dateRange">Date Range</Label>
              <div className="flex gap-1">
                <Input
                  type="date"
                  value={dateRangeFilter.startDate}
                  onChange={(e) => setDateRangeFilter(prev => ({...prev, startDate: e.target.value}))}
                  className="text-xs"
                />
                <Input
                  type="date"
                  value={dateRangeFilter.endDate}
                  onChange={(e) => setDateRangeFilter(prev => ({...prev, endDate: e.target.value}))}
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receipts Table */}
      <Card className={cn({ 'opacity-60 transition-opacity': isFetching })}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Receipts ({totalReceipts})</CardTitle>
              <CardDescription>
                {statusFilter === "all" ? "All receipts" : `${statusFilter} receipts`}
                {selectedReceipts.length > 0 && ` • ${selectedReceipts.length} selected`}
              </CardDescription>
            </div>
            {displayedReceipts.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllReceipts}
                className="flex items-center gap-2"
              >
                {selectedReceipts.length === displayedReceipts.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Select All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Checkbox
                      checked={selectedReceipts.length === displayedReceipts.length && displayedReceipts.length > 0}
                      onCheckedChange={toggleAllReceipts}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Tail #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedReceipts.length > 0 ? (
                  displayedReceipts.map((receipt) => (
                    <ReceiptTableRow
                      key={receipt.id}
                      receipt={receipt}
                      isSelected={selectedReceipts.includes(receipt.id.toString())}
                      onToggleSelection={toggleReceiptSelection}
                      onView={handleViewReceipt}
                      onEdit={handleEditReceipt}
                      onVoid={receipt.status === 'DRAFT' ? handleDeleteDraft : handleVoidReceipt}
                      isLoading={deletingId === receipt.id}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No receipts found. Try adjusting your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalReceipts)} of {totalReceipts} receipts
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-10 h-8"
                  >
                    {pageNum}
                  </Button>
                )
              })}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="px-2">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-10 h-8"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReceiptsPage() {
  return (
    <Suspense fallback={<div>Loading receipts...</div>}>
      <ReceiptsPageInternal />
    </Suspense>
  )
}