"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock, Fuel, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { FuelOrder } from "@/hooks/useRealtimeOrders"

interface OrderCardProps {
  order: FuelOrder
  onAction: (action: string, orderId: number) => void
  currentUserId?: number
  className?: string
}

export function OrderCard({ order, onAction, currentUserId, className }: OrderCardProps) {
  const isMyOrder = order.assigned_to_id === currentUserId
  
  // Check if order has pending CSR changes that need acknowledgment
  const hasPendingChanges = Boolean(order.change_version && 
    typeof order.change_version === 'number' && 
    order.change_version > 0 &&
    (!order.acknowledged_change_version || order.change_version > order.acknowledged_change_version))
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Dispatched":
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-200">
            Available
          </Badge>
        )
      case "Acknowledged":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
            Acknowledged
          </Badge>
        )
      case "En Route":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
            En Route
          </Badge>
        )
      case "Fueling":
        return (
          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200">
            Fueling
          </Badge>
        )
      case "Completed":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
            Completed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            High Priority
          </Badge>
        )
      case "LOW":
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-200">
            Low Priority
          </Badge>
        )
      default:
        return null
    }
  }

  const getActionButton = () => {
    if (order.isSyncFailed) {
      return (
        <Button 
          size="sm" 
          variant="destructive"
          onClick={() => onAction('retry', order.id)}
          data-cy={`retry-action-button-${order.id}`}
        >
          <AlertTriangle className="h-4 w-4 mr-1" />
          Retry
        </Button>
      )
    }

    // If order has pending CSR changes, show acknowledge button
    if (hasPendingChanges && isMyOrder) {
      return (
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onAction('acknowledge_change', order.id)}
          disabled={order.isQueued}
          data-cy={`acknowledge-changes-button-${order.id}`}
          className="border-orange-300 text-orange-700 hover:bg-orange-50"
        >
          {order.isQueued ? 'Acknowledging...' : 'Acknowledge Changes'}
        </Button>
      )
    }

    switch (order.status) {
      case "Dispatched":
        return (
          <Button 
            size="sm"
            onClick={() => onAction('claim', order.id)}
            disabled={order.isQueued}
            data-cy={`claim-order-button-${order.id}`}
          >
            {order.isQueued ? 'Claiming...' : 'Acknowledge'}
          </Button>
        )
      case "Acknowledged":
        return isMyOrder ? (
          <Button 
            size="sm"
            onClick={() => onAction('en_route', order.id)}
            disabled={order.isQueued || hasPendingChanges}
            data-cy={`en-route-button-${order.id}`}
          >
            {order.isQueued ? 'Updating...' : 'En Route'}
          </Button>
        ) : null
      case "En Route":
        return isMyOrder ? (
          <Button 
            size="sm"
            onClick={() => onAction('start_fueling', order.id)}
            disabled={order.isQueued || hasPendingChanges}
            data-cy={`start-fueling-button-${order.id}`}
          >
            {order.isQueued ? 'Updating...' : 'Start Fueling'}
          </Button>
        ) : null
      case "Fueling":
        return isMyOrder ? (
          <Button 
            size="sm"
            onClick={() => onAction('complete', order.id)}
            disabled={order.isQueued || hasPendingChanges}
            data-cy={`complete-order-button-${order.id}`}
          >
            {order.isQueued ? 'Completing...' : 'Complete'}
          </Button>
        ) : null
      case "Completed":
        return null // No action button for completed orders per PRD
      default:
        return null
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'No date available'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Invalid date'
      }
      return date.toLocaleString()
    } catch (error) {
      return 'Invalid date'
    }
  }

  const calculateGallonsDispensed = () => {
    // First try calculated_gallons_dispensed (backend calculated field)
    if (order.calculated_gallons_dispensed) {
      return parseFloat(order.calculated_gallons_dispensed).toFixed(2)
    }
    // Then try gallons_dispensed field
    if (order.gallons_dispensed) {
      return parseFloat(order.gallons_dispensed.toString()).toFixed(2)
    }
    // Then try to calculate from meter readings
    if (order.start_meter_reading && order.end_meter_reading) {
      return (parseFloat(order.end_meter_reading.toString()) - parseFloat(order.start_meter_reading.toString())).toFixed(2)
    }
    // For completed orders without any dispensed data, show requested amount as fallback
    if (order.status === 'Completed') {
      return order.gallons_requested?.toFixed(2) || null
    }
    return null
  }

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-200",
        order.isSyncFailed && "border-red-300 bg-red-50",
        order.isQueued && "border-yellow-300 bg-yellow-50",
        className
      )}
      data-cy={`order-card-${order.id}`}
    >
      <CardHeader className="pb-2 bg-muted/50">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Fuel className="h-5 w-5" />
              {order.aircraft_registration || order.tail_number}
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {order.customer_name}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1 items-end">
            {getStatusBadge(order.status)}
            {getPriorityBadge(order.priority)}
            {order.isQueued && (
              <Badge 
                variant="secondary" 
                className="bg-yellow-100 text-yellow-800"
                data-cy={`queued-badge-${order.id}`}
              >
                <Clock className="h-3 w-3 mr-1" />
                Queued
              </Badge>
            )}
            {order.isSyncFailed && (
              <Badge 
                variant="destructive"
                data-cy={`sync-failed-badge-${order.id}`}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                Sync Failed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Fuel Type</div>
              <div className="text-sm">{order.fuel_type}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Requested</div>
              <div className="text-sm font-medium">{order.gallons_requested} gallons</div>
            </div>
            {order.status === "Completed" && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-muted-foreground">Dispensed</div>
                <div className="text-sm font-medium text-green-600">
                  {calculateGallonsDispensed()} gallons
                </div>
              </div>
            )}
          </div>
          
          {order.notes && (
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Notes</div>
              <div className="text-sm">{order.notes}</div>
            </div>
          )}
          
          {order.isSyncFailed && order.errorMessage && (
            <div className="bg-red-100 border border-red-300 rounded p-2">
              <div className="text-sm text-red-700">
                <strong>Error:</strong> {order.errorMessage}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="border-t bg-muted/30 flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          {order.status === "Completed" 
            ? `Completed: ${formatDate(order.completion_timestamp || order.completed_at || order.updated_at)}`
            : `Created: ${formatDate(order.created_at)}`
          }
        </div>
        {getActionButton()}
      </CardFooter>
    </Card>
  )
} 