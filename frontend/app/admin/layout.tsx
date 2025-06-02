// Create the admin layout file to match the CSR layout structure

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/hooks/usePermissions"
import AppSidebar from "@/components/layout/app-sidebar"
import { cn } from "@/lib/utils"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  const { 
    loading: permissionsLoading, 
    user, 
    canAny,
    isAdmin 
  } = usePermissions()

  useEffect(() => {
    // Wait for permissions to load
    if (permissionsLoading) {
      return
    }

    // Check authentication and admin permissions
    if (!user || !user.isLoggedIn) {
      router.push("/login")
      return
    }

    // Check for admin access using backend permissions
    const adminPermissions = [
      'ACCESS_ADMIN_DASHBOARD',
      'MANAGE_SETTINGS', 
      'MANAGE_USERS',
      'MANAGE_ROLES'
    ]

    const hasAdminAccess = canAny(adminPermissions) || isAdmin

    if (!hasAdminAccess) {
      console.log("User does not have admin permissions, redirecting to appropriate dashboard")
      
      // Redirect to appropriate dashboard based on user's permissions
      if (canAny(['ACCESS_CSR_DASHBOARD', 'VIEW_ALL_ORDERS', 'CREATE_ORDER'])) {
        router.push("/csr/dashboard")
      } else if (canAny(['ACCESS_FUELER_DASHBOARD', 'PERFORM_FUELING_TASK'])) {
        router.push("/fueler/dashboard")
      } else if (canAny(['ACCESS_MEMBER_DASHBOARD']) || user.is_active) {
        router.push("/member/dashboard")
      } else {
        router.push("/login")
      }
      return
    }

    setHasAccess(true)
    setIsLoading(false)
  }, [
    permissionsLoading, 
    user, 
    canAny, 
    isAdmin,
    router
  ])

  // Show loading while permissions are being checked
  if (isLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">
            {permissionsLoading ? "Loading permissions..." : "Checking admin access..."}
          </p>
        </div>
      </div>
    )
  }

  // Don't render anything if user doesn't have access (they'll be redirected)
  if (!hasAccess) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
        userRole="admin" // Keep for compatibility, but sidebar should use permissions internally
      />
      <div
        className={cn(
          "transition-all duration-300 ease-in-out min-h-screen",
          sidebarCollapsed ? "lg:pl-[80px]" : "lg:pl-[280px]",
        )}
      >
        <main className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
