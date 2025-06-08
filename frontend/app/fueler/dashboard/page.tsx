"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Droplet, CheckCircle, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { usePermissions } from "@/app/contexts/permission-context"
import { getCurrentUser } from "@/app/services/auth-service"

// Mock fuel orders for demo
const MOCK_FUEL_ORDERS = [
  {
    id: 101,
    tailNumber: "N12345",
    aircraftType: "Boeing 737",
    customer: "Example Airlines",
    fuelType: "Jet A",
    requestedQuantity: "1000",
    status: "PENDING",
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    notes: "Priority fueling needed",
    gate: "A12",
  },
  {
    id: 102,
    tailNumber: "N54321",
    aircraftType: "Airbus A320",
    customer: "Test Airways",
    fuelType: "Jet A",
    requestedQuantity: "1500",
    status: "PENDING",
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    notes: "Standard fueling",
    gate: "B5",
  },
  {
    id: 103,
    tailNumber: "N98765",
    aircraftType: "Cessna 172",
    customer: "Private Owner",
    fuelType: "Avgas",
    requestedQuantity: "50",
    status: "IN_PROGRESS",
    createdAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    notes: "Pilot will be present",
    gate: "GA Terminal",
  },
  {
    id: 104,
    tailNumber: "N11111",
    aircraftType: "Gulfstream G650",
    customer: "Executive Jets",
    fuelType: "Jet A",
    requestedQuantity: "2000",
    status: "COMPLETED",
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    completedAt: new Date(Date.now() - 82800000).toISOString(), // 23 hours ago
    actualQuantity: "2100",
    notes: "Full tank requested",
    gate: "Private Terminal",
    fuelerId: 1,
    fuelerName: "John Smith",
  },
  {
    id: 105,
    tailNumber: "N22222",
    aircraftType: "Bombardier Global 7500",
    customer: "Luxury Air",
    fuelType: "Jet A",
    requestedQuantity: "2500",
    status: "COMPLETED",
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    completedAt: new Date(Date.now() - 169200000).toISOString(), // 47 hours ago
    actualQuantity: "2450",
    notes: "Top off tanks",
    gate: "Private Terminal",
    fuelerId: 1,
    fuelerName: "John Smith",
  },
]

// Local storage key for fuel orders
const FUEL_ORDERS_STORAGE_KEY = "fboFuelOrders"

export default function FuelerDashboard() {
  const router = useRouter()
  const { user, loading: permissionsLoading, isAuthenticated } = usePermissions()
  const [fuelOrders, setFuelOrders] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState("pending")
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isCompletingOrder, setIsCompletingOrder] = useState(false)
  const [actualQuantity, setActualQuantity] = useState("")
  const [completionNotes, setCompletionNotes] = useState("")
  const [error, setError] = useState("")
  const [dataLoaded, setDataLoaded] = useState(false)

  // Check authentication and redirect if necessary
  useEffect(() => {
    if (!permissionsLoading && !isAuthenticated()) {
      router.push("/login")
      return
    }

    // Check if user has fueler role (using correct role names from backend)
    if (!permissionsLoading && user) {
      const currentUser = getCurrentUser()
      const hasRequiredRole = currentUser?.roles?.includes('Line Service Technician')
      
      if (!hasRequiredRole) {
        // Redirect to appropriate dashboard based on their role
        if (currentUser?.roles?.includes('System Administrator')) {
          router.push("/admin/dashboard")
        } else if (currentUser?.roles?.includes('Customer Service Representative')) {
          router.push("/csr/dashboard")
        } else {
          router.push("/member/dashboard")
        }
        return
      }
    }
  }, [permissionsLoading, isAuthenticated, user, router])

  // Load fuel orders data
  useEffect(() => {
    if (!permissionsLoading && isAuthenticated() && user && !dataLoaded) {
      // Load fuel orders from localStorage or use mock data
      const storedOrders = localStorage.getItem(FUEL_ORDERS_STORAGE_KEY)
      if (storedOrders) {
        setFuelOrders(JSON.parse(storedOrders))
      } else {
        // Initialize with mock data
        setFuelOrders(MOCK_FUEL_ORDERS)
        localStorage.setItem(FUEL_ORDERS_STORAGE_KEY, JSON.stringify(MOCK_FUEL_ORDERS))
      }
      setDataLoaded(true)
    }
  }, [permissionsLoading, isAuthenticated, user, dataLoaded])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  const startFueling = (order: any) => {
    // Update order status to IN_PROGRESS
    const updatedOrders = fuelOrders.map((o) => (o.id === order.id ? { ...o, status: "IN_PROGRESS" } : o))
    setFuelOrders(updatedOrders)
    localStorage.setItem(FUEL_ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders))
  }

  const openCompletionDialog = (order: any) => {
    setSelectedOrder(order)
    setActualQuantity(order.requestedQuantity)
    setCompletionNotes("")
    setError("")
    setIsCompletingOrder(true)
  }

  const completeFueling = () => {
    if (!actualQuantity || Number.parseFloat(actualQuantity) <= 0) {
      setError("Please enter a valid fuel quantity")
      return
    }

    // Update order status to COMPLETED
    const now = new Date().toISOString()
    const updatedOrders = fuelOrders.map((o) =>
      o.id === selectedOrder.id
        ? {
            ...o,
            status: "COMPLETED",
            completedAt: now,
            actualQuantity,
            completionNotes,
            fuelerId: user?.id || 1,
            fuelerName: user?.name || "Fueler",
          }
        : o,
    )

    setFuelOrders(updatedOrders)
    localStorage.setItem(FUEL_ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders))
    setIsCompletingOrder(false)
    setSelectedOrder(null)
  }

  const getFilteredOrders = () => {
    switch (activeTab) {
      case "pending":
        return fuelOrders.filter((o) => o.status === "PENDING")
      case "in_progress":
        return fuelOrders.filter((o) => o.status === "IN_PROGRESS")
      case "completed":
        return fuelOrders.filter((o) => o.status === "COMPLETED")
      default:
        return fuelOrders
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
            Pending
          </Badge>
        )
      case "IN_PROGRESS":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
            In Progress
          </Badge>
        )
      case "COMPLETED":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
            Completed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Show loading while permissions are being fetched or user is being authenticated
  if (permissionsLoading || !dataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, don't render the dashboard (useEffect will handle redirect)
  if (!isAuthenticated()) {
    return null
  }

  const filteredOrders = getFilteredOrders()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Fueler Dashboard</h1>
        <div className="text-sm text-muted-foreground">Welcome, {user?.name || "Fueler"}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pending Tasks</CardTitle>
            <CardDescription>Aircraft waiting for fueling</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplet className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{fuelOrders.filter((o) => o.status === "PENDING").length}</div>
                  <div className="text-xs text-muted-foreground">Pending fueling</div>
                </div>
              </div>
              <Button size="sm" onClick={() => setActiveTab("pending")}>
                View All
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">In Progress</CardTitle>
            <CardDescription>Currently fueling</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplet className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {fuelOrders.filter((o) => o.status === "IN_PROGRESS").length}
                  </div>
                  <div className="text-xs text-muted-foreground">In progress</div>
                </div>
              </div>
              <Button size="sm" onClick={() => setActiveTab("in_progress")}>
                View All
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Completed Today</CardTitle>
            <CardDescription>Today's completed fueling</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">
                    {
                      fuelOrders.filter(
                        (o) =>
                          o.status === "COMPLETED" &&
                          new Date(o.completedAt).toDateString() === new Date().toDateString(),
                      ).length
                    }
                  </div>
                  <div className="text-xs text-muted-foreground">Completed today</div>
                </div>
              </div>
              <Button size="sm" onClick={() => setActiveTab("completed")}>
                View All
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Fuel Orders</CardTitle>
              <CardDescription>Manage aircraft fueling tasks</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No fuel orders found</div>
              ) : (
                <div className="flex flex-col space-y-4">
                  {filteredOrders
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                    .map((order) => (
                      <Card key={order.id} className="overflow-hidden">
                        <CardHeader className="pb-2 bg-muted/50">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">Fuel Tail Number: {order.tailNumber}</CardTitle>
                              <CardDescription>{order.aircraftType}</CardDescription>
                            </div>
                            {getStatusBadge(order.status)}
                            {new Date(order.createdAt).getTime() < Date.now() - 3600000 && (
                              <Badge variant="outline" className="ml-2 bg-red-500/10 text-red-600 border-red-200">
                                Priority
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="text-sm font-medium">Customer:</div>
                              <div className="text-sm">{order.customer}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="text-sm font-medium">Fuel Type:</div>
                              <div className="text-sm">{order.fuelType}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="text-sm font-medium">Requested Quantity:</div>
                              <div className="text-sm">{order.requestedQuantity} gallons</div>
                            </div>
                            {order.status === "COMPLETED" && (
                              <div className="grid grid-cols-2 gap-2">
                                <div className="text-sm font-medium">Actual Quantity:</div>
                                <div className="text-sm">{order.actualQuantity} gallons</div>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="text-sm font-medium">Location:</div>
                              <div className="text-sm">{order.gate}</div>
                            </div>
                            {order.notes && (
                              <div className="grid grid-cols-2 gap-2">
                                <div className="text-sm font-medium">Notes:</div>
                                <div className="text-sm">{order.notes}</div>
                              </div>
                            )}
                            {order.status === "COMPLETED" && order.completionNotes && (
                              <div className="grid grid-cols-2 gap-2">
                                <div className="text-sm font-medium">Completion Notes:</div>
                                <div className="text-sm">{order.completionNotes}</div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter className="border-t bg-muted/30 flex justify-between">
                          <div className="text-sm text-muted-foreground">
                            {order.status === "COMPLETED"
                              ? `Completed: ${new Date(order.completedAt).toLocaleString()}`
                              : `Created: ${new Date(order.createdAt).toLocaleString()}`}
                          </div>
                          <div>
                            {order.status === "PENDING" && (
                              <Button size="sm" onClick={() => startFueling(order)}>
                                Start Fueling
                              </Button>
                            )}
                            {order.status === "IN_PROGRESS" && (
                              <Button size="sm" onClick={() => openCompletionDialog(order)}>
                                Complete Fueling
                              </Button>
                            )}
                            {order.status === "COMPLETED" && (
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/fueler/receipts/${order.id}`}>
                                  <FileText className="h-4 w-4 mr-1" /> View Receipt
                                </Link>
                              </Button>
                            )}
                          </div>
                        </CardFooter>
                      </Card>
                    ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Complete Fueling Dialog */}
      <Dialog open={isCompletingOrder} onOpenChange={setIsCompletingOrder}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Complete Fueling</DialogTitle>
            <DialogDescription>Enter the actual amount of fuel dispensed and any notes.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="aircraft" className="text-right">
                Aircraft
              </Label>
              <div className="col-span-3">
                <p className="text-sm font-medium">{selectedOrder?.tailNumber}</p>
                <p className="text-xs text-muted-foreground">{selectedOrder?.aircraftType}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="requested" className="text-right">
                Requested
              </Label>
              <div className="col-span-3">
                <p className="text-sm">{selectedOrder?.requestedQuantity} gallons</p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="actual-quantity" className="text-right">
                Actual Quantity
              </Label>
              <div className="col-span-3 flex items-center">
                <Input
                  id="actual-quantity"
                  type="number"
                  step="0.1"
                  min="0"
                  value={actualQuantity}
                  onChange={(e) => setActualQuantity(e.target.value)}
                  className="flex-1"
                />
                <span className="ml-2">gallons</span>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Any notes about the fueling operation"
                className="col-span-3"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompletingOrder(false)}>
              Cancel
            </Button>
            <Button onClick={completeFueling}>Complete Fueling</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
