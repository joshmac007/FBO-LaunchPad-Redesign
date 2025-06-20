"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AccessDenied from "./access-denied"
import { usePermissions } from "../contexts/permission-context"
import { DASHBOARD_ACCESS, FUEL_ORDERS, SYSTEM, USERS } from "@/app/constants/permissions"

interface ProtectedRouteProps {
  children: React.ReactNode
  // Legacy permission checking
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
  // Role-based convenience checks
  adminOnly?: boolean
  csrOnly?: boolean
  fuelerOnly?: boolean
  memberOnly?: boolean
  // Fallback components
  fallback?: React.ReactNode
  loadingFallback?: React.ReactNode
  redirectTo?: string // Custom redirect instead of /login
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredPermissions,
  anyOfPermissions,
  resourcePermission,
  adminOnly = false,
  csrOnly = false,
  fuelerOnly = false,
  memberOnly = false,
  fallback,
  loadingFallback,
  redirectTo = "/login"
}) => {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  const { 
    loading: permissionsLoading,
    user,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasResourcePermission
  } = usePermissions()

  useEffect(() => {
    setIsClient(true)

    // Wait for permissions to load
    if (permissionsLoading) {
      return
    }

    try {
      // Check if user is authenticated
      if (!user || !user.isLoggedIn) {
        router.push(redirectTo)
        return
      }

      // Determine required permissions based on props
      let hasRequiredAccess = false

      if (adminOnly) {
        // Admin access check
        hasRequiredAccess = hasAnyPermission([
          DASHBOARD_ACCESS.ACCESS_ADMIN_DASHBOARD, 
          SYSTEM.MANAGE_SETTINGS, 
          USERS.MANAGE_USERS, 
          SYSTEM.MANAGE_ROLES
        ])
      } else if (csrOnly) {
        // CSR access check
        hasRequiredAccess = hasAnyPermission([
          DASHBOARD_ACCESS.ACCESS_CSR_DASHBOARD, 
          FUEL_ORDERS.VIEW_ALL_ORDERS, 
          FUEL_ORDERS.CREATE_FUEL_ORDER
        ])
      } else if (fuelerOnly) {
        // Fueler access check
        hasRequiredAccess = hasAnyPermission([
          DASHBOARD_ACCESS.ACCESS_FUELER_DASHBOARD, 
          FUEL_ORDERS.PERFORM_FUELING_TASK, 
          FUEL_ORDERS.UPDATE_ORDER_STATUS
        ])
      } else if (memberOnly) {
        // Basic member access - just need to be authenticated with active account
        hasRequiredAccess = user.is_active
      } else if (resourcePermission) {
        // Resource-specific permission check
        hasRequiredAccess = hasResourcePermission(
          resourcePermission.permission,
          resourcePermission.resourceType,
          resourcePermission.resourceId
        )
      } else if (requiredPermissions && requiredPermissions.length > 0) {
        // Requires ALL specified permissions
        hasRequiredAccess = hasAllPermissions(requiredPermissions)
      } else if (anyOfPermissions && anyOfPermissions.length > 0) {
        // Requires ANY of the specified permissions
        hasRequiredAccess = hasAnyPermission(anyOfPermissions)
      } else if (requiredPermission) {
        // Legacy single permission check
        hasRequiredAccess = hasPermission(requiredPermission)
      } else {
        // No specific permission required - just being authenticated is enough
        hasRequiredAccess = true
      }

      setIsAuthorized(hasRequiredAccess)
      setAuthLoading(false)

      // Redirect if not authorized and not showing fallback
      if (!hasRequiredAccess && !fallback) {
        router.push(redirectTo)
      }

    } catch (error) {
      console.error("Error checking authorization:", error)
      router.push(redirectTo)
    }
  }, [
    router, 
    permissionsLoading, 
    user,
    requiredPermission,
    requiredPermissions,
    anyOfPermissions,
    resourcePermission,
    adminOnly,
    csrOnly,
    fuelerOnly,
    memberOnly,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasResourcePermission,
    fallback,
    redirectTo
  ])

  // Show loading while permissions are being fetched or client is hydrating
  if (!isClient || permissionsLoading || authLoading) {
    if (loadingFallback) {
      return <>{loadingFallback}</>
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    )
  }

  // Show children if authorized, otherwise show fallback or default AccessDenied
  if (isAuthorized) {
    return <>{children}</>
  }

  // If no custom fallback provided, use the enhanced AccessDenied component
  if (!fallback) {
    return (
      <AccessDenied
        adminOnly={adminOnly}
        csrOnly={csrOnly}
        fuelerOnly={fuelerOnly}
        memberOnly={memberOnly}
        requiredPermissions={requiredPermissions}
        anyOfPermissions={anyOfPermissions}
        resourcePermission={resourcePermission}
      />
    )
  }

  return <>{fallback}</>
}

export default ProtectedRoute

// Convenience components for common access patterns

interface AdminRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children, fallback, redirectTo }) => (
  <ProtectedRoute adminOnly={true} fallback={fallback} redirectTo={redirectTo}>
    {children}
  </ProtectedRoute>
)

interface CSRRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
}

export const CSRRoute: React.FC<CSRRouteProps> = ({ children, fallback, redirectTo }) => (
  <ProtectedRoute csrOnly={true} fallback={fallback} redirectTo={redirectTo}>
    {children}
  </ProtectedRoute>
)

interface FuelerRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
}

export const FuelerRoute: React.FC<FuelerRouteProps> = ({ children, fallback, redirectTo }) => (
  <ProtectedRoute fuelerOnly={true} fallback={fallback} redirectTo={redirectTo}>
    {children}
  </ProtectedRoute>
)

interface MemberRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
}

export const MemberRoute: React.FC<MemberRouteProps> = ({ children, fallback, redirectTo }) => (
  <ProtectedRoute memberOnly={true} fallback={fallback} redirectTo={redirectTo}>
    {children}
  </ProtectedRoute>
)
