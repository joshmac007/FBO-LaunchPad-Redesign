"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { 
  Plus, Search, Download, Eye, Edit, Trash2, MoreHorizontal, 
  Filter, RefreshCw, Clock, Users, TrendingUp, Calendar,
  CheckSquare, Square, Settings, Bell, AlertTriangle
} from "lucide-react"
import { 
  getFuelOrders, 
  createFuelOrder,
  cancelFuelOrder, 
  getFuelOrderStats,
  type FuelOrderDisplay,
  type FuelOrderCreateRequest,
  type FuelOrderStats,
  type FuelOrderFilters
} from "@/app/services/fuel-order-service"
import { getAllAdminCustomers, type Customer } from "@/app/services/customer-service"
import { getAircraftList, type Aircraft } from "@/app/services/aircraft-service"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Types
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
  status: "pending" | "in-progress" | "completed" | "cancelled"
  priority: "normal" | "high" | "urgent"
  requestedDate: string
  completedDate?: string
  assignedLst?: string
  assignedTruck?: string
  notes?: string
}

// Map backend status to frontend status
function mapBackendStatus(backendStatus: string): string {
  const statusMap: Record<string, string> = {
    'PENDING': 'pending',
    'DISPATCHED': 'pending',
    'ACKNOWLEDGED': 'in-progress', 
    'EN_ROUTE': 'in-progress',
    'FUELING': 'in-progress',
    'COMPLETED': 'completed',
    'REVIEWED': 'completed',
    'CANCELLED': 'cancelled',
  }
  
  const upperStatus = backendStatus?.toString().toUpperCase()
  return statusMap[upperStatus] || 'pending'
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

export default function EnhancedFuelOrdersPage() {
  // State management
  const [fuelOrders, setFuelOrders] = useState<FuelOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<FuelOrder[]>([])
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  const [stats, setStats] = useState<FuelOrderStats | null>(null)
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string>("")
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
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
    order: FuelOrder | null
  }>({
    isOpen: false,
    order: null
  })
  const [isCanceling, setIsCanceling] = useState(false)

  // New order form state
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

  // Auto-refresh toggle
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch data functions
  const fetchFuelOrders = useCallback(async () => {
    setIsLoading(true)
    try {
      const filters: FuelOrderFilters = {
        status: statusFilter !== "all" ? statusFilter : undefined,
        start_date: dateRangeFilter.startDate || undefined,
        end_date: dateRangeFilter.endDate || undefined,
      }
      
      const result = await getFuelOrders(Object.keys(filters).filter(key => filters[key as keyof FuelOrderFilters]).length > 0 ? filters : undefined)
      
      // Transform the properly fetched FuelOrderDisplay data to our local FuelOrder interface
      const transformedOrders: FuelOrder[] = result.items.map((order: FuelOrderDisplay) => ({
        id: order.id.toString(),
        orderNumber: `FO-${order.id.toString().padStart(6, '0')}`,
        aircraft: { 
          tailNumber: order.aircraft_tail_number || order.aircraft_registration,
          type: order.aircraft?.type || "Unknown"
        },
        customer: { 
          name: order.customer_name, 
          company: order.customer?.name || ""
        },
        fuelType: order.fuel_type,
        quantity: parseFloat(order.quantity) || 0,
        status: mapBackendStatus(order.status) as "pending" | "in-progress" | "completed" | "cancelled",
        priority: mapBackendPriority(order.priority) as "normal" | "high" | "urgent",
        requestedDate: order.created_at ? new Date(order.created_at).toISOString().split('T')[0] : "",
        completedDate: order.completed_at ? new Date(order.completed_at).toISOString().split('T')[0] : undefined,
        assignedLst: order.assigned_lst_name !== 'N/A' ? order.assigned_lst_name : undefined,
        assignedTruck: order.assigned_truck_name !== 'N/A' ? order.assigned_truck_name : undefined,
        notes: order.csr_notes || order.notes || "",
      }))

      setFuelOrders(transformedOrders)
      setError("")
    } catch (err) {
      console.error('Failed to fetch fuel orders:', err)
      setError("Failed to load fuel orders. Please try again.")
      setFuelOrders([])
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, dateRangeFilter])

  const fetchStats = useCallback(async () => {
    try {
      const statsData = await getFuelOrderStats()
      setStats(statsData)
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [])

  const fetchSupportingData = useCallback(async () => {
    try {
      const [customersData, aircraftData] = await Promise.all([
        getAllAdminCustomers(),
        getAircraftList()
      ])
      setCustomers(customersData)
      setAircraft(aircraftData)
    } catch (err) {
      console.error('Failed to fetch supporting data:', err)
    }
  }, [])

  // Effects
  useEffect(() => {
    fetchFuelOrders()
    fetchStats()
    fetchSupportingData()
  }, [fetchFuelOrders, fetchStats, fetchSupportingData])

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      fetchFuelOrders()
      fetchStats()
    }, 30000) // Refresh every 30 seconds
    
    return () => clearInterval(interval)
  }, [autoRefresh, fetchFuelOrders, fetchStats])



  // Filter effect
  useEffect(() => {
    let filtered = fuelOrders

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.aircraft.tailNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customer.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (order.assignedLst && order.assignedLst.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((order) => order.priority === priorityFilter)
    }

    // Fuel type filter
    if (fuelTypeFilter !== "all") {
      filtered = filtered.filter((order) => order.fuelType === fuelTypeFilter)
    }

    setFilteredOrders(filtered)
  }, [searchTerm, statusFilter, priorityFilter, fuelTypeFilter, fuelOrders])

  // Event handlers
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
      await fetchFuelOrders()
      await fetchStats()
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
    } catch (error: any) {
      console.error('Failed to create order:', error)
      toast.error(error.message || "Failed to create order. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancelOrder = async (order: FuelOrder) => {
    setCancelOrderDialog({ isOpen: true, order })
  }

  const confirmCancelOrder = async () => {
    if (!cancelOrderDialog.order) return

    setIsCanceling(true)
    try {
      await cancelFuelOrder(parseInt(cancelOrderDialog.order.id))
      
      toast.success("Order cancelled successfully")
      
      // Refresh data
      await fetchFuelOrders()
      await fetchStats()
      
      setCancelOrderDialog({ isOpen: false, order: null })
    } catch (error: any) {
      console.error('Failed to cancel order:', error)
      toast.error(error.message || 'Failed to cancel order. Please try again.')
    } finally {
      setIsCanceling(false)
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
      await fetchFuelOrders()
      await fetchStats()
    } catch (error: any) {
      console.error('Failed to bulk cancel orders:', error)
      toast.error('Failed to cancel some orders. Please try again.')
    }
  }

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  const toggleAllOrders = () => {
    setSelectedOrders(
      selectedOrders.length === filteredOrders.length 
        ? [] 
        : filteredOrders.map(order => order.id)
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>
      case "in-progress":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
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
      "Aircraft Type",
      "Customer",
      "Company",
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
          order.aircraft.tailNumber,
          order.aircraft.type,
          order.customer.name,
          order.customer.company,
          order.fuelType,
          order.quantity,
          order.priority,
          order.status,
          order.assignedLst || "",
          order.assignedTruck || "",
          order.requestedDate,
          order.completedDate || "",
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p>Loading fuel orders...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <p className="text-red-600 text-lg font-semibold">Error Loading Orders</p>
          <p className="text-muted-foreground">{error}</p>
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
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-green-50 border-green-200" : ""}
            >
              <Bell className={`h-4 w-4 mr-2 ${autoRefresh ? "text-green-600" : ""}`} />
              Auto-refresh {autoRefresh ? "ON" : "OFF"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { fetchFuelOrders(); fetchStats(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.counts?.active_count || 0}</div>
                <p className="text-xs text-muted-foreground">Currently in progress</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.counts?.pending_count || 0}</div>
                <p className="text-xs text-muted-foreground">Awaiting assignment</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.counts?.completed_today || 0}</div>
                <p className="text-xs text-muted-foreground">Finished orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.counts?.total_orders || 0}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2">
          <Dialog open={isNewOrderDialogOpen} onOpenChange={setIsNewOrderDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Fuel Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Fuel Order</DialogTitle>
                <DialogDescription>Fill in the details below to create a new fuel order.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tailNumber">Tail Number *</Label>
                    <Input
                      id="tailNumber"
                      placeholder="N123AB"
                      value={newOrder.tailNumber}
                      onChange={(e) => setNewOrder({ ...newOrder, tailNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer">Customer *</Label>
                    <Select
                      value={newOrder.customerId}
                      onValueChange={(value) => setNewOrder({ ...newOrder, customerId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fuelType">Fuel Type *</Label>
                    <Select
                      value={newOrder.fuelType}
                      onValueChange={(value) => setNewOrder({ ...newOrder, fuelType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100LL">100LL</SelectItem>
                        <SelectItem value="Jet A">Jet A</SelectItem>
                        <SelectItem value="Jet A-1">Jet A-1</SelectItem>
                        <SelectItem value="Mogas">Mogas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity (gallons) *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="50"
                      value={newOrder.quantity}
                      onChange={(e) => setNewOrder({ ...newOrder, quantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newOrder.priority}
                      onValueChange={(value) => setNewOrder({ ...newOrder, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locationOnRamp">Location on Ramp</Label>
                  <Input
                    id="locationOnRamp"
                    placeholder="Gate A1, Hangar 3, etc."
                    value={newOrder.locationOnRamp}
                    onChange={(e) => setNewOrder({ ...newOrder, locationOnRamp: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="additiveRequested"
                    checked={newOrder.additiveRequested}
                    onCheckedChange={(checked) => setNewOrder({ ...newOrder, additiveRequested: !!checked })}
                  />
                  <Label htmlFor="additiveRequested">Additive Requested</Label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special instructions or notes..."
                    value={newOrder.notes}
                    onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsNewOrderDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateOrder} disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create Order"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

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
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fuelType">Fuel Type</Label>
              <Select value={fuelTypeFilter} onValueChange={setFuelTypeFilter}>
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
      <Card>
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
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                      onCheckedChange={toggleAllOrders}
                    />
                  </TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Aircraft</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Fuel</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>LST</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No fuel orders found</p>
                        <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow 
                      key={order.id}
                      className={selectedOrders.includes(order.id) ? "bg-muted/50" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={() => toggleOrderSelection(order.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.aircraft.tailNumber}</div>
                          <div className="text-sm text-muted-foreground">{order.aircraft.type}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.customer.name}</div>
                          <div className="text-sm text-muted-foreground">{order.customer.company}</div>
                        </div>
                      </TableCell>
                      <TableCell>{order.fuelType}</TableCell>
                      <TableCell>{order.quantity} gal</TableCell>
                      <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {order.assignedLst || <span className="text-muted-foreground">Unassigned</span>}
                        </div>
                      </TableCell>
                      <TableCell>{order.requestedDate}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/csr/fuel-orders/${order.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Order
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleCancelOrder(order)}
                              disabled={order.status === 'cancelled' || order.status === 'completed'}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Cancel Order
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Order Confirmation Dialog */}
      <AlertDialog open={cancelOrderDialog.isOpen} onOpenChange={(open) => setCancelOrderDialog({ isOpen: open, order: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Fuel Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel order {cancelOrderDialog.order?.orderNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancelOrder}
              className="bg-red-600 hover:bg-red-700"
              disabled={isCanceling}
            >
              {isCanceling ? "Canceling..." : "Cancel Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
