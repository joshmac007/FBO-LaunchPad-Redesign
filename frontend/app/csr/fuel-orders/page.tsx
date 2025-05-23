"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Search, Download, Eye, Edit, Trash2, MoreHorizontal } from "lucide-react"
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
  unitPrice: number
  totalAmount: number
  status: "pending" | "in-progress" | "completed" | "cancelled"
  requestedDate: string
  completedDate?: string
  notes?: string
}

export default function FuelOrdersPage() {
  const [fuelOrders, setFuelOrders] = useState<FuelOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<FuelOrder[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false)

  // New order form state
  const [newOrder, setNewOrder] = useState({
    tailNumber: "",
    aircraftType: "",
    customerName: "",
    customerCompany: "",
    fuelType: "100LL",
    quantity: "",
    unitPrice: "",
    notes: "",
  })

  useEffect(() => {
    // Simulate API call
    const fetchFuelOrders = async () => {
      setIsLoading(true)
      // Mock data
      const mockOrders: FuelOrder[] = [
        {
          id: "1",
          orderNumber: "FO-2024-001",
          aircraft: { tailNumber: "N123AB", type: "Cessna 172" },
          customer: { name: "John Smith", company: "Smith Aviation" },
          fuelType: "100LL",
          quantity: 50,
          unitPrice: 6.5,
          totalAmount: 325.0,
          status: "completed",
          requestedDate: "2024-01-15",
          completedDate: "2024-01-15",
          notes: "Standard refuel",
        },
        {
          id: "2",
          orderNumber: "FO-2024-002",
          aircraft: { tailNumber: "N456CD", type: "Piper Cherokee" },
          customer: { name: "Jane Doe", company: "Doe Flying Club" },
          fuelType: "100LL",
          quantity: 75,
          unitPrice: 6.5,
          totalAmount: 487.5,
          status: "in-progress",
          requestedDate: "2024-01-16",
          notes: "Priority fuel request",
        },
        {
          id: "3",
          orderNumber: "FO-2024-003",
          aircraft: { tailNumber: "N789EF", type: "Beechcraft Bonanza" },
          customer: { name: "Mike Johnson", company: "Johnson Enterprises" },
          fuelType: "Jet A",
          quantity: 200,
          unitPrice: 5.75,
          totalAmount: 1150.0,
          status: "pending",
          requestedDate: "2024-01-17",
        },
      ]

      setFuelOrders(mockOrders)
      setFilteredOrders(mockOrders)
      setIsLoading(false)
    }

    fetchFuelOrders()
  }, [])

  useEffect(() => {
    let filtered = fuelOrders

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.aircraft.tailNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customer.company.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    setFilteredOrders(filtered)
  }, [searchTerm, statusFilter, fuelOrders])

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

  const handleCreateOrder = () => {
    // Create new order logic
    const order: FuelOrder = {
      id: (fuelOrders.length + 1).toString(),
      orderNumber: `FO-2024-${String(fuelOrders.length + 1).padStart(3, "0")}`,
      aircraft: {
        tailNumber: newOrder.tailNumber,
        type: newOrder.aircraftType,
      },
      customer: {
        name: newOrder.customerName,
        company: newOrder.customerCompany,
      },
      fuelType: newOrder.fuelType,
      quantity: Number.parseFloat(newOrder.quantity),
      unitPrice: Number.parseFloat(newOrder.unitPrice),
      totalAmount: Number.parseFloat(newOrder.quantity) * Number.parseFloat(newOrder.unitPrice),
      status: "pending",
      requestedDate: new Date().toISOString().split("T")[0],
      notes: newOrder.notes,
    }

    setFuelOrders([order, ...fuelOrders])
    setIsNewOrderDialogOpen(false)

    // Reset form
    setNewOrder({
      tailNumber: "",
      aircraftType: "",
      customerName: "",
      customerCompany: "",
      fuelType: "100LL",
      quantity: "",
      unitPrice: "",
      notes: "",
    })
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
      "Unit Price",
      "Total",
      "Status",
      "Requested Date",
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
          order.unitPrice,
          order.totalAmount,
          order.status,
          order.requestedDate,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "fuel-orders.csv"
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fuel Orders</h1>
          <p className="text-muted-foreground">Manage and track all fuel orders</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Dialog open={isNewOrderDialogOpen} onOpenChange={setIsNewOrderDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Fuel Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Fuel Order</DialogTitle>
                <DialogDescription>Fill in the details below to create a new fuel order.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tailNumber">Tail Number</Label>
                    <Input
                      id="tailNumber"
                      placeholder="N123AB"
                      value={newOrder.tailNumber}
                      onChange={(e) => setNewOrder({ ...newOrder, tailNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aircraftType">Aircraft Type</Label>
                    <Input
                      id="aircraftType"
                      placeholder="Cessna 172"
                      value={newOrder.aircraftType}
                      onChange={(e) => setNewOrder({ ...newOrder, aircraftType: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input
                      id="customerName"
                      placeholder="John Smith"
                      value={newOrder.customerName}
                      onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerCompany">Company</Label>
                    <Input
                      id="customerCompany"
                      placeholder="Smith Aviation"
                      value={newOrder.customerCompany}
                      onChange={(e) => setNewOrder({ ...newOrder, customerCompany: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fuelType">Fuel Type</Label>
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
                    <Label htmlFor="quantity">Quantity (gallons)</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="50"
                      value={newOrder.quantity}
                      onChange={(e) => setNewOrder({ ...newOrder, quantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitPrice">Unit Price ($)</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      step="0.01"
                      placeholder="6.50"
                      value={newOrder.unitPrice}
                      onChange={(e) => setNewOrder({ ...newOrder, unitPrice: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
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
                  <Button onClick={handleCreateOrder}>Create Order</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Orders</CardTitle>
          <CardDescription>Search and filter fuel orders by various criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by order number, tail number, customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
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
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
          <CardDescription>
            {statusFilter === "all" ? "All fuel orders" : `${statusFilter} fuel orders`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Aircraft</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Fuel Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      No fuel orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
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
                      <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
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
                            <DropdownMenuItem className="text-red-600">
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
    </div>
  )
}
