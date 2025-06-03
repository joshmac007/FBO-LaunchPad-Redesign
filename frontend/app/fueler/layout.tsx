"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/hooks/usePermissions"
import AppSidebar from "@/components/layout/app-sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function FuelerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  const { 
    loading: permissionsLoading, 
    user, 
    canAny,
    isFueler 
  } = usePermissions()

  useEffect(() => {
    // Wait for permissions to load
    if (permissionsLoading) {
      return
    }

    // Check authentication and fueler permissions
    if (!user || !user.isLoggedIn) {
      router.push("/login")
      return
    }

    // Check for fueler access using backend permissions
    const fuelerPermissions = [
      'access_fueler_dashboard',
      'perform_fueling_task',
      'update_order_status',
      'view_assigned_orders',
      'complete_fuel_order'
    ]

    const hasFuelerAccess = canAny(fuelerPermissions) || isFueler

    if (!hasFuelerAccess) {
      console.log("User does not have fueler permissions, redirecting to appropriate dashboard")
      
      // Redirect to appropriate dashboard based on user's permissions
      if (canAny(['access_admin_dashboard', 'manage_settings', 'manage_users', 'manage_roles'])) {
        router.push("/admin/dashboard")
      } else if (canAny(['access_csr_dashboard', 'view_all_orders', 'create_order'])) {
        router.push("/csr/dashboard")
      } else if (canAny(['access_member_dashboard']) || user.is_active) {
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
    isFueler,
    router
  ])

  // Show loading while permissions are being checked
  if (isLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">
            {permissionsLoading ? "Loading permissions..." : "Checking fueler access..."}
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
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        <AppSidebar 
          collapsed={sidebarCollapsed} 
          setCollapsed={setSidebarCollapsed} 
          userRole="fueler" // Keep for compatibility, but sidebar should use permissions internally
        />
        <main
          className={`flex-1 overflow-auto transition-all duration-300 ${
            sidebarCollapsed ? "ml-[80px]" : "ml-[280px]"
          }`}
        >
          <div className="p-6">{children}</div>
        </main>
      </div>
    </TooltipProvider>
  )
}
