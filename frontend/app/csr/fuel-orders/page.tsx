"use client"

import { useState, useEffect, useCallback, Suspense, useRef, useMemo } from "react"
import { useSearchParams, useRouter } from 'next/navigation'
import Link from "next/link"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { useSearchDebounce } from "@/hooks/useDebounce"
import { FuelOrderTableRow } from "@/app/components/FuelOrderTableRow"
import { 
  Plus, Search, Download, Eye, Edit, Trash2, MoreHorizontal, 
  Filter, RefreshCw, Clock, Users, TrendingUp, Calendar,
  CheckSquare, Square, Settings, Bell, AlertTriangle, Loader2
} from "lucide-react"
import { 
  getFuelOrders, 
  createFuelOrder, 
  cancelFuelOrder, 
  updateFuelOrderStatus,
  transformToDisplay,
  type FuelOrderDisplay,
  type FuelOrderBackend,
  type FuelOrderCreateRequest,
  type FuelOrderStats,
  type FuelOrderFilters
} from "@/app/services/fuel-order-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import NewFuelOrderDialog from "./components/NewFuelOrderDialog"
import { motion } from "framer-motion"

// Types
/*
interface FuelOrder {
  id: string
  orderNumber: string
  aircraft: {
    tailNumber: string
    type: string
  }
  customer: {
    name: string
    company: string
  }
  fuelType: string
  quantity: number
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "ASSIGNED" | "REVIEWED" | "EN_ROUTE" | "FUELING" | "ACKNOWLEDGED"
  priority: "normal" | "high" | "urgent"
  requestedDate: string
  completedDate?: string
  assignedLst?: string
  assignedTruck?: string
  notes?: string
}
*/

// Map backend status to frontend status
function mapBackendStatus(backendStatus: string): string {
  if (!backendStatus) {
    return 'PENDING';
  }
  const status = backendStatus.toUpperCase().replace(' ', '_');
  
  const statusMap: Record<string, string> = {
    'DISPATCHED': 'PENDING',
    'ACKNOWLEDGED': 'ACKNOWLEDGED',
    'EN_ROUTE': 'EN_ROUTE',
    'FUELING': 'FUELING',
    'COMPLETED': 'COMPLETED',
    'REVIEWED': 'REVIEWED',
    'CANCELLED': 'CANCELLED',
    'PENDING': 'PENDING',
    'ASSIGNED': 'ACKNOWLEDGED',
    'IN_PROGRESS': 'EN_ROUTE',
  };
  
  return statusMap[status] || status;
}

// Map backend priority to user-friendly format
function mapBackendPriority(backendPriority: string): string {
  const priorityMap: Record<string, string> = {
    'NORMAL': 'Normal',
    'HIGH': 'High',
    'URGENT': 'Urgent',
  }
  
  const upperPriority = backendPriority?.toString().toUpperCase()
  return priorityMap[upperPriority] || 'Normal'
}

function EnhancedFuelOrdersPageInternal() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tailNumberParam = searchParams.get('tailNumber')

  // State management
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  
  // UI State
  const [isCreating, setIsCreating] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState(tailNumberParam || "")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [dateRangeFilter, setDateRangeFilter] = useState({
    startDate: "",
    endDate: ""
  })
  const [fuelTypeFilter, setFuelTypeFilter] = useState<string>("all")
  
  // Dialog states
  const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false)
  const [cancelOrderDialog, setCancelOrderDialog] = useState<{
    isOpen: boolean
    order: FuelOrderDisplay | null
  }>({
    isOpen: false,
    order: null
  })
  const [isCanceling, setIsCanceling] = useState(false)

  // New order form state
  // This is now handled by NewFuelOrderDialog
  /*
  const [newOrder, setNewOrder] = useState({
    tailNumber: "",
    fuelType: "100LL",
    quantity: "",
    customerId: "",
    priority: "normal",
    notes: "",
    locationOnRamp: "",
    additiveRequested: false
  })
  */

  useEffect(() => {
    if (tailNumberParam) {
      setSearchTerm(tailNumberParam);
    }
  }, [tailNumberParam]);

  // Use React Query with improved caching (temporarily without WebSocket due to connection issues)
  const {
    data,
    isLoading: queryIsLoading,
    isError: queryIsError,
    error: queryError,
    isFetching,
    refetch,
  } = useQuery<{ orders: FuelOrderDisplay[]; stats: FuelOrderStats }, Error>({
    queryKey: ['fuelOrders', { statusFilter, priorityFilter, fuelTypeFilter, dateRangeFilter }],
    queryFn: async () => {
      const backendOrders = await getFuelOrders({ 
        status: statusFilter.toLowerCase() === "all" ? undefined : statusFilter, 
        priority: priorityFilter.toLowerCase() === "all" ? undefined : priorityFilter, 
        fuel_type: fuelTypeFilter.toLowerCase() === "all" ? undefined : fuelTypeFilter 
      });

      const transformedOrders = await Promise.all(
        backendOrders.orders.map((bo: FuelOrderBackend) => transformToDisplay(bo))
      );
      
      return { orders: transformedOrders, stats: backendOrders.stats };
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - improved from 5 minutes
    refetchInterval: 60000, // Reduced from 30 seconds to 1 minute
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  // For now, assume connected since we're using standard React Query
  const isConnected = true;

  // Debounce search input to prevent excessive re-renders and filtering operations
  const { debouncedSearchTerm, isSearching } = useSearchDebounce(searchTerm, 300);

  const filteredOrders = useMemo(() => {
    let orders = data?.orders || [];
    
    // Server-side filters are handled by useQuery, so we don't need to filter by status/priority/fuelType here.
    // We only need to apply the client-side search term filter with debounced value.

    if (debouncedSearchTerm) {
      orders = orders.filter(order =>
        order.aircraft_tail_number.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        order.customer_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        order.orderNumber.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    return orders;
  }, [data?.orders, debouncedSearchTerm]);

  const handleMarkComplete = (order: FuelOrderDisplay) => {
    handleCompleteOrder(order.id.toString());
  };

  // Event handlers
  /* This is now handled by NewFuelOrderDialog
  const handleCreateOrder = async () => {
    if (!newOrder.tailNumber || !newOrder.quantity || !newOrder.customerId) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsCreating(true)
    try {
      const orderData: FuelOrderCreateRequest = {
        tail_number: newOrder.tailNumber,
        fuel_type: newOrder.fuelType,
        requested_amount: parseFloat(newOrder.quantity),
        customer_id: parseInt(newOrder.customerId),
        priority: newOrder.priority,
        csr_notes: newOrder.notes,
        additive_requested: newOrder.additiveRequested,
        location_on_ramp: newOrder.locationOnRamp,
        assigned_lst_user_id: -1, // Auto-assign
        assigned_truck_id: -1 // Auto-assign
      }

      await createFuelOrder(orderData)
      toast.success("Fuel order created successfully!")
      
      // Refresh data and close dialog
      await refetch()
      setIsNewOrderDialogOpen(false)
      
      // Reset form
      setNewOrder({
        tailNumber: "",
        fuelType: "100LL",
        quantity: "",
        customerId: "",
        priority: "normal",
        notes: "",
        locationOnRamp: "",
        additiveRequested: false
      })
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || "Failed to create order"
      toast.error(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }
  */

  const handleCancelOrder = useCallback(async (order: FuelOrderDisplay) => {
    setCancelOrderDialog({ isOpen: true, order })
  }, [])

  const confirmCancelOrder = async () => {
    if (!cancelOrderDialog.order) return

    setIsCanceling(true)
    try {
      await cancelFuelOrder(parseInt(cancelOrderDialog.order.id))
      refetch()
      toast.success(`Order #${cancelOrderDialog.order.orderNumber} has been cancelled.`)
    } catch (error) {
      toast.error("Failed to cancel order.")
    } finally {
      setIsCanceling(false)
      setCancelOrderDialog({ isOpen: false, order: null })
    }
  }

  const handleBulkCancel = async () => {
    if (selectedOrders.length === 0) return
    
    try {
      await Promise.all(
        selectedOrders.map(orderId => cancelFuelOrder(parseInt(orderId)))
      )
      
      toast.success(`${selectedOrders.length} orders cancelled successfully`)
      setSelectedOrders([])
      
      // Refresh data
      await refetch()
    } catch (error: any) {
      console.error('Failed to bulk cancel orders:', error)
      toast.error('Failed to cancel some orders. Please try again.')
    }
  }

  const toggleOrderSelection = useCallback((orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }, [])

  const toggleAllOrders = useCallback(() => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id.toString()))
    }
  }, [selectedOrders.length, filteredOrders])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Completed</Badge>
      case "EN_ROUTE":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">En Route</Badge>
      case "FUELING":
        return <Badge className="bg-cyan-100 text-cyan-800 hover:bg-cyan-100">Fueling</Badge>
      case "PENDING":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
      case "CANCELLED":
        return <Badge variant="secondary" className="bg-gray-200 text-gray-700">Cancelled</Badge>
      case "REVIEWED":
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Reviewed</Badge>
      case "ACKNOWLEDGED":
        return <Badge variant="secondary" className="bg-indigo-100 text-indigo-800">Assigned</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive" className="text-xs">Urgent</Badge>
      case "high":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">High</Badge>
      case "normal":
        return <Badge variant="outline" className="text-xs">Normal</Badge>
      default:
        return <Badge variant="outline" className="text-xs">{priority}</Badge>
    }
  }

  const exportToCSV = () => {
    const headers = [
      "Order Number",
      "Tail Number",
      "Customer",
      "Fuel Type",
      "Quantity",
      "Priority",
      "Status",
      "Assigned LST",
      "Assigned Truck",
      "Requested Date",
      "Completed Date",
      "Notes"
    ]
    const csvContent = [
      headers.join(","),
      ...filteredOrders.map((order) =>
        [
          order.orderNumber,
          order.aircraft_tail_number,
          order.customer_name,
          order.fuel_type,
          order.quantity,
          order.priority,
          order.status,
          order.assigned_lst_name,
          order.assigned_truck_name,
          order.created_at,
          order.completed_at || "",
          `"${order.notes || ""}"` // Wrap notes in quotes to handle commas
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `fuel-orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'DISPATCHED', label: 'Dispatched' },
    { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
    { value: 'EN_ROUTE', label: 'En Route' },
    { value: 'FUELING', label: 'Fueling' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'REVIEWED', label: 'Reviewed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const handleCompleteOrder = async (orderId: string) => {
    try {
      await updateFuelOrderStatus(parseInt(orderId, 10), { status: 'COMPLETED' });
      toast.success(`Order #${orderId} marked as complete.`);
      refetch();
    } catch (error) {
      toast.error("Failed to mark order as complete.");
    }
  };

  const handleRefresh = useCallback(() => {
    refetch();
    toast.info("Refreshing fuel orders...");
  }, [refetch]);

  const handleViewOrder = useCallback((order: FuelOrderDisplay) => {
    // Navigate to order detail view - implement as needed
    console.log("View order:", order.id);
  }, []);

  if (queryIsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p>Loading fuel orders...</p>
        </div>
      </div>
    )
  }

  if (queryIsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <p className="text-red-600 text-lg font-semibold">Error Loading Orders</p>
          <p className="text-muted-foreground">{queryError?.message}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fuel Orders</h1>
            <p className="text-muted-foreground">Manage and track all fuel orders with advanced tools</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-blue-50 border border-blue-200 text-blue-700">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Auto-refresh (1min)
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isFetching}>
              {isFetching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {data?.stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.counts?.active_count || 0}</div>
                <p className="text-xs text-muted-foreground">Currently in progress</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.counts?.pending_count || 0}</div>
                <p className="text-xs text-muted-foreground">Awaiting assignment</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.counts?.completed_today || 0}</div>
                <p className="text-xs text-muted-foreground">Finished orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.counts?.total_orders || 0}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2">
          <Button onClick={() => setIsNewOrderDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Fuel Order
          </Button>

          {selectedOrders.length > 0 && (
            <Button variant="destructive" onClick={handleBulkCancel}>
              Cancel Selected ({selectedOrders.length})
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="lg:col-span-2">
              <Label htmlFor="search">Search Orders</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Order #, tail number, customer, LST..."
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
              <Label htmlFor="priority">Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter} disabled={isFetching}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fuelType">Fuel Type</Label>
              <Select value={fuelTypeFilter} onValueChange={setFuelTypeFilter} disabled={isFetching}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="100LL">100LL</SelectItem>
                  <SelectItem value="Jet A">Jet A</SelectItem>
                  <SelectItem value="Jet A-1">Jet A-1</SelectItem>
                  <SelectItem value="Mogas">Mogas</SelectItem>
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

      {/* Orders Table */}
      <Card className={cn({ 'opacity-60 transition-opacity': isFetching })}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Orders ({filteredOrders.length})</CardTitle>
              <CardDescription>
                {statusFilter === "all" ? "All fuel orders" : `${statusFilter} fuel orders`}
                {selectedOrders.length > 0 && ` • ${selectedOrders.length} selected`}
              </CardDescription>
            </div>
            {filteredOrders.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllOrders}
                className="flex items-center gap-2"
              >
                {selectedOrders.length === filteredOrders.length ? (
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
                      checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                      onCheckedChange={toggleAllOrders}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Tail #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Fuel Type</TableHead>
                  <TableHead>Quantity (Gal)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Assigned LST</TableHead>
                  <TableHead>Assigned Truck</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <FuelOrderTableRow
                      key={order.id}
                      order={order}
                      isSelected={selectedOrders.includes(order.id.toString())}
                      onToggleSelection={(orderId: string) => {
                        setSelectedOrders(prev => 
                          prev.includes(orderId) 
                            ? prev.filter(id => id !== orderId)
                            : [...prev, orderId]
                        )
                      }}
                      onCancel={() => setCancelOrderDialog({ isOpen: true, order: order })}
                      onView={(order) => router.push(`/csr/fuel-orders/${order.id}`)}
                      onMarkComplete={handleMarkComplete}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={12} className="h-24 text-center">
                      No fuel orders found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Simplified Cancel Order Confirmation Dialog */}
      <Dialog open={cancelOrderDialog.isOpen} onOpenChange={(open) => setCancelOrderDialog({ isOpen: open, order: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to cancel this order?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently cancel order {cancelOrderDialog.order?.orderNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setCancelOrderDialog({ isOpen: false, order: null })}>
              Keep Order
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancelOrder}
              disabled={isCanceling}
            >
              {isCanceling ? "Canceling..." : "Cancel Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function EnhancedFuelOrdersPage() {
  return (
    <Suspense fallback={<div>Loading fuel orders...</div>}>
      <EnhancedFuelOrdersPageInternal />
    </Suspense>
  );
}
