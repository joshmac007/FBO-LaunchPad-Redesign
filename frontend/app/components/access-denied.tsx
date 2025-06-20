"use client"

import React, { useState, useEffect } from "react"
import { Shield, ChevronDown, ChevronUp, Eye, EyeOff, RefreshCw, AlertTriangle, User, Settings, Bug, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/app/contexts/permission-context"
import { cn } from "@/lib/utils"
import { DASHBOARD_ACCESS, FUEL_ORDERS, SYSTEM, USERS } from "@/app/constants/permissions"

// Configuration for debugging features
const DEBUG_CONFIG = {
  // Set to false to hide all debugging info in production
  SHOW_DEBUG: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_SHOW_PERMISSION_DEBUG === 'true',
  // Show condensed debug by default (expandable)
  SHOW_EXPANDED_BY_DEFAULT: false,
  // Allow manual override of debug visibility
  ALLOW_MANUAL_TOGGLE: true,
}

interface AccessDeniedProps {
  // Required permissions that the user lacks
  requiredPermissions?: string[]
  // Any of these permissions would grant access
  anyOfPermissions?: string[]
  // Resource-specific permission information
  resourcePermission?: {
    permission: string
    resourceType: string
    resourceId?: string
  }
  // Role-based checks
  adminOnly?: boolean
  csrOnly?: boolean
  fuelerOnly?: boolean
  memberOnly?: boolean
  // Page context
  pageName?: string
  pageDescription?: string
  // Custom messages
  customMessage?: string
  customTitle?: string
  // Suggested actions
  suggestedActions?: Array<{
    label: string
    href: string
    variant?: "default" | "outline" | "secondary"
  }>
}

export default function AccessDenied({
  requiredPermissions = [],
  anyOfPermissions = [],
  resourcePermission,
  adminOnly = false,
  csrOnly = false,
  fuelerOnly = false,
  memberOnly = false,
  pageName,
  pageDescription,
  customMessage,
  customTitle,
  suggestedActions = []
}: AccessDeniedProps) {
  const router = useRouter()
  const [isDebugExpanded, setIsDebugExpanded] = useState(DEBUG_CONFIG.SHOW_EXPANDED_BY_DEFAULT)
  const [showDebugOverride, setShowDebugOverride] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const {
    user,
    userPermissions,
    userRoles,
    effectivePermissions,
    permissionSummary,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getPermissionSource,
    refreshPermissions,
  } = usePermissions()

  // Determine what permissions would be needed
  const getRequiredPermissionsDisplay = () => {
    const permissions: string[] = []
    
    if (adminOnly) {
      permissions.push(
        DASHBOARD_ACCESS.ACCESS_ADMIN_DASHBOARD, 
        SYSTEM.MANAGE_SETTINGS, 
        USERS.MANAGE_USERS, 
        SYSTEM.MANAGE_ROLES
      )
    }
    if (csrOnly) {
      permissions.push(
        DASHBOARD_ACCESS.ACCESS_CSR_DASHBOARD, 
        FUEL_ORDERS.VIEW_ALL_ORDERS, 
        FUEL_ORDERS.CREATE_FUEL_ORDER
      )
    }
    if (fuelerOnly) {
      permissions.push(
        DASHBOARD_ACCESS.ACCESS_FUELER_DASHBOARD, 
        FUEL_ORDERS.PERFORM_FUELING_TASK, 
        FUEL_ORDERS.UPDATE_ORDER_STATUS, 
        FUEL_ORDERS.VIEW_ASSIGNED_ORDERS, 
        FUEL_ORDERS.COMPLETE_FUEL_ORDER
      )
    }
    if (memberOnly) {
      permissions.push(DASHBOARD_ACCESS.ACCESS_MEMBER_DASHBOARD)
    }
    
    if (requiredPermissions.length > 0) {
      permissions.push(...requiredPermissions)
    }
    
    if (anyOfPermissions.length > 0) {
      return { type: 'any', permissions: anyOfPermissions }
    }
    
    if (resourcePermission) {
      permissions.push(`${resourcePermission.permission}:${resourcePermission.resourceType}${resourcePermission.resourceId ? `:${resourcePermission.resourceId}` : ''}`)
    }
    
    return { type: 'all', permissions: [...new Set(permissions)] }
  }

  const requiredPermsDisplay = getRequiredPermissionsDisplay()

  // Determine suggested dashboard redirect
  const getSuggestedDashboard = () => {
    if (hasAnyPermission([
      DASHBOARD_ACCESS.ACCESS_ADMIN_DASHBOARD, 
      SYSTEM.MANAGE_SETTINGS, 
      USERS.MANAGE_USERS, 
      SYSTEM.MANAGE_ROLES
    ])) {
      return { label: 'Go to Admin Dashboard', href: '/admin/dashboard' }
    }
    if (hasAnyPermission([
      DASHBOARD_ACCESS.ACCESS_CSR_DASHBOARD, 
      FUEL_ORDERS.VIEW_ALL_ORDERS, 
      FUEL_ORDERS.CREATE_FUEL_ORDER
    ])) {
      return { label: 'Go to CSR Dashboard', href: '/csr/dashboard' }
    }
    if (hasAnyPermission([
      DASHBOARD_ACCESS.ACCESS_FUELER_DASHBOARD, 
      FUEL_ORDERS.PERFORM_FUELING_TASK, 
      FUEL_ORDERS.UPDATE_ORDER_STATUS
    ])) {
      return { label: 'Go to Fueler Dashboard', href: '/fueler/dashboard' }
    }
    if (hasAnyPermission([DASHBOARD_ACCESS.ACCESS_MEMBER_DASHBOARD]) || user?.is_active) {
      return { label: 'Go to Member Dashboard', href: '/member/dashboard' }
    }
    return null
  }

  const suggestedDashboard = getSuggestedDashboard()

  const handleRefreshPermissions = async () => {
    setIsRefreshing(true)
    try {
      const success = await refreshPermissions()
      if (success) {
        // Check if user now has access after refresh
        const hasAccess = requiredPermsDisplay.type === 'any' 
          ? hasAnyPermission(requiredPermsDisplay.permissions)
          : hasAllPermissions(requiredPermsDisplay.permissions)
        
        if (hasAccess) {
          // Refresh the page to re-check permissions
          window.location.reload()
        }
      }
    } catch (error) {
      console.error("Failed to refresh permissions:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const shouldShowDebug = DEBUG_CONFIG.SHOW_DEBUG || showDebugOverride

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-2xl space-y-6">
        {/* Main Access Denied Card */}
        <Card className="border-destructive/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-destructive/10 p-3">
                <Shield className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl">
              {customTitle || "Access Denied"}
            </CardTitle>
            <CardDescription>
              {customMessage || (
                pageName 
                  ? `You don't have permission to access ${pageName}.`
                  : "You don't have permission to access this page."
              )}
              {pageDescription && (
                <span className="block mt-2 text-sm text-muted-foreground">
                  {pageDescription}
                </span>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Permission Requirements */}
            {requiredPermsDisplay.permissions.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Required Permissions</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>
                    This page requires {requiredPermsDisplay.type === 'any' ? 'any of' : 'all of'} the following permissions:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {requiredPermsDisplay.permissions.map((perm) => (
                      <Badge 
                        key={perm} 
                        variant={hasPermission(perm) ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {perm}
                        {hasPermission(perm) && " ✓"}
                      </Badge>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleRefreshPermissions}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                {isRefreshing ? "Refreshing..." : "Refresh Permissions"}
              </Button>

              {suggestedDashboard && (
                <Button asChild variant="outline">
                  <Link href={suggestedDashboard.href} className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    {suggestedDashboard.label}
                  </Link>
                </Button>
              )}

              {/* Custom suggested actions */}
              {suggestedActions.map((action, index) => (
                <Button key={index} asChild variant={action.variant || "outline"}>
                  <Link href={action.href}>
                    {action.label}
                  </Link>
                </Button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" asChild>
                <Link href="/login" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Login with Different Account
                </Link>
              </Button>

              <Button variant="outline" asChild>
                <Link href="/" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Return to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Debug Information Panel */}
        {shouldShowDebug && (
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
            <Collapsible open={isDebugExpanded} onOpenChange={setIsDebugExpanded}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bug className="h-5 w-5 text-orange-600" />
                      <CardTitle className="text-lg text-orange-800 dark:text-orange-200">
                        Debug Information
                      </CardTitle>
                      <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                        Development Only
                      </Badge>
                    </div>
                    {isDebugExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  <CardDescription className="text-orange-700 dark:text-orange-300">
                    Technical details for debugging permission issues
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {/* User Information */}
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      User Information
                    </h4>
                    <div className="text-sm space-y-1 bg-white dark:bg-gray-900 p-3 rounded border">
                      <div><strong>ID:</strong> {user?.id || 'N/A'}</div>
                      <div><strong>Email:</strong> {user?.email || 'N/A'}</div>
                      <div><strong>Name:</strong> {user?.name || 'N/A'}</div>
                      <div><strong>Active:</strong> {user?.is_active ? 'Yes' : 'No'}</div>
                      <div><strong>Logged In:</strong> {user?.isLoggedIn ? 'Yes' : 'No'}</div>
                    </div>
                  </div>

                  {/* User Roles */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">User Roles ({userRoles.length})</h4>
                    <div className="flex flex-wrap gap-1">
                      {userRoles.length > 0 ? (
                        userRoles.map((role) => (
                          <Badge key={role.id} variant="secondary">
                            {role.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No roles assigned</span>
                      )}
                    </div>
                  </div>

                  {/* User Permissions */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">
                      User Permissions ({userPermissions.length})
                    </h4>
                    <div className="max-h-40 overflow-y-auto bg-white dark:bg-gray-900 p-3 rounded border">
                      {userPermissions.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {userPermissions.map((permission) => {
                            const source = getPermissionSource(permission)
                            return (
                              <div key={permission} className="flex items-center justify-between text-xs">
                                <span className="font-mono">{permission}</span>
                                {source && (
                                  <Badge variant="outline" className="text-xs ml-2">
                                    {source}
                                  </Badge>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No permissions assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Permission Checks */}
                  {requiredPermsDisplay.permissions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Permission Check Results</h4>
                      <div className="space-y-2 bg-white dark:bg-gray-900 p-3 rounded border">
                        {requiredPermsDisplay.permissions.map((permission) => {
                          const hasIt = hasPermission(permission)
                          return (
                            <div key={permission} className="flex items-center justify-between text-sm">
                              <span className="font-mono">{permission}</span>
                              <Badge variant={hasIt ? "default" : "destructive"}>
                                {hasIt ? "✓ GRANTED" : "✗ DENIED"}
                              </Badge>
                            </div>
                          )
                        })}
                        <Separator />
                        <div className="font-medium">
                          <span className="text-sm">Overall Access: </span>
                          <Badge variant={
                            requiredPermsDisplay.type === 'any' 
                              ? hasAnyPermission(requiredPermsDisplay.permissions) ? "default" : "destructive"
                              : hasAllPermissions(requiredPermsDisplay.permissions) ? "default" : "destructive"
                          }>
                            {requiredPermsDisplay.type === 'any' 
                              ? hasAnyPermission(requiredPermsDisplay.permissions) ? "✓ GRANTED (ANY)" : "✗ DENIED (NEED ANY)"
                              : hasAllPermissions(requiredPermsDisplay.permissions) ? "✓ GRANTED (ALL)" : "✗ DENIED (NEED ALL)"
                            }
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                                     {/* Permission Summary */}
                   {permissionSummary && (
                     <div>
                       <h4 className="font-medium text-sm mb-2">Permission Summary</h4>
                       <div className="text-sm bg-white dark:bg-gray-900 p-3 rounded border">
                         <div>Direct Permissions: {permissionSummary.by_source.direct.length || 0}</div>
                         <div>Role Permissions: {permissionSummary.by_source.roles.length || 0}</div>
                         <div>Group Permissions: {permissionSummary.by_source.groups.length || 0}</div>
                         <div>Total Effective: {permissionSummary.total_permissions || 0}</div>
                       </div>
                     </div>
                   )}

                  {/* System Information */}
                  <div>
                    <h4 className="font-medium text-sm mb-2">System Information</h4>
                    <div className="text-xs bg-white dark:bg-gray-900 p-3 rounded border space-y-1">
                      <div>Environment: {process.env.NODE_ENV}</div>
                      <div>Loading: {loading ? 'Yes' : 'No'}</div>
                      <div>Timestamp: {new Date().toISOString()}</div>
                      <div>Page: {typeof window !== 'undefined' ? window.location.pathname : 'N/A'}</div>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

        {/* Debug Toggle (if allowed) */}
        {DEBUG_CONFIG.ALLOW_MANUAL_TOGGLE && !DEBUG_CONFIG.SHOW_DEBUG && (
          <Card className="border-dashed">
            <CardContent className="pt-4">
              <Button
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDebugOverride(!showDebugOverride)}
                className="w-full"
              >
                {showDebugOverride ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showDebugOverride ? 'Hide' : 'Show'} Debug Information
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
