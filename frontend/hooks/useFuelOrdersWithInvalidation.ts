"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { io, Socket } from "socket.io-client"
import { 
  getFuelOrders, 
  transformToDisplay,
  type FuelOrderDisplay,
  type FuelOrderBackend,
  type FuelOrderStats,
  type FuelOrderFilters
} from "@/app/services/fuel-order-service"

interface FuelOrdersQueryData {
  orders: FuelOrderDisplay[]
  stats: FuelOrderStats
}

/**
 * Hook that combines React Query with WebSocket invalidation for fuel orders
 * Uses the existing WebSocket infrastructure for real-time updates
 */
export function useFuelOrdersWithInvalidation(filters: FuelOrderFilters = {}) {
  const queryClient = useQueryClient()

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

  // Set up WebSocket listeners for query invalidation
  useEffect(() => {
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

    // Use a separate socket specifically for this query invalidation
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001'
    const socket = io(`${socketUrl}/fuel-orders`, {
      query: { token },
      transports: ['polling', 'websocket'],
      forceNew: true, // Create a new connection for this specific use case
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 20000,
    })

    // Set up invalidation listeners
    socket.on('connect', () => {
      console.log('📊 Fuel orders query invalidation socket connected')
    })

    socket.on('fuel_order_updated', () => {
      console.log('📊 Invalidating fuel orders query due to update')
      queryClient.invalidateQueries({ queryKey: ['fuelOrders'] })
    })

    socket.on('fuel_order_created', () => {
      console.log('📊 Invalidating fuel orders query due to new order')
      queryClient.invalidateQueries({ queryKey: ['fuelOrders'] })
    })

    socket.on('fuel_order_status_changed', () => {
      console.log('📊 Invalidating fuel orders query due to status change')
      queryClient.invalidateQueries({ queryKey: ['fuelOrders'] })
    })

    socket.on('connect_error', (error) => {
      console.error('📊 Fuel orders invalidation socket error:', error)
    })

    return () => {
      socket.disconnect()
    }
  }, [queryClient])

  // Method to manually refresh data
  const refreshData = async () => {
    await query.refetch()
  }

  // Method to invalidate and refetch
  const invalidateAndRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['fuelOrders', filters] })
  }

  return {
    ...query,
    refreshData,
    invalidateAndRefresh,
    isConnected: true, // For now, assume connected if query is working
  }
}