"use client"

import React, { memo } from "react"
import { Eye, Edit, Trash2, MoreHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { TableCell, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { FuelOrderDisplay } from "@/app/services/fuel-order-service"

interface FuelOrderTableRowProps {
  order: FuelOrderDisplay
  isSelected: boolean
  onToggleSelection: (orderId: string) => void
  onView: (order: FuelOrderDisplay) => void
  onCancel: (order: FuelOrderDisplay) => void
  onMarkComplete: (order: FuelOrderDisplay) => void
}

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

/**
 * Memoized fuel order table row component to prevent unnecessary re-renders
 * Only re-renders when order data, selection status, or callback functions change
 */
const FuelOrderTableRow = memo(({
  order,
  isSelected,
  onToggleSelection,
  onView,
  onCancel,
  onMarkComplete,
}: FuelOrderTableRowProps) => {
  return (
    <TableRow key={order.id} className={isSelected ? "bg-muted/50" : ""}>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(order.id.toString())}
          aria-label={`Select order ${order.orderNumber}`}
        />
      </TableCell>
      <TableCell className="font-medium">{order.orderNumber}</TableCell>
      <TableCell>{order.aircraft_tail_number}</TableCell>
      <TableCell>{order.customer_name}</TableCell>
      <TableCell>{order.fuel_type}</TableCell>
      <TableCell>{order.quantity}</TableCell>
      <TableCell>{getStatusBadge(order.status)}</TableCell>
      <TableCell>{getPriorityBadge(order.priority)}</TableCell>
      <TableCell>{order.assigned_lst_name}</TableCell>
      <TableCell>{order.assigned_truck_name}</TableCell>
      <TableCell>
        {new Date(order.created_at).toLocaleDateString()}{" "}
        <span className="text-xs text-muted-foreground">
          {new Date(order.created_at).toLocaleTimeString()}
        </span>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onView(order)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {order.status === "Completed" && (
              <DropdownMenuItem onClick={() => onMarkComplete(order)}>
                <Edit className="mr-2 h-4 w-4" />
                Mark as Complete
              </DropdownMenuItem>
            )}
            {order.status !== "CANCELLED" && order.status !== "COMPLETED" && (
              <DropdownMenuItem 
                onClick={() => onCancel(order)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Cancel Order
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  // Only re-render if the order data, selection status, or key props change
  return (
    prevProps.order.id === nextProps.order.id &&
    prevProps.order.status === nextProps.order.status &&
    prevProps.order.priority === nextProps.order.priority &&
    prevProps.order.assigned_lst_name === nextProps.order.assigned_lst_name &&
    prevProps.order.assigned_truck_name === nextProps.order.assigned_truck_name &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.onToggleSelection === nextProps.onToggleSelection &&
    prevProps.onView === nextProps.onView &&
    prevProps.onCancel === nextProps.onCancel &&
    prevProps.onMarkComplete === nextProps.onMarkComplete
  )
})

FuelOrderTableRow.displayName = "FuelOrderTableRow"

export { FuelOrderTableRow }