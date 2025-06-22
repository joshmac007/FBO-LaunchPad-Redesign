"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { io, Socket } from "socket.io-client"
import { 
  getFuelOrders, 
  transformToDisplay,
  type FuelOrderDisplay,
  type FuelOrderBackend,
  type FuelOrderStats,
  type FuelOrderFilters
} from "@/app/services/fuel-order-service"
import { getCurrentUser } from "@/app/services/auth-service"

interface FuelOrdersQueryData {
  orders: FuelOrderDisplay[]
  stats: FuelOrderStats
}

/**
 * Enhanced fuel orders hook that combines React Query with WebSocket real-time updates
 * Replaces inefficient polling with instant updates via WebSocket events
 */
export function useFuelOrdersWithWebSocket(filters: FuelOrderFilters = {}) {
  const queryClient = useQueryClient()
  const socketRef = useRef<Socket | null>(null)

  // Main query for fuel orders data
  const query = useQuery<FuelOrdersQueryData, Error>({
    queryKey: ['fuelOrders', filters],
    queryFn: async () => {
      const backendOrders = await getFuelOrders(filters)
      
      // Transform backend data to display format
      const transformedOrders = await Promise.all(
        backendOrders.orders.map((bo: FuelOrderBackend) => transformToDisplay(bo))
      )
      
      return { 
        orders: transformedOrders, 
        stats: backendOrders.stats 
      }
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - data stays fresh longer with real-time updates
    refetchOnWindowFocus: false, // No need with real-time updates
    refetchInterval: false, // Disable polling - WebSocket handles updates
  })

  // WebSocket connection for real-time updates
  useEffect(() => {
    // Get token from localStorage the same way as the working useRealtimeOrders hook
    const userData = localStorage.getItem('fboUser')
    let token = null
    if (userData) {
      try {
        const user = JSON.parse(userData)
        token = user.access_token
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
    if (!token) return

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001'
    const socket = io(socketUrl, {
      query: { token },
      transports: ['polling', 'websocket'], // Start with polling, upgrade to websocket
      upgrade: true,
      rememberUpgrade: false,
      forceNew: false, // Allow connection reuse
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 30000,
      autoConnect: true,
    })

    socketRef.current = socket

    // WebSocket event handlers for real-time updates
    socket.on('connect', () => {
      console.log('🔌 Fuel orders WebSocket connected')
    })

    socket.on('disconnect', (reason) => {
      console.log('🔌 Fuel orders WebSocket disconnected:', reason)
    })

    socket.on('connect_error', (error) => {
      console.error('🔌 Fuel orders WebSocket connection error:', error)
    })

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔌 Fuel orders WebSocket reconnected after', attemptNumber, 'attempts')
    })

    socket.on('reconnect_error', (error) => {
      console.error('🔌 Fuel orders WebSocket reconnection error:', error)
    })

    socket.on('reconnect_failed', () => {
      console.error('🔌 Fuel orders WebSocket reconnection failed')
    })

    // Handle new unclaimed orders
    socket.on('new_unclaimed_order', async (order: any) => {
      console.log('📦 New fuel order received:', order.id)
      
      // Transform the order to display format
      const transformedOrder = await transformToDisplay(order)
      
      // Update the query cache by adding the new order
      queryClient.setQueryData(['fuelOrders', filters], (oldData: FuelOrdersQueryData | undefined) => {
        if (!oldData) return oldData
        
        return {
          ...oldData,
          orders: [transformedOrder, ...oldData.orders],
          stats: {
            ...oldData.stats,
            counts: {
              ...oldData.stats.counts,
              total_orders: oldData.stats.counts.total_orders + 1,
              pending_count: oldData.stats.counts.pending_count + 1,
            }
          }
        }
      })
    })

    // Handle order claims (assignment)
    socket.on('order_claimed', (data: { orderId: number; userId: number }) => {
      console.log('👋 Order claimed:', data.orderId, 'by user:', data.userId)
      
      // Update the specific order in cache
      queryClient.setQueryData(['fuelOrders', filters], (oldData: FuelOrdersQueryData | undefined) => {
        if (!oldData) return oldData
        
        return {
          ...oldData,
          orders: oldData.orders.map(order => 
            order.id === data.orderId 
              ? { ...order, status: 'Assigned' as const }
              : order
          )
        }
      })
    })

    // Handle order status updates
    socket.on('order_update', async (updatedOrder: any) => {
      console.log('🔄 Order updated:', updatedOrder.id, 'status:', updatedOrder.status)
      
      // Transform the updated order
      const transformedOrder = await transformToDisplay(updatedOrder)
      
      // Update the specific order in cache
      queryClient.setQueryData(['fuelOrders', filters], (oldData: FuelOrdersQueryData | undefined) => {
        if (!oldData) return oldData
        
        return {
          ...oldData,
          orders: oldData.orders.map(order => 
            order.id === transformedOrder.id ? transformedOrder : order
          )
        }
      })
    })

    // Handle order completions
    socket.on('order_completed', async (completedOrder: any) => {
      console.log('✅ Order completed:', completedOrder.id)
      
      // Transform the completed order
      const transformedOrder = await transformToDisplay(completedOrder)
      
      // Update the order in cache and stats
      queryClient.setQueryData(['fuelOrders', filters], (oldData: FuelOrdersQueryData | undefined) => {
        if (!oldData) return oldData
        
        return {
          ...oldData,
          orders: oldData.orders.map(order => 
            order.id === transformedOrder.id ? transformedOrder : order
          ),
          stats: {
            ...oldData.stats,
            counts: {
              ...oldData.stats.counts,
              completed_today: oldData.stats.counts.completed_today + 1,
            }
          }
        }
      })
    })

    // Handle detailed order updates (notes, meter readings, etc.)
    socket.on('order_details_updated', async (updatedOrder: any) => {
      console.log('📝 Order details updated:', updatedOrder.id)
      
      const transformedOrder = await transformToDisplay(updatedOrder)
      
      queryClient.setQueryData(['fuelOrders', filters], (oldData: FuelOrdersQueryData | undefined) => {
        if (!oldData) return oldData
        
        return {
          ...oldData,
          orders: oldData.orders.map(order => 
            order.id === transformedOrder.id ? transformedOrder : order
          )
        }
      })
    })

    // Cleanup on unmount
    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [queryClient, filters]) // Include filters in deps to reconnect when filters change

  // Method to manually refresh data (useful for error recovery)
  const refreshData = async () => {
    await query.refetch()
  }

  // Method to invalidate and refetch (force refresh)
  const invalidateAndRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['fuelOrders', filters] })
  }

  return {
    ...query,
    refreshData,
    invalidateAndRefresh,
    isConnected: socketRef.current?.connected || false,
  }
}