"use client"

import { useQuery } from "@tanstack/react-query"
import { API_BASE_URL, getAuthHeaders, handleApiResponse } from "@/app/services/api-config"
import { getCurrentUser, type EffectivePermission, type PermissionSummary } from "@/app/services/auth-service"

interface PermissionsQueryResponse {
  permissions: string[]
  effective_permissions: Record<string, EffectivePermission>
  summary: PermissionSummary | null
  message: string
}

/**
 * Custom hook for fetching user permissions using React Query
 * Centralizes server state management for permissions
 */
export const usePermissionsQuery = () => {
  const currentUser = getCurrentUser()
  
  return useQuery({
    queryKey: ['user', 'permissions', currentUser?.id],
    queryFn: async (): Promise<PermissionsQueryResponse> => {
      const response = await fetch(`${API_BASE_URL}/auth/me/permissions`, {
        method: "GET",
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Let the error bubble up to trigger logout in the context
          throw new Error(`Authentication failed: ${response.status}`)
        }
        throw new Error(`API call failed: ${response.status}`)
      }

      return handleApiResponse<PermissionsQueryResponse>(response)
    },
    enabled: !!(currentUser && currentUser.access_token), // Only run if user is logged in
    staleTime: 15 * 60 * 1000, // 15 minutes - permissions don't change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error.message.includes('401') || error.message.includes('403')) {
        return false
      }
      return failureCount < 2
    },
    refetchOnWindowFocus: false, // Permissions don't need refetch on focus
    refetchOnMount: true, // Always refetch on mount for security
  })
}

/**
 * Helper hook for permission status checks
 * Returns loading/error states and user info
 */
export const usePermissionsStatus = () => {
  const currentUser = getCurrentUser()
  const { data, isLoading, error, isError } = usePermissionsQuery()
  
  return {
    isAuthenticated: !!(currentUser && currentUser.access_token),
    isLoading,
    isError,
    error,
    hasData: !!data,
    user: currentUser,
  }
}