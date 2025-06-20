"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/app/contexts/permission-context"
import { getCurrentUser } from "@/app/services/auth-service"
import { useRealtimeOrders, FuelOrder } from "@/hooks/useRealtimeOrders"
import { ConnectionStatusBanner } from "@/app/components/ConnectionStatusBanner"
import { KanbanColumn } from "@/app/components/KanbanColumn"
import { CompleteOrderDialog } from "@/app/components/CompleteOrderDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

export default function FuelerDashboard() {
  const router = useRouter()
  const { user, loading: permissionsLoading, isAuthenticated } = usePermissions()
  const [completionDialogOrder, setCompletionDialogOrder] = useState<FuelOrder | null>(null)
  const [isHighContrastMode, setIsHighContrastMode] = useState(false)

  // Get current user ID for the hook
  const currentUser = getCurrentUser()
  const userId = currentUser?.id

  // Initialize the real-time orders hook
  const ordersHook = useRealtimeOrders(userId || 0)

  // Check authentication and redirect if necessary
  useEffect(() => {
    if (!permissionsLoading && !isAuthenticated()) {
      router.push("/login")
      return
    }

    // Check if user has fueler role
    if (!permissionsLoading && user) {
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
  }, [permissionsLoading, isAuthenticated, user, router, currentUser])

  // Handle order actions
  const handleOrderAction = async (action: string, orderId: number) => {
    const order = findOrderById(orderId)
    if (!order) return

    switch (action) {
      case 'claim':
        ordersHook.actions.claimOrder(orderId)
        break
      case 'acknowledge_change':
        ordersHook.actions.acknowledgeChange(orderId, order.change_version)
        break
      case 'en_route':
        ordersHook.actions.updateOrderStatus(orderId, 'En Route')
        break
      case 'start_fueling':
        ordersHook.actions.updateOrderStatus(orderId, 'Fueling')
        break
      case 'complete':
        setCompletionDialogOrder(order)
        break

      case 'retry':
        // Clear error and retry the failed action
        ordersHook.actions.clearOrderError(orderId)
        break
      default:
        console.warn(`Unknown action: ${action}`)
    }
  }

  const handleCompleteOrder = async (data: {
    orderId: number
    startMeterReading: number
    endMeterReading: number
    notes?: string
  }) => {
    ordersHook.actions.completeOrder(data.orderId, {
      start_meter_reading: data.startMeterReading,
      end_meter_reading: data.endMeterReading,
      fuel_delivered: data.endMeterReading - data.startMeterReading,
      lst_notes: data.notes,
    })
    setCompletionDialogOrder(null)
  }

  const handleRefreshAvailable = () => {
    ordersHook.actions.refreshData()
  }

  const findOrderById = (orderId: number): FuelOrder | undefined => {
    return [
      ...ordersHook.availableOrders,
      ...ordersHook.myQueue,
      ...ordersHook.inProgress,
      ...ordersHook.completedToday,
    ].find(order => order.id === orderId)
  }

  const toggleHighContrastMode = () => {
    setIsHighContrastMode(!isHighContrastMode)
    // Apply high contrast styles
    document.documentElement.classList.toggle('high-contrast', !isHighContrastMode)
  }

  // Show loading while permissions are being fetched
  if (permissionsLoading || ordersHook.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, don't render the dashboard
  if (!isAuthenticated() || !userId) {
    return null
  }

  return (
    <div className={cn("flex flex-col gap-6 pb-6", isHighContrastMode && "high-contrast")}>
      {/* Connection Status Banner */}
      <ConnectionStatusBanner
        connectionStatus={ordersHook.connectionStatus}
        queuedActionsCount={ordersHook.actionQueue.length}
        className={ordersHook.connectionStatus !== 'CONNECTED' || ordersHook.actionQueue.length > 0 ? 'mt-0' : 'hidden'}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fueler Dashboard</h1>
          <p className="text-muted-foreground">Real-time fuel order management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleHighContrastMode}
            data-cy="toggle-high-contrast"
          >
            {isHighContrastMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            {isHighContrastMode ? 'Normal' : 'High Contrast'}
          </Button>
          <Badge variant="secondary">
            Welcome, {user?.name || "Fueler"}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {ordersHook.availableOrders.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">My Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {ordersHook.myQueue.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {ordersHook.inProgress.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {ordersHook.completedToday.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px]">
        <KanbanColumn
          title="Available Orders"
          orders={ordersHook.availableOrders}
          onOrderAction={handleOrderAction}
          onRefresh={handleRefreshAvailable}
          currentUserId={userId}
          columnKey="available"
        />

        <KanbanColumn
          title="My Queue"
          orders={ordersHook.myQueue}
          onOrderAction={handleOrderAction}
          currentUserId={userId}
          columnKey="myQueue"
        />

        <KanbanColumn
          title="In Progress"
          orders={ordersHook.inProgress}
          onOrderAction={handleOrderAction}
          currentUserId={userId}
          columnKey="inProgress"
        />

        <KanbanColumn
          title="Completed Today"
          orders={ordersHook.completedToday}
          onOrderAction={handleOrderAction}
          currentUserId={userId}
          columnKey="completed"
        />
      </div>

      {/* Complete Order Dialog */}
      <CompleteOrderDialog
        order={completionDialogOrder}
        isOpen={!!completionDialogOrder}
        onClose={() => setCompletionDialogOrder(null)}
        onComplete={handleCompleteOrder}
      />

      {/* High Contrast Styles */}
      <style jsx global>{`
        .high-contrast {
          --background: 0 0% 0%;
          --foreground: 0 0% 100%;
          --muted: 0 0% 20%;
          --muted-foreground: 0 0% 80%;
          --popover: 0 0% 5%;
          --popover-foreground: 0 0% 100%;
          --card: 0 0% 5%;
          --card-foreground: 0 0% 100%;
          --border: 0 0% 30%;
          --input: 0 0% 10%;
          --primary: 0 0% 100%;
          --primary-foreground: 0 0% 0%;
          --secondary: 0 0% 15%;
          --secondary-foreground: 0 0% 100%;
          --accent: 0 0% 15%;
          --accent-foreground: 0 0% 100%;
          --destructive: 0 84% 60%;
          --destructive-foreground: 0 0% 100%;
          --ring: 0 0% 70%;
        }
      `}</style>
    </div>
  )
}
