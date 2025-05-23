"use client"

import type React from "react"

import { usePermissions } from "../contexts/permission-context"

interface PermissionAwareProps {
  children: React.ReactNode
  requiredPermission: string
  fallback?: React.ReactNode
}

const PermissionAware: React.FC<PermissionAwareProps> = ({ children, requiredPermission, fallback = null }) => {
  const { checkPermission } = usePermissions()

  const hasRequiredPermission = checkPermission(requiredPermission)

  return hasRequiredPermission ? <>{children}</> : <>{fallback}</>
}

export default PermissionAware
