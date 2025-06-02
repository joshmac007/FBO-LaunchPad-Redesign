"use client"

import type React from "react"

import { usePermissions } from "../contexts/permission-context"

interface PermissionAwareProps {
  children: React.ReactNode
  // Legacy support
  requiredPermission?: string
  // Enhanced permission options
  requiredPermissions?: string[] // Requires ALL permissions
  anyOfPermissions?: string[] // Requires ANY of these permissions
  // Resource-specific permissions
  resourcePermission?: {
    permission: string
    resourceType: string
    resourceId?: string
  }
  // Action-based permission checking
  action?: {
    action: string
    resourceType: string
    resourceId?: string
  }
  // Advanced permission patterns
  adminOnly?: boolean
  fallback?: React.ReactNode
  showPermissionInfo?: boolean // Debug: show permission info
}

const PermissionAware: React.FC<PermissionAwareProps> = ({ 
  children, 
  requiredPermission,
  requiredPermissions,
  anyOfPermissions,
  resourcePermission,
  action,
  adminOnly = false,
  fallback = null,
  showPermissionInfo = false
}) => {
  const { 
    checkPermission, 
    hasPermission,
    hasAnyPermission, 
    hasAllPermissions,
    hasResourcePermission,
    canPerformAction,
    loading,
    user
  } = usePermissions()

  // Don't render anything while permissions are loading
  if (loading) {
    return null
  }

  let hasRequiredPermission = false
  let permissionCheckInfo = ""

  // Check different permission patterns
  if (adminOnly) {
    // Admin-only check - requires backend admin permissions
    hasRequiredPermission = hasAnyPermission(['ACCESS_ADMIN_DASHBOARD', 'MANAGE_SETTINGS', 'MANAGE_USERS', 'MANAGE_ROLES'])
    permissionCheckInfo = "Admin access check"
  } else if (resourcePermission) {
    // Resource-specific permission check
    hasRequiredPermission = hasResourcePermission(
      resourcePermission.permission,
      resourcePermission.resourceType,
      resourcePermission.resourceId
    )
    permissionCheckInfo = `Resource permission: ${resourcePermission.permission} on ${resourcePermission.resourceType}${resourcePermission.resourceId ? ':' + resourcePermission.resourceId : ''}`
  } else if (action) {
    // Action-based permission check
    hasRequiredPermission = canPerformAction(
      action.action,
      action.resourceType,
      action.resourceId
    )
    permissionCheckInfo = `Action: ${action.action} on ${action.resourceType}${action.resourceId ? ':' + action.resourceId : ''}`
  } else if (requiredPermissions && requiredPermissions.length > 0) {
    // Requires ALL specified permissions
    hasRequiredPermission = hasAllPermissions(requiredPermissions)
    permissionCheckInfo = `All permissions required: ${requiredPermissions.join(', ')}`
  } else if (anyOfPermissions && anyOfPermissions.length > 0) {
    // Requires ANY of the specified permissions
    hasRequiredPermission = hasAnyPermission(anyOfPermissions)
    permissionCheckInfo = `Any permission required: ${anyOfPermissions.join(', ')}`
  } else if (requiredPermission) {
    // Legacy single permission check (backward compatibility)
    hasRequiredPermission = checkPermission(requiredPermission)
    permissionCheckInfo = `Single permission: ${requiredPermission}`
  } else {
    // No permission requirements specified - allow access
    hasRequiredPermission = true
    permissionCheckInfo = "No permission requirements"
  }

  // Debug information
  if (showPermissionInfo && process.env.NODE_ENV === 'development') {
    console.log(`PermissionAware Check:`, {
      hasRequiredPermission,
      permissionCheckInfo,
      userId: user?.id,
      userPermissions: user?.permissions?.slice(0, 5), // Show first 5 permissions
      totalPermissions: user?.permissions?.length
    })
  }

  // Render debug info in development
  const debugInfo = showPermissionInfo && process.env.NODE_ENV === 'development' ? (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs z-50 max-w-xs">
      <div className="font-bold">Permission Check:</div>
      <div>Result: {hasRequiredPermission ? '✅ GRANTED' : '❌ DENIED'}</div>
      <div>Check: {permissionCheckInfo}</div>
      <div>User: {user?.username}</div>
    </div>
  ) : null

  return (
    <>
      {hasRequiredPermission ? children : fallback}
      {debugInfo}
    </>
  )
}

export default PermissionAware

// Additional specialized permission-aware components

interface AdminOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const AdminOnly: React.FC<AdminOnlyProps> = ({ children, fallback = null }) => (
  <PermissionAware adminOnly={true} fallback={fallback}>
    {children}
  </PermissionAware>
)

interface ResourceProtectedProps {
  children: React.ReactNode
  permission: string
  resourceType: string
  resourceId?: string
  fallback?: React.ReactNode
}

export const ResourceProtected: React.FC<ResourceProtectedProps> = ({ 
  children, 
  permission, 
  resourceType, 
  resourceId, 
  fallback = null 
}) => (
  <PermissionAware 
    resourcePermission={{ permission, resourceType, resourceId }}
    fallback={fallback}
  >
    {children}
  </PermissionAware>
)

interface ActionProtectedProps {
  children: React.ReactNode
  action: string
  resourceType: string
  resourceId?: string
  fallback?: React.ReactNode
}

export const ActionProtected: React.FC<ActionProtectedProps> = ({ 
  children, 
  action, 
  resourceType, 
  resourceId, 
  fallback = null 
}) => (
  <PermissionAware 
    action={{ action, resourceType, resourceId }}
    fallback={fallback}
  >
    {children}
  </PermissionAware>
)

interface MultiPermissionProps {
  children: React.ReactNode
  anyOf?: string[]
  allOf?: string[]
  fallback?: React.ReactNode
}

export const MultiPermission: React.FC<MultiPermissionProps> = ({ 
  children, 
  anyOf, 
  allOf, 
  fallback = null 
}) => (
  <PermissionAware 
    anyOfPermissions={anyOf}
    requiredPermissions={allOf}
    fallback={fallback}
  >
    {children}
  </PermissionAware>
)
