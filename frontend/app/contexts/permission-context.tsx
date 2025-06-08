"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { 
  fetchAndStoreUserPermissions, 
  getCurrentUser, 
  logout,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasResourcePermission,
  getPermissionSource,
  refreshUserPermissions,
  type EnhancedUser,
  type EffectivePermission,
  type PermissionSummary
} from "@/app/services/auth-service"

interface PermissionContextType {
  // Legacy compatibility
  userPermissions: string[]
  userRoles: Array<{ id: number; name: string }>
  checkPermission: (permissionId: string) => boolean
  loading: boolean
  
  // Enhanced permission features
  effectivePermissions: Record<string, EffectivePermission>
  permissionSummary: PermissionSummary | null
  user: EnhancedUser | null
  
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
  // Legacy compatibility
  userPermissions: [],
  userRoles: [],
  checkPermission: () => false,
  loading: true,
  
  // Enhanced features
  effectivePermissions: {},
  permissionSummary: null,
  user: null,
  
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
  // Legacy state for backward compatibility
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [userRoles, setUserRoles] = useState<Array<{ id: number; name: string }>>([])
  const [loading, setLoading] = useState(true)
  
  // Enhanced state
  const [effectivePermissions, setEffectivePermissions] = useState<Record<string, EffectivePermission>>({})
  const [permissionSummary, setPermissionSummary] = useState<PermissionSummary | null>(null)
  const [user, setUser] = useState<EnhancedUser | null>(null)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)

  // ADDED: state to track why loading finished
  const [loadingStatus, setLoadingStatus] = useState<string>("Initializing...")

  const loadUserAndPermissions = useCallback(async () => {
    console.log("%c[PermissionProvider] Starting loadUserAndPermissions...", "color: blue; font-weight: bold;")
    setLoading(true)
    setLoadingStatus("Checking for authentication token...")

    // START OF THE FIX
    // We no longer check isAuthenticated() here. We will rely on the API call's outcome.
    // The presence of a token is checked inside the service before the fetch.
    const currentUser = getCurrentUser()
    if (!currentUser || !currentUser.access_token) {
      console.warn("[PermissionProvider] No token found in localStorage. User is not logged in.")
      setUser(null)
      setUserPermissions([])
      setUserRoles([])
      setEffectivePermissions({})
      setPermissionSummary(null)
      setLoadingStatus("User not authenticated.")
      setLoading(false)
      return
    }

    try {
      console.log("%c[PermissionProvider] Attempting to fetch permissions from API...", "color: blue;")
      const response = await fetchAndStoreUserPermissions()
      
      const updatedUser = getCurrentUser()
      console.log("%c[PermissionProvider] Permissions fetched and user updated.", "color: green;", updatedUser)
      setUser(updatedUser)

      // Update state with fresh data
      setUserPermissions(response.permissions || [])
      setEffectivePermissions(response.effective_permissions || {})
      setPermissionSummary(response.summary || null)
      setLastRefresh(new Date().toISOString())
      
      // Set legacy roles for backward compatibility
      if (updatedUser && updatedUser.roles && Array.isArray(updatedUser.roles)) {
        const rolesAsObjects = updatedUser.roles.map((role, index) => ({ 
          id: index + 1, 
          name: role 
        }))
        setUserRoles(rolesAsObjects)
      } else {
        setUserRoles([])
      }

      setLoadingStatus("Permissions loaded successfully.")

    } catch (error: any) {
      console.error("%c[PermissionProvider] FAILED to fetch permissions.", "color: red; font-weight: bold;", error)
      
      // If the API call fails (e.g., 401 Unauthorized), it means the token is invalid.
      // We must log the user out.
      if (error.message.includes("401") || error.message.includes("403")) {
        console.error("[PermissionProvider] Authentication error detected. Logging out.")
        logout() // This will clear localStorage and redirect
        setUser(null)
        setUserPermissions([])
        setUserRoles([])
        setEffectivePermissions({})
        setPermissionSummary(null)
        setLoadingStatus("Authentication failed.")
      } else {
        // For other errors, fall back to cached permissions if available
        if (currentUser.permissions) {
          setUserPermissions(currentUser.permissions)
          setEffectivePermissions(currentUser.effective_permissions || {})
          setPermissionSummary(currentUser.permission_summary || null)
          console.log("[PermissionProvider] Using cached permissions:", currentUser.permissions)
          setLoadingStatus("Using cached permissions.")
        } else {
          setUserPermissions([])
          setEffectivePermissions({})
          setPermissionSummary(null)
          setLoadingStatus("Failed to load permissions.")
        }
      }
    } finally {
      setLoading(false)
      console.log("%c[PermissionProvider] Loading finished.", "color: blue; font-weight: bold;")
    }
    // END OF THE FIX
  }, [])

  useEffect(() => {
    loadUserAndPermissions()
  }, [loadUserAndPermissions])

  // Legacy permission checking for backward compatibility
  const checkPermission = useCallback((permissionId: string): boolean => {
    return userPermissions.includes(permissionId)
  }, [userPermissions])

  // Enhanced permission checking methods
  const hasPermissionMethod = useCallback((permissionName: string): boolean => {
    return hasPermission(permissionName, user)
  }, [user])

  const hasAnyPermissionMethod = useCallback((permissionNames: string[]): boolean => {
    return hasAnyPermission(permissionNames, user)
  }, [user])

  const hasAllPermissionsMethod = useCallback((permissionNames: string[]): boolean => {
    return hasAllPermissions(permissionNames, user)
  }, [user])

  const hasResourcePermissionMethod = useCallback((
    permissionName: string, 
    resourceType?: string, 
    resourceId?: string
  ): boolean => {
    return hasResourcePermission(permissionName, resourceType, resourceId, user)
  }, [user])

  // Permission metadata methods
  const getPermissionSourceMethod = useCallback((permissionName: string): string | null => {
    return getPermissionSource(permissionName, user)
  }, [user])

  const isPermissionFromGroupMethod = useCallback((permissionName: string): boolean => {
    const source = getPermissionSource(permissionName, user)
    return source ? source.startsWith('group:') : false
  }, [user])

  const isPermissionFromRoleMethod = useCallback((permissionName: string): boolean => {
    const source = getPermissionSource(permissionName, user)
    return source ? source.startsWith('role:') : false
  }, [user])

  const isDirectPermissionMethod = useCallback((permissionName: string): boolean => {
    const source = getPermissionSource(permissionName, user)
    return source === 'direct'
  }, [user])

  // Utility methods
  const refreshPermissions = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    try {
      const success = await refreshUserPermissions()
      if (success) {
        await loadUserAndPermissions()
      }
      return success
    } catch (error) {
      console.error("Failed to refresh permissions:", error)
      return false
    } finally {
      setLoading(false)
    }
  }, [loadUserAndPermissions])

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
      `ACCESS_ADMIN_DASHBOARD`
    ]
    
    // If resource ID is provided, also check ownership-based permissions
    if (resourceId) {
      permissionPatterns.unshift(`${action}_own_${resourceType}`)
    }
    
    return hasAnyPermission(permissionPatterns, user)
  }, [user])

  // Authentication check that depends on the provider's own state
  const isAuthenticated = useCallback(() => {
    // This check is now more reliable because it's based on the user state
    // which is only set after a successful API call.
    const result = !loading && !!user && !!user.access_token
    console.log(`[PermissionProvider] isAuthenticated() called. Loading: ${loading}, User: ${user?.email}, Token exists: ${!!user?.access_token}, Result: ${result}`)
    return result
  }, [loading, user])

  const contextValue: PermissionContextType = {
    // Legacy compatibility
    userPermissions,
    userRoles,
    checkPermission,
    loading,
    
    // Enhanced features
    effectivePermissions,
    permissionSummary,
    user,
    
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
