"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { 
  fetchAndStoreUserPermissions, 
  getCurrentUser, 
  isAuthenticated,
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

  const loadPermissions = useCallback(async () => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        setLoading(false)
        return
      }

      if (isAuthenticated()) {
        const currentUser = getCurrentUser()
        if (currentUser) {
          setUser(currentUser)
          
          // Set legacy roles for backward compatibility
          if (currentUser.roles) {
            setUserRoles(currentUser.roles)
          } else {
            setUserRoles([])
          }

          // If permissions are already loaded and recent, use them
          const permissionsAge = currentUser.permissions_loaded_at 
            ? Date.now() - new Date(currentUser.permissions_loaded_at).getTime()
            : Infinity
          
          // Refresh if permissions are older than 5 minutes or not loaded
          if (permissionsAge > 5 * 60 * 1000 || !currentUser.permissions) {
            try {
              const permissionData = await fetchAndStoreUserPermissions()
              
              // Update state with fresh data
              setUserPermissions(permissionData.permissions || [])
              setEffectivePermissions(permissionData.effective_permissions || {})
              setPermissionSummary(permissionData.summary || null)
              setLastRefresh(new Date().toISOString())
              
              // Update user state with fresh data
              const updatedUser = getCurrentUser()
              if (updatedUser) {
                setUser(updatedUser)
              }
            } catch (error) {
              console.error("Failed to fetch fresh permissions:", error)
              
              // Fall back to cached permissions if available
              if (currentUser.permissions) {
                setUserPermissions(currentUser.permissions)
                setEffectivePermissions(currentUser.effective_permissions || {})
                setPermissionSummary(currentUser.permission_summary || null)
              } else {
                setUserPermissions([])
                setEffectivePermissions({})
                setPermissionSummary(null)
              }
            }
          } else {
            // Use cached permissions
            setUserPermissions(currentUser.permissions || [])
            setEffectivePermissions(currentUser.effective_permissions || {})
            setPermissionSummary(currentUser.permission_summary || null)
            setLastRefresh(currentUser.permissions_loaded_at || null)
          }
        } else {
          // User data not found
          setUser(null)
          setUserPermissions([])
          setUserRoles([])
          setEffectivePermissions({})
          setPermissionSummary(null)
        }
      } else {
        // Not authenticated
        setUser(null)
        setUserPermissions([])
        setUserRoles([])
        setEffectivePermissions({})
        setPermissionSummary(null)
      }
    } catch (error) {
      console.error("Error loading permissions and roles:", error)
      setUser(null)
      setUserPermissions([])
      setUserRoles([])
      setEffectivePermissions({})
      setPermissionSummary(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

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
        await loadPermissions()
      }
      return success
    } catch (error) {
      console.error("Failed to refresh permissions:", error)
      return false
    } finally {
      setLoading(false)
    }
  }, [loadPermissions])

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
  }

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  )
}
