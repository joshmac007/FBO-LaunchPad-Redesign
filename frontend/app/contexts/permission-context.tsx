"use client"

import React, { createContext, useContext, useCallback } from "react"
import { 
  logout,
  type EnhancedUser,
  type EffectivePermission,
  type PermissionSummary
} from "@/app/services/auth-service"
import { usePermissionsQuery, usePermissionsStatus } from "@/hooks/usePermissionsQuery"
import { useQueryClient } from "@tanstack/react-query"

interface PermissionContextType {
  // Core state (now powered by React Query)
  user: EnhancedUser | null
  userPermissions: string[]
  
  // Legacy compatibility
  userRoles: Array<{ id: number; name: string }>
  checkPermission: (permissionId: string) => boolean
  loading: boolean
  
  // Enhanced permission features
  effectivePermissions: Record<string, EffectivePermission>
  permissionSummary: PermissionSummary | null
  
  // Enhanced permission checking methods
  hasPermission: (permissionName: string) => boolean
  hasAnyPermission: (permissionNames: string[]) => boolean
  hasAllPermissions: (permissionNames: string[]) => boolean
  hasResourcePermission: (permissionName: string, resourceType?: string, resourceId?: string) => boolean
  
  // Permission metadata
  getPermissionSource: (permissionName: string) => string | null
  isPermissionFromGroup: (permissionName: string) => boolean
  isPermissionFromRole: (permissionName: string) => boolean
  isDirectPermission: (permissionName: string) => boolean
  
  // Utility methods (now React Query powered)
  refreshPermissions: () => Promise<void>
  getAccessibleResources: (permissionName: string, resourceType: string) => string[]
  canPerformAction: (action: string, resourceType: string, resourceId?: string) => boolean
  
  // Authentication method
  isAuthenticated: () => boolean
  
  // React Query state
  isLoading: boolean
  isError: boolean
  error: Error | null
}

const PermissionContext = createContext<PermissionContextType>({
  // Core state
  user: null,
  userPermissions: [],
  
  // Legacy compatibility
  userRoles: [],
  checkPermission: () => false,
  loading: true,
  
  // Enhanced features
  effectivePermissions: {},
  permissionSummary: null,
  
  // Enhanced methods
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  hasResourcePermission: () => false,
  
  // Metadata methods
  getPermissionSource: () => null,
  isPermissionFromGroup: () => false,
  isPermissionFromRole: () => false,
  isDirectPermission: () => false,
  
  // Utility methods
  refreshPermissions: async () => {},
  getAccessibleResources: () => [],
  canPerformAction: () => false,
  
  // Authentication
  isAuthenticated: () => false,
  
  // React Query state
  isLoading: true,
  isError: false,
  error: null,
})

export const usePermissions = () => useContext(PermissionContext)

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient()
  
  // Use React Query hooks for permissions data
  const { data: permissionsData, isLoading, isError, error } = usePermissionsQuery()
  const { isAuthenticated: authStatus, user } = usePermissionsStatus()

  // Handle authentication errors by triggering logout
  React.useEffect(() => {
    if (isError && error?.message.includes('401') || error?.message.includes('403')) {
      logout()
      // Clear all queries on logout
      queryClient.clear()
    }
  }, [isError, error, queryClient])

  // Extract data from React Query response
  const userPermissions = permissionsData?.permissions || []
  const effectivePermissions = permissionsData?.effective_permissions || {}
  const permissionSummary = permissionsData?.summary || null

  // Legacy roles compatibility
  const userRoles = React.useMemo(() => {
    if (user?.roles && Array.isArray(user.roles)) {
      return user.roles.map((role, index) => ({ 
        id: index + 1, 
        name: role 
      }))
    }
    return []
  }, [user?.roles])

  // Permission checking methods (now using React Query data)
  const checkPermission = useCallback((permissionId: string): boolean => {
    return userPermissions.includes(permissionId)
  }, [userPermissions])

  const hasPermissionMethod = useCallback((permissionName: string): boolean => {
    return userPermissions.includes(permissionName)
  }, [userPermissions])

  const hasAnyPermissionMethod = useCallback((permissionNames: string[]): boolean => {
    return permissionNames.some(permission => userPermissions.includes(permission))
  }, [userPermissions])

  const hasAllPermissionsMethod = useCallback((permissionNames: string[]): boolean => {
    return permissionNames.every(permission => userPermissions.includes(permission))
  }, [userPermissions])

  const hasResourcePermissionMethod = useCallback((
    permissionName: string, 
    resourceType?: string, 
    resourceId?: string
  ): boolean => {
    // Check global permission first
    if (userPermissions.includes(permissionName)) {
      return true
    }
    
    // Check resource-specific permission if provided
    if (resourceType && resourceId) {
      const resourceKey = `${permissionName}:${resourceType}:${resourceId}`
      return effectivePermissions.hasOwnProperty(resourceKey)
    }
    
    return false
  }, [userPermissions, effectivePermissions])

  // Permission metadata methods
  const getPermissionSourceMethod = useCallback((permissionName: string): string | null => {
    const effectivePermission = effectivePermissions[permissionName]
    return effectivePermission?.source || null
  }, [effectivePermissions])

  const isPermissionFromGroupMethod = useCallback((permissionName: string): boolean => {
    const source = getPermissionSourceMethod(permissionName)
    return source ? source.startsWith('group:') : false
  }, [getPermissionSourceMethod])

  const isPermissionFromRoleMethod = useCallback((permissionName: string): boolean => {
    const source = getPermissionSourceMethod(permissionName)
    return source ? source.startsWith('role:') : false
  }, [getPermissionSourceMethod])

  const isDirectPermissionMethod = useCallback((permissionName: string): boolean => {
    const source = getPermissionSourceMethod(permissionName)
    return source === 'direct'
  }, [getPermissionSourceMethod])

  // Utility methods (now React Query powered)
  const refreshPermissions = useCallback(async (): Promise<void> => {
    // Invalidate and refetch permissions query
    await queryClient.invalidateQueries({ queryKey: ['user', 'permissions'] })
  }, [queryClient])

  const getAccessibleResources = useCallback((permissionName: string, resourceType: string): string[] => {
    if (!effectivePermissions) return []
    
    const accessibleResources: string[] = []
    
    // Check for global permission (allows access to all resources)
    if (userPermissions.includes(permissionName)) {
      return ['*'] // Wildcard indicates access to all resources
    }
    
    // Look for resource-specific permissions
    Object.keys(effectivePermissions).forEach(key => {
      if (key.startsWith(`${permissionName}:${resourceType}:`)) {
        const resourceId = key.split(':')[2]
        if (resourceId && resourceId !== 'any') {
          accessibleResources.push(resourceId)
        }
      }
    })
    
    return accessibleResources
  }, [effectivePermissions, userPermissions])

  const canPerformAction = useCallback((
    action: string, 
    resourceType: string, 
    resourceId?: string
  ): boolean => {
    // Common permission patterns
    const permissionPatterns = [
      `${action}_${resourceType}`,
      `${action}_any_${resourceType}`,
      `manage_${resourceType}`,
      `access_admin_dashboard`
    ]
    
    // If resource ID is provided, also check ownership-based permissions
    if (resourceId) {
      permissionPatterns.unshift(`${action}_own_${resourceType}`)
    }
    
    return hasAnyPermissionMethod(permissionPatterns)
  }, [hasAnyPermissionMethod])

  // Authentication check (using React Query status)
  const isAuthenticated = useCallback((): boolean => {
    return authStatus && !isError
  }, [authStatus, isError])

  const contextValue: PermissionContextType = {
    // Core state (powered by React Query)
    user,
    userPermissions,
    
    // Legacy compatibility
    userRoles,
    checkPermission,
    loading: isLoading, // React Query loading state
    
    // Enhanced features
    effectivePermissions,
    permissionSummary,
    
    // Enhanced methods
    hasPermission: hasPermissionMethod,
    hasAnyPermission: hasAnyPermissionMethod,
    hasAllPermissions: hasAllPermissionsMethod,
    hasResourcePermission: hasResourcePermissionMethod,
    
    // Metadata methods
    getPermissionSource: getPermissionSourceMethod,
    isPermissionFromGroup: isPermissionFromGroupMethod,
    isPermissionFromRole: isPermissionFromRoleMethod,
    isDirectPermission: isDirectPermissionMethod,
    
    // Utility methods (React Query powered)
    refreshPermissions,
    getAccessibleResources,
    canPerformAction,
    
    // Authentication
    isAuthenticated,
    
    // React Query state
    isLoading,
    isError,
    error,
  }

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  )
}
