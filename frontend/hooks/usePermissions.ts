import { usePermissions as usePermissionContext } from "@/app/contexts/permission-context"
import { useMemo, useCallback } from "react"

/**
 * Enhanced permission hook that provides utility functions for common permission patterns
 */
export const usePermissions = () => {
  const context = usePermissionContext()
  
  // Memoized permission checker functions for performance
  const can = useCallback((permission: string) => {
    return context.hasPermission(permission)
  }, [context])

  const canAny = useCallback((permissions: string[]) => {
    return context.hasAnyPermission(permissions)
  }, [context])

  const canAll = useCallback((permissions: string[]) => {
    return context.hasAllPermissions(permissions)
  }, [context])

  const canAccess = useCallback((permission: string, resourceType?: string, resourceId?: string) => {
    return context.hasResourcePermission(permission, resourceType, resourceId)
  }, [context])

  const canPerform = useCallback((action: string, resourceType: string, resourceId?: string) => {
    return context.canPerformAction(action, resourceType, resourceId)
  }, [context])

  // Common role-based checks - Updated to use backend permissions
  const isAdmin = useMemo(() => {
    return canAny(['ACCESS_ADMIN_DASHBOARD', 'MANAGE_SETTINGS', 'MANAGE_USERS', 'MANAGE_ROLES'])
  }, [canAny])

  const isCSR = useMemo(() => {
    return canAny(['ACCESS_CSR_DASHBOARD', 'VIEW_ALL_ORDERS', 'CREATE_ORDER', 'REVIEW_ORDERS'])
  }, [canAny])

  const isFueler = useMemo(() => {
    return canAny(['ACCESS_FUELER_DASHBOARD', 'PERFORM_FUELING_TASK', 'UPDATE_OWN_ORDER_STATUS', 'VIEW_ASSIGNED_ORDERS'])
  }, [canAny])

  const isMember = useMemo(() => {
    return canAny(['ACCESS_MEMBER_DASHBOARD']) || (context.user?.is_active ?? false)
  }, [canAny, context.user])

  // Permission metadata
  const getSource = useCallback((permission: string) => {
    return context.getPermissionSource(permission)
  }, [context])

  const isFromGroup = useCallback((permission: string) => {
    return context.isPermissionFromGroup(permission)
  }, [context])

  const isFromRole = useCallback((permission: string) => {
    return context.isPermissionFromRole(permission)
  }, [context])

  const isDirect = useCallback((permission: string) => {
    return context.isDirectPermission(permission)
  }, [context])

  // Utility functions
  const getAccessibleResources = useCallback((permission: string, resourceType: string) => {
    return context.getAccessibleResources(permission, resourceType)
  }, [context])

  const refresh = useCallback(async () => {
    return await context.refreshPermissions()
  }, [context])

  // Permission summary helpers
  const permissionCount = useMemo(() => {
    return context.userPermissions.length
  }, [context.userPermissions])

  const directPermissionCount = useMemo(() => {
    return context.permissionSummary?.by_source.direct.length ?? 0
  }, [context.permissionSummary])

  const groupPermissionCount = useMemo(() => {
    return context.permissionSummary?.by_source.groups.length ?? 0
  }, [context.permissionSummary])

  const rolePermissionCount = useMemo(() => {
    return context.permissionSummary?.by_source.roles.length ?? 0
  }, [context.permissionSummary])

  return {
    // Core context
    ...context,
    
    // Simplified permission checking
    can,
    canAny,
    canAll,
    canAccess,
    canPerform,
    
    // Role-based checks
    isAdmin,
    isCSR,
    isFueler,
    isMember,
    
    // Permission metadata
    getSource,
    isFromGroup,
    isFromRole,
    isDirect,
    
    // Utilities
    getAccessibleResources,
    refresh,
    
    // Summary statistics
    permissionCount,
    directPermissionCount,
    groupPermissionCount,
    rolePermissionCount,
  }
}

/**
 * Hook for checking a specific permission with automatic re-evaluation
 */
export const usePermission = (permission: string) => {
  const { can, loading } = usePermissions()
  
  return useMemo(() => ({
    hasPermission: can(permission),
    loading
  }), [can, permission, loading])
}

/**
 * Hook for checking multiple permissions
 */
export const useMultiplePermissions = (permissions: string[]) => {
  const { canAny, canAll, loading, userPermissions } = usePermissions()
  
  return useMemo(() => {
    const hasAny = canAny(permissions)
    const hasAll = canAll(permissions)
    const missing = permissions.filter(p => !userPermissions.includes(p))
    const granted = permissions.filter(p => userPermissions.includes(p))
    
    return {
      hasAny,
      hasAll,
      missing,
      granted,
      loading
    }
  }, [canAny, canAll, permissions, userPermissions, loading])
}

/**
 * Hook for resource-specific permission checking
 */
export const useResourcePermission = (
  permission: string, 
  resourceType: string, 
  resourceId?: string
) => {
  const { canAccess, loading } = usePermissions()
  
  return useMemo(() => ({
    hasPermission: canAccess(permission, resourceType, resourceId),
    loading
  }), [canAccess, permission, resourceType, resourceId, loading])
}

/**
 * Hook for action-based permission checking
 */
export const useActionPermission = (
  action: string, 
  resourceType: string, 
  resourceId?: string
) => {
  const { canPerform, loading } = usePermissions()
  
  return useMemo(() => ({
    canPerform: canPerform(action, resourceType, resourceId),
    loading
  }), [canPerform, action, resourceType, resourceId, loading])
}

export default usePermissions 