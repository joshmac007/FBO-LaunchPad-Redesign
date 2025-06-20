// Create the admin layout file to match the CSR layout structure

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/hooks/usePermissions"
import AppSidebar from "@/components/layout/app-sidebar"
import AccessDenied from "@/app/components/access-denied"
import { cn } from "@/lib/utils"
import { PERMISSION_GROUPS } from "@/app/constants/permissions"

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
    const adminPermissions = [...PERMISSION_GROUPS.ADMIN]

    const hasAdminAccess = canAny(adminPermissions) || isAdmin

    if (!hasAdminAccess) {
      console.log("User does not have admin permissions")
      
      // Set access denied state instead of redirecting
      setHasAccess(false)
      setIsLoading(false)
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

  // Show access denied page if user doesn't have access
  if (!hasAccess) {
    return (
      <AccessDenied
        adminOnly={true}
        pageName="Admin Dashboard"
        pageDescription="System Administrator dashboard for managing users, permissions, and system settings."
        anyOfPermissions={[...PERMISSION_GROUPS.ADMIN]}
        suggestedActions={[
          {
            label: "Contact System Administrator",
            href: "mailto:admin@fbolaunchpad.com",
            variant: "outline"
          }
        ]}
      />
    )
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
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-72",
        )}
      >
        <main className="p-4 md:p-6 lg:pr-8 lg:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
