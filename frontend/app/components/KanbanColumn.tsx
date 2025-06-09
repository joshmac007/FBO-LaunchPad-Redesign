"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { OrderCard } from "./OrderCard"
import { FuelOrder } from "@/hooks/useRealtimeOrders"
import { RefreshCw, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface KanbanColumnProps {
  title: string
  orders: FuelOrder[]
  onOrderAction: (action: string, orderId: number) => void
  onRefresh?: () => void
  currentUserId?: number
  columnKey: string
  showAddButton?: boolean
  onAdd?: () => void
  className?: string
}

export function KanbanColumn({
  title,
  orders,
  onOrderAction,
  onRefresh,
  currentUserId,
  columnKey,
  showAddButton = false,
  onAdd,
  className,
}: KanbanColumnProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const startY = useRef(0)
  const scrollContainer = useRef<HTMLDivElement>(null)

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return
    
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Pull-to-refresh implementation
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onRefresh || !scrollContainer.current) return
    
    const container = scrollContainer.current
    if (container.scrollTop === 0) {
      startY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || !onRefresh) return
    
    const currentY = e.touches[0].clientY
    const distance = Math.max(0, Math.min(120, currentY - startY.current))
    setPullDistance(distance)
  }

  const handleTouchEnd = () => {
    if (!isPulling || !onRefresh) return
    
    if (pullDistance > 80) {
      handleRefresh()
    }
    
    setIsPulling(false)
    setPullDistance(0)
  }

  const getColumnColor = () => {
    switch (columnKey) {
      case 'available':
        return 'bg-purple-50 border-purple-200'
      case 'myQueue':
        return 'bg-blue-50 border-blue-200'
      case 'inProgress':
        return 'bg-orange-50 border-orange-200'
      case 'completed':
        return 'bg-green-50 border-green-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <Card 
      className={cn("flex flex-col h-full", getColumnColor(), className)}
      data-cy={`kanban-column-${columnKey}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge variant="secondary" className="bg-white/80">
              {orders.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                data-cy={`refresh-column-${columnKey}`}
                className="h-8 w-8 p-0"
              >
                <RefreshCw 
                  className={cn(
                    "h-4 w-4", 
                    isRefreshing && "animate-spin"
                  )} 
                />
              </Button>
            )}
            {showAddButton && onAdd && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAdd}
                data-cy={`add-to-column-${columnKey}`}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Pull-to-refresh indicator */}
        {isPulling && pullDistance > 20 && (
          <div className="text-center py-2">
            <div className={cn(
              "text-sm transition-colors duration-200",
              pullDistance > 80 ? "text-green-600" : "text-gray-500"
            )}>
              {pullDistance > 80 ? "Release to refresh" : "Pull to refresh"}
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 pt-0">
        <div 
          ref={scrollContainer}
          className="space-y-4 max-h-full overflow-y-auto"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: isPulling ? `translateY(${pullDistance * 0.5}px)` : undefined,
            transition: isPulling ? 'none' : 'transform 0.2s ease-out'
          }}
        >
          {orders.length === 0 ? (
            <div 
              className="text-center py-8 text-muted-foreground"
              data-cy={`empty-column-${columnKey}`}
            >
              No orders in this column
            </div>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAction={onOrderAction}
                currentUserId={currentUserId}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
} 