"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { usePermissions } from "@/app/contexts/permission-context"
import { getCurrentUser } from "@/app/services/auth-service"

// Local storage key for fuel orders
const FUEL_ORDERS_STORAGE_KEY = "fboFuelOrders"

export default function CompletedOrdersPage() {
  const router = useRouter()
  const { user, loading: permissionsLoading, isAuthenticated } = usePermissions()
  const [completedOrders, setCompletedOrders] = useState<any[]>([])
  const [timeFilter, setTimeFilter] = useState<"today" | "week" | "all">("all")
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

  // Load completed orders data
  useEffect(() => {
    if (!permissionsLoading && isAuthenticated() && user && !dataLoaded) {
      // Load fuel orders from localStorage
      const storedOrders = localStorage.getItem(FUEL_ORDERS_STORAGE_KEY)
      if (storedOrders) {
        const allOrders = JSON.parse(storedOrders)
        setCompletedOrders(allOrders.filter((order: any) => order.status === "COMPLETED"))
      }
      setDataLoaded(true)
    }
  }, [permissionsLoading, isAuthenticated, user, dataLoaded])

  const getFilteredOrders = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    switch (timeFilter) {
      case "today":
        return completedOrders.filter((order) => new Date(order.completedAt) >= today)
      case "week":
        return completedOrders.filter((order) => new Date(order.completedAt) >= weekAgo)
      case "all":
      default:
        return completedOrders
    }
  }

  const filteredOrders = getFilteredOrders()

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p>Loading completed orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Completed Fuel Orders</h1>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="font-medium">{filteredOrders.length} completed orders</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant={timeFilter === "today" ? "default" : "outline"}
          size="sm"
          onClick={() => setTimeFilter("today")}
        >
          Today
        </Button>
        <Button variant={timeFilter === "week" ? "default" : "outline"} size="sm" onClick={() => setTimeFilter("week")}>
          This Week
        </Button>
        <Button variant={timeFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setTimeFilter("all")}>
          All Time
        </Button>
      </div>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No Completed Orders</h3>
            <p className="text-muted-foreground text-center max-w-md">
              There are no completed fuel orders for the selected time period.
            </p>
            <div className="flex gap-4 mt-6">
              <Button asChild variant="outline">
                <Link href="/fueler/dashboard">Return to Dashboard</Link>
              </Button>
              <Button asChild>
                <Link href="/fueler/pending-orders">View Pending Orders</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrders
            .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
            .map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="pb-2 bg-muted/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">Tail Number: {order.tailNumber}</CardTitle>
                      <CardDescription>{order.aircraftType}</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                      Completed
                    </Badge>
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
                      <div className="text-sm font-medium">Actual Quantity:</div>
                      <div className="text-sm">{order.actualQuantity} gallons</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm font-medium">Location:</div>
                      <div className="text-sm">{order.gate}</div>
                    </div>
                    {order.completionNotes && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium">Completion Notes:</div>
                        <div className="text-sm">{order.completionNotes}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/30 flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    Completed: {new Date(order.completedAt).toLocaleString()}
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/fueler/receipts/${order.id}`}>
                      <FileText className="h-4 w-4 mr-1" /> View Receipt
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
        </div>
      )}
    </div>
  )
}
