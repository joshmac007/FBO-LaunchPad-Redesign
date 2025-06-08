"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Droplet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { usePermissions } from "@/app/contexts/permission-context"
import { getCurrentUser } from "@/app/services/auth-service"

// Local storage key for fuel orders
const FUEL_ORDERS_STORAGE_KEY = "fboFuelOrders"

export default function PendingOrdersPage() {
  const router = useRouter()
  const { user, loading: permissionsLoading, isAuthenticated } = usePermissions()
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
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

  // Load pending orders data
  useEffect(() => {
    if (!permissionsLoading && isAuthenticated() && user && !dataLoaded) {
      // Load fuel orders from localStorage
      const storedOrders = localStorage.getItem(FUEL_ORDERS_STORAGE_KEY)
      if (storedOrders) {
        const allOrders = JSON.parse(storedOrders)
        setPendingOrders(allOrders.filter((order: any) => order.status === "PENDING"))
      }
      setDataLoaded(true)
    }
  }, [permissionsLoading, isAuthenticated, user, dataLoaded])

  const startFueling = (orderId: number) => {
    // Update order status to IN_PROGRESS
    const storedOrders = localStorage.getItem(FUEL_ORDERS_STORAGE_KEY)
    if (storedOrders) {
      const allOrders = JSON.parse(storedOrders)
      const updatedOrders = allOrders.map((o: any) => (o.id === orderId ? { ...o, status: "IN_PROGRESS" } : o))
      localStorage.setItem(FUEL_ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders))

      // Update local state
      setPendingOrders(updatedOrders.filter((order: any) => order.status === "PENDING"))
    }
  }

  // Show loading while permissions are being fetched or user is being authenticated
  if (permissionsLoading || !dataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p>Loading pending orders...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, don't render (useEffect will handle redirect)
  if (!isAuthenticated()) {
    return null
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pending Fuel Orders</h1>
        <div className="flex items-center gap-2">
          <Droplet className="h-5 w-5 text-yellow-500" />
          <span className="font-medium">{pendingOrders.length} pending orders</span>
        </div>
      </div>

      {pendingOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Droplet className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No Pending Orders</h3>
            <p className="text-muted-foreground text-center max-w-md">
              There are currently no pending fuel orders. Check back later or view orders in progress.
            </p>
            <Button asChild className="mt-6">
              <Link href="/fueler/dashboard">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pendingOrders
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="pb-2 bg-muted/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">Tail Number: {order.tailNumber}</CardTitle>
                      <CardDescription>{order.aircraftType}</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
                      Pending
                    </Badge>
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
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/30 flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    Created: {new Date(order.createdAt).toLocaleString()}
                  </div>
                  <Button size="sm" onClick={() => startFueling(order.id)}>
                    Start Fueling
                  </Button>
                </CardFooter>
              </Card>
            ))}
        </div>
      )}
    </div>
  )
}
