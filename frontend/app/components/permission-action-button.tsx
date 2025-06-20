"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/hooks/usePermissions"
import { cn } from "@/lib/utils"
import { DASHBOARD_ACCESS, FUEL_ORDERS, USERS, SYSTEM } from "@/app/constants/permissions"

interface PermissionActionButtonProps {
  // Button props
  children: React.ReactNode
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  disabled?: boolean
  onClick?: () => void
  type?: "button" | "submit" | "reset"
  title?: string
  
  // Permission requirements
  requiredPermission?: string
  requiredPermissions?: string[]
  anyOfPermissions?: string[]
  resourceType?: string
  resourceId?: string | number
  
  // Fallback behavior
  hideIfNoAccess?: boolean // If true, hide button completely. If false, show disabled button
  fallbackComponent?: React.ReactNode
  loadingText?: string
}

const PermissionActionButton: React.FC<PermissionActionButtonProps> = ({
  children,
  className,
  variant = "default",
  size = "default",
  disabled = false,
  onClick,
  type = "button",
  requiredPermission,
  requiredPermissions,
  anyOfPermissions,
  resourceType,
  resourceId,
  hideIfNoAccess = false,
  fallbackComponent,
  loadingText = "Loading...",
  title,
}) => {
  const { 
    loading, 
    can, 
    canAll, 
    canAny, 
    hasResourcePermission 
  } = usePermissions()

  // Show loading state while permissions are being checked
  if (loading) {
    if (hideIfNoAccess) {
      return null
    }
    return (
      <Button 
        variant={variant} 
        size={size} 
        disabled={true}
        className={cn(className)}
      >
        {loadingText}
      </Button>
    )
  }

  // Check permissions
  let hasAccess = true

  if (requiredPermission) {
    if (resourceType && resourceId) {
      hasAccess = hasResourcePermission(requiredPermission, resourceType, String(resourceId))
    } else {
      hasAccess = can(requiredPermission)
    }
  } else if (requiredPermissions && requiredPermissions.length > 0) {
    hasAccess = canAll(requiredPermissions)
  } else if (anyOfPermissions && anyOfPermissions.length > 0) {
    hasAccess = canAny(anyOfPermissions)
  }

  // Handle no access cases
  if (!hasAccess) {
    if (hideIfNoAccess) {
      return fallbackComponent || null
    }
    
    // Show disabled button
    return (
      <Button 
        variant={variant} 
        size={size} 
        disabled={true}
        className={cn("opacity-50 cursor-not-allowed", className)}
        title="You don't have permission to perform this action"
      >
        {children}
      </Button>
    )
  }

  // Render the button with access
  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled}
      onClick={onClick}
      type={type}
      className={cn(className)}
      title={title}
    >
      {children}
    </Button>
  )
}

export default PermissionActionButton

// Convenience components for common patterns
export const AdminActionButton: React.FC<Omit<PermissionActionButtonProps, 'anyOfPermissions'>> = (props) => (
  <PermissionActionButton 
    {...props} 
    anyOfPermissions={[DASHBOARD_ACCESS.ACCESS_ADMIN_DASHBOARD, SYSTEM.MANAGE_SETTINGS]}
  />
)

export const CSRActionButton: React.FC<Omit<PermissionActionButtonProps, 'anyOfPermissions'>> = (props) => (
  <PermissionActionButton 
    {...props} 
    anyOfPermissions={[DASHBOARD_ACCESS.ACCESS_CSR_DASHBOARD, FUEL_ORDERS.VIEW_ALL_ORDERS]}
  />
)

export const FuelerActionButton: React.FC<Omit<PermissionActionButtonProps, 'anyOfPermissions'>> = (props) => (
  <PermissionActionButton 
    {...props} 
    anyOfPermissions={[DASHBOARD_ACCESS.ACCESS_FUELER_DASHBOARD, FUEL_ORDERS.PERFORM_FUELING_TASK]}
  />
)

export const CreateOrderButton: React.FC<Omit<PermissionActionButtonProps, 'anyOfPermissions'>> = (props) => (
  <PermissionActionButton 
    {...props} 
    anyOfPermissions={[FUEL_ORDERS.CREATE_FUEL_ORDER, FUEL_ORDERS.EDIT_FUEL_ORDER]}
  />
)

export const ManageUsersButton: React.FC<Omit<PermissionActionButtonProps, 'anyOfPermissions'>> = (props) => (
  <PermissionActionButton 
    {...props} 
    anyOfPermissions={[USERS.MANAGE_USERS, USERS.VIEW_USERS]}
  />
) 