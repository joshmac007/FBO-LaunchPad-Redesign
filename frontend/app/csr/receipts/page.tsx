"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Plane,
  Search,
  Download,
  Calendar,
  WifiOff,
  Receipt,
  CheckCircle,
  Clock,
  RefreshCw,
  Eye,
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  HelpCircle,
  X,
  SlidersHorizontal,
  DollarSign,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { isAuthenticated } from "@/app/services/auth-service"
import {
  getReceipts,
  filterReceipts,
  sortReceipts,
  convertReceiptsToCSV,
  downloadReceiptsCSV,
  getReceiptStatistics,
} from "@/app/services/receipt-service"
import { isOfflineMode, formatCurrency, formatDateTime } from "@/app/services/utils"
import Link from "next/link"

const ITEMS_PER_PAGE = 10

export default function ReceiptsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [receipts, setReceipts] = useState([])
  const [filteredReceipts, setFilteredReceipts] = useState([])

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("ALL")
  const [startDate, setStartDate] = useState()
  const [endDate, setEndDate] = useState()
  const [showFilters, setShowFilters] = useState(false)

  // Sorting state
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState("asc")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)

  // UI state
  const [isExporting, setIsExporting] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)

  useEffect(() => {
    // Check if user is logged in and is CSR
    if (!isAuthenticated()) {
      router.push("/login")
      return
    }

    const userData = localStorage.getItem("fboUser")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      if (!parsedUser.isLoggedIn || parsedUser.role !== "csr") {
        router.push("/login")
        return
      }
    }

    loadReceipts()
  }, [router])

  const loadReceipts = async () => {
    try {
      setIsLoading(true)
      const receiptData = await getReceipts()
      setReceipts(receiptData)
    } catch (error) {
      console.error("Error loading receipts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Apply filters and search
  useEffect(() => {
    let filtered = filterReceipts(
      receipts,
      searchTerm,
      startDate ? format(startDate, "yyyy-MM-dd") : undefined,
      endDate ? format(endDate, "yyyy-MM-dd") : undefined,
      statusFilter,
      paymentMethodFilter,
    )

    filtered = sortReceipts(filtered, sortBy, sortOrder)
    setFilteredReceipts(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }, [receipts, searchTerm, startDate, endDate, statusFilter, paymentMethodFilter, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredReceipts.length / ITEMS_PER_PAGE)
  const paginatedReceipts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredReceipts.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredReceipts, currentPage])

  // Statistics
  const statistics = useMemo(() => getReceiptStatistics(filteredReceipts), [filteredReceipts])

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const csvContent = convertReceiptsToCSV(filteredReceipts)
      const date = new Date().toISOString().split("T")[0]
      const filename = `receipts-export-${date}.csv`
      downloadReceiptsCSV(csvContent, filename)
    } catch (error) {
      console.error("Export error:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("ALL")
    setPaymentMethodFilter("ALL")
    setStartDate(undefined)
    setEndDate(undefined)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
      case "REFUNDED":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Refunded</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getSortIcon = (column) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    return sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const activeFiltersCount = [
    searchTerm,
    statusFilter !== "ALL" ? statusFilter : null,
    paymentMethodFilter !== "ALL" ? paymentMethodFilter : null,
    startDate,
    endDate,
  ].filter(Boolean).length

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="h-8 w-8 border-4 border-[#2A628F] border-t-transparent rounded-full"
            animate={{
              rotate: 360,
              transition: {
                repeat: Number.POSITIVE_INFINITY,
                duration: 1,
                ease: "linear",
              },
            }}
          />
          <p className="text-[#3A4356] dark:text-[#CBD5E0]">Loading receipts...</p>
        </motion.div>
      </div>
    )
  }

  const offline = isOfflineMode()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container flex h-16 items-center px-4 justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-[#2A628F] rotate-45" />
            <span className="text-xl font-bold text-[#3A4356] dark:text-[#F8FAFC]">FBO LaunchPad</span>
            <Badge variant="secondary" className="bg-[#2A628F]/10 text-[#2A628F] ml-2">
              CSR
            </Badge>
          </div>
          {offline && (
            <motion.div
              className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3 py-1 rounded-md"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <WifiOff className="h-4 w-4" />
              <span className="text-xs font-medium">Offline Mode</span>
            </motion.div>
          )}
        </div>
      </header>

      <main className="container px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">
          {/* Navigation */}
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Button variant="ghost" size="sm" asChild>
              <Link href="/csr/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
              </Link>
            </Button>
          </motion.div>

          {/* Page Header */}
          <motion.div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div>
              <h1 className="text-3xl font-bold text-[#3A4356] dark:text-[#F8FAFC]">Receipts Management</h1>
              <p className="text-[#3A4356] dark:text-[#CBD5E0] mt-1">Manage and track all fuel receipt transactions</p>
            </div>
            <div className="flex items-center gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <HelpCircle className="h-4 w-4 mr-1" />
                    Help
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Receipts Management Help</DialogTitle>
                    <DialogDescription>Learn how to effectively manage receipts in the system.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Search & Filter</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Search by receipt number, tail number, customer, or fueler name</li>
                        <li>• Filter by status, payment method, and date range</li>
                        <li>• Use the filter toggle to show/hide advanced options</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Sorting & Export</h4>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Click column headers to sort data</li>
                        <li>• Export filtered results to CSV format</li>
                        <li>• View detailed receipt information</li>
                      </ul>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button onClick={handleExport} disabled={isExporting} className="gap-2">
                {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export CSV
              </Button>
            </div>
          </motion.div>

          {/* Statistics Cards */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#2A628F]/10 rounded-lg">
                    <Receipt className="h-5 w-5 text-[#2A628F]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#3A4356] dark:text-[#F8FAFC]">{statistics.total}</p>
                    <p className="text-sm text-[#3A4356] dark:text-[#CBD5E0]">Total Receipts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#3A4356] dark:text-[#F8FAFC]">{statistics.paid}</p>
                    <p className="text-sm text-[#3A4356] dark:text-[#CBD5E0]">Paid</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#3A4356] dark:text-[#F8FAFC]">{statistics.pending}</p>
                    <p className="text-sm text-[#3A4356] dark:text-[#CBD5E0]">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <RefreshCw className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#3A4356] dark:text-[#F8FAFC]">{statistics.refunded}</p>
                    <p className="text-sm text-[#3A4356] dark:text-[#CBD5E0]">Refunded</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#3A4356] dark:text-[#F8FAFC]">
                      {formatCurrency(statistics.totalAmount)}
                    </p>
                    <p className="text-sm text-[#3A4356] dark:text-[#CBD5E0]">Total Revenue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-[#2A628F]" />
                    <CardTitle>Search & Filter Receipts</CardTitle>
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="bg-[#2A628F]/10 text-[#2A628F]">
                        {activeFiltersCount} active
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      {showFilters ? "Hide" : "Show"} Filters
                    </Button>
                    {activeFiltersCount > 0 && (
                      <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
                        <X className="h-4 w-4" />
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by receipt number, tail number, customer, or fueler name..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Advanced Filters */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t"
                    >
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <Calendar className="mr-2 h-4 w-4" />
                              {startDate ? format(startDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={startDate}
                              onSelect={setStartDate}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <Calendar className="mr-2 h-4 w-4" />
                              {endDate ? format(endDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All statuses</SelectItem>
                            <SelectItem value="PAID">Paid</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="REFUNDED">Refunded</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Payment Method</Label>
                        <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                          <SelectTrigger>
                            <SelectValue placeholder="All methods" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All methods</SelectItem>
                            <SelectItem value="Corporate Account">Corporate Account</SelectItem>
                            <SelectItem value="Credit Card">Credit Card</SelectItem>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Check">Check</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>

          {/* Results Summary */}
          <motion.div
            className="flex items-center justify-between text-sm text-[#3A4356] dark:text-[#CBD5E0]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <span>
              Showing {paginatedReceipts.length} of {filteredReceipts.length} receipts
              {activeFiltersCount > 0 && ` (filtered from ${receipts.length} total)`}
            </span>
            <span>Total Value: {formatCurrency(statistics.totalAmount)}</span>
          </motion.div>

          {/* Receipts Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 font-semibold"
                            onClick={() => handleSort("receiptNumber")}
                          >
                            Receipt #{getSortIcon("receiptNumber")}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 font-semibold"
                            onClick={() => handleSort("tailNumber")}
                          >
                            Tail Number
                            {getSortIcon("tailNumber")}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 font-semibold"
                            onClick={() => handleSort("customer")}
                          >
                            Customer
                            {getSortIcon("customer")}
                          </Button>
                        </TableHead>
                        <TableHead>Fuel Type</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 font-semibold"
                            onClick={() => handleSort("amount")}
                          >
                            Amount
                            {getSortIcon("amount")}
                          </Button>
                        </TableHead>
                        <TableHead>Payment Method</TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 font-semibold"
                            onClick={() => handleSort("status")}
                          >
                            Status
                            {getSortIcon("status")}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 font-semibold"
                            onClick={() => handleSort("createdAt")}
                          >
                            Date
                            {getSortIcon("createdAt")}
                          </Button>
                        </TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedReceipts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8">
                            <div className="flex flex-col items-center gap-2">
                              <Receipt className="h-8 w-8 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                {activeFiltersCount > 0 ? "No receipts match your filters" : "No receipts found"}
                              </p>
                              {activeFiltersCount > 0 && (
                                <Button variant="outline" size="sm" onClick={clearFilters}>
                                  Clear filters
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedReceipts.map((receipt, index) => (
                          <motion.tr
                            key={receipt.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="hover:bg-muted/50"
                          >
                            <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                            <TableCell>{receipt.tailNumber}</TableCell>
                            <TableCell>{receipt.customer}</TableCell>
                            <TableCell>{receipt.fuelType}</TableCell>
                            <TableCell className="text-right">{receipt.quantity.toLocaleString()} gal</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(receipt.amount)}</TableCell>
                            <TableCell>{receipt.paymentMethod}</TableCell>
                            <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                            <TableCell>{formatDateTime(receipt.createdAt)}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setSelectedReceipt(receipt)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/csr/receipts/${receipt.id}`}>
                                      <FileText className="h-4 w-4 mr-2" />
                                      Edit Receipt
                                    </Link>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </motion.tr>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <motion.div
              className="flex items-center justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Receipt Details Dialog */}
      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
            <DialogDescription>
              {selectedReceipt && `Receipt ${selectedReceipt.receiptNumber} - ${selectedReceipt.customer}`}
            </DialogDescription>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Receipt Number</Label>
                  <p className="font-medium">{selectedReceipt.receiptNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedReceipt.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tail Number</Label>
                  <p className="font-medium">{selectedReceipt.tailNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Customer</Label>
                  <p className="font-medium">{selectedReceipt.customer}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Fuel Type</Label>
                  <p>{selectedReceipt.fuelType}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Quantity</Label>
                  <p>{selectedReceipt.quantity.toLocaleString()} gallons</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Amount</Label>
                  <p className="font-medium text-lg">{formatCurrency(selectedReceipt.amount)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Payment Method</Label>
                  <p>{selectedReceipt.paymentMethod}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Fueler</Label>
                  <p>{selectedReceipt.fuelerName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                  <p>{selectedReceipt.location}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                  <p>{formatDateTime(selectedReceipt.createdAt)}</p>
                </div>
                {selectedReceipt.updatedAt && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Updated</Label>
                    <p>{formatDateTime(selectedReceipt.updatedAt)}</p>
                  </div>
                )}
              </div>

              {selectedReceipt.notes && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                  <p className="mt-1 p-3 bg-muted rounded-md">{selectedReceipt.notes}</p>
                </div>
              )}

              {selectedReceipt.status === "REFUNDED" && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Refund Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-red-700 dark:text-red-300">Refund Amount</Label>
                      <p className="font-medium">{formatCurrency(selectedReceipt.refundAmount || 0)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-red-700 dark:text-red-300">Refunded At</Label>
                      <p>{selectedReceipt.refundedAt ? formatDateTime(selectedReceipt.refundedAt) : "N/A"}</p>
                    </div>
                  </div>
                  {selectedReceipt.refundReason && (
                    <div className="mt-2">
                      <Label className="text-sm font-medium text-red-700 dark:text-red-300">Refund Reason</Label>
                      <p className="mt-1">{selectedReceipt.refundReason}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedReceipt(null)}>
                  Close
                </Button>
                <Button asChild>
                  <Link href={`/csr/receipts/${selectedReceipt.id}`}>Edit Receipt</Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
