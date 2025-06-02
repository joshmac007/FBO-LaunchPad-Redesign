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
      'ACCESS_FUELER_DASHBOARD',
      'PERFORM_FUELING_TASK',
      'UPDATE_OWN_ORDER_STATUS',
      'VIEW_ASSIGNED_ORDERS',
      'COMPLETE_OWN_ORDER'
    ]

    const hasFuelerAccess = canAny(fuelerPermissions) || isFueler

    if (!hasFuelerAccess) {
      console.log("User does not have fueler permissions, redirecting to appropriate dashboard")
      
      // Redirect to appropriate dashboard based on user's permissions
      if (canAny(['ACCESS_ADMIN_DASHBOARD', 'MANAGE_SETTINGS', 'MANAGE_USERS', 'MANAGE_ROLES'])) {
        router.push("/admin/dashboard")
      } else if (canAny(['ACCESS_CSR_DASHBOARD', 'VIEW_ALL_ORDERS', 'CREATE_ORDER'])) {
        router.push("/csr/dashboard")
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
