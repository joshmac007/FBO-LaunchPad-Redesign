"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { 
  logout,
  getCurrentUser,
  type EnhancedUser,
  type EffectivePermission,
  type PermissionSummary
} from "@/app/services/auth-service"
import { API_BASE_URL, getAuthHeaders, handleApiResponse } from "@/app/services/api-config"

// State machine for permission loading
type PermissionState = 'IDLE' | 'LOADING_SESSION' | 'AUTHENTICATED' | 'UNAUTHENTICATED'

interface PermissionContextType {
  // Core state
  state: PermissionState
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
  
  // Utility methods
  refreshPermissions: () => Promise<boolean>
  getAccessibleResources: (permissionName: string, resourceType: string) => string[]
  canPerformAction: (action: string, resourceType: string, resourceId?: string) => boolean
  
  // Authentication method
  isAuthenticated: () => boolean
}

const PermissionContext = createContext<PermissionContextType>({
  // Core state
  state: 'IDLE',
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
  refreshPermissions: async () => false,
  getAccessibleResources: () => [],
  canPerformAction: () => false,
  
  // Authentication
  isAuthenticated: () => false,
})

export const usePermissions = () => useContext(PermissionContext)

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State machine
  const [state, setState] = useState<PermissionState>('IDLE')
  const [user, setUser] = useState<EnhancedUser | null>(null)
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  
  // Legacy state for backward compatibility
  const [userRoles, setUserRoles] = useState<Array<{ id: number; name: string }>>([])
  
  // Enhanced state
  const [effectivePermissions, setEffectivePermissions] = useState<Record<string, EffectivePermission>>({})
  const [permissionSummary, setPermissionSummary] = useState<PermissionSummary | null>(null)

  // Simple permission fetching - single API call as source of truth
  const loadUserPermissions = useCallback(async () => {
    setState('LOADING_SESSION')

    // Check if user has token
    const currentUser = getCurrentUser()
    if (!currentUser || !currentUser.access_token) {
      setState('UNAUTHENTICATED')
      return
    }

    try {
      // Single API call - source of truth
      const response = await fetch(`${API_BASE_URL}/auth/me/permissions`, {
        method: "GET",
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logout()
          setState('UNAUTHENTICATED')
          return
        }
        throw new Error(`API call failed: ${response.status}`)
      }

             const data = await handleApiResponse(response) as any // API returns {message: string, permissions: string[]}

       // Update state with API response
       setUser(currentUser)
       setUserPermissions(data.permissions || [])
       setEffectivePermissions(data.effective_permissions || {})
       setPermissionSummary(data.summary || null)
      
      // Set legacy roles for backward compatibility
      if (currentUser.roles && Array.isArray(currentUser.roles)) {
        const rolesAsObjects = currentUser.roles.map((role, index) => ({ 
          id: index + 1, 
          name: role 
        }))
        setUserRoles(rolesAsObjects)
      } else {
        setUserRoles([])
      }

      setState('AUTHENTICATED')

    } catch (error: any) {
      if (error.message.includes("401") || error.message.includes("403")) {
        logout()
        setState('UNAUTHENTICATED')
      } else {
        // For other errors, transition to unauthenticated state
        setState('UNAUTHENTICATED')
      }
    }
  }, [])

  useEffect(() => {
    loadUserPermissions()
  }, [loadUserPermissions])

  // Permission checking methods
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

  // Utility methods
  const refreshPermissions = useCallback(async (): Promise<boolean> => {
    try {
      await loadUserPermissions()
      return state === 'AUTHENTICATED'
    } catch (error) {
      return false
    }
  }, [loadUserPermissions, state])

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

  // Authentication check
  const isAuthenticated = useCallback((): boolean => {
    const result = state === 'AUTHENTICATED'
    return result
  }, [state])

  // Legacy loading compatibility
  const loading = state === 'IDLE' || state === 'LOADING_SESSION'

  const contextValue: PermissionContextType = {
    // Core state
    state,
    user,
    userPermissions,
    
    // Legacy compatibility
    userRoles,
    checkPermission,
    loading,
    
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
    
    // Utility methods
    refreshPermissions,
    getAccessibleResources,
    canPerformAction,
    
    // Authentication
    isAuthenticated,
  }

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  )
}
