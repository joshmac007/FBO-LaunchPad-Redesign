"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/hooks/usePermissions"
import AppSidebar from "@/components/layout/app-sidebar"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertTriangle } from "lucide-react"

export default function CSRLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)

  const { 
    loading: permissionsLoading, 
    user, 
    canAny,
    isCSR,
    userPermissions,
    refresh
  } = usePermissions()

  useEffect(() => {
    // Wait for permissions to load
    if (permissionsLoading) {
      return
    }

    // Check authentication and CSR permissions
    if (!user || !user.isLoggedIn) {
      console.log("CSR Layout: User not authenticated, redirecting to login")
      router.push("/login")
      return
    }

    // Check for CSR access using backend permissions
    const csrPermissions = [
      'access_csr_dashboard',   // Dashboard access permission
      'create_order',           // Allows creating new fuel orders
      'view_all_orders',        // Allows viewing all fuel orders  
      'review_fuel_order',      // Allows CSR/Admin to mark orders as reviewed
      'export_orders_csv',      // Allows exporting order data to CSV
      'view_order_statistics',  // Allows viewing order statistics
      'edit_fuel_order',        // Allows editing fuel order details
      'view_customers',         // Allows viewing customer list
      'manage_customers',       // Allows creating, updating, deleting customers
    ]

    const hasCSRAccess = canAny(csrPermissions) || isCSR

    // Create debug information
    const debug = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isLoggedIn: user.isLoggedIn,
        roles: user.roles
      },
      permissions: {
        total: userPermissions.length,
        list: userPermissions,
        csrPermissions,
        hasAnyCSRPermission: canAny(csrPermissions),
        isCSRFromHook: isCSR,
        hasCSRAccess
      },
      checks: {
        canAny_access_csr_dashboard: canAny(['access_csr_dashboard']),
        canAny_create_order: canAny(['create_order']),
        canAny_view_all_orders: canAny(['view_all_orders']),
        canAny_review_fuel_order: canAny(['review_fuel_order']),
      }
    }

    setDebugInfo(debug)

    if (!hasCSRAccess) {
      console.log("CSR Layout: User does not have CSR permissions")
      console.log("Debug info:", debug)
      
      // Show debug info in development
      if (process.env.NODE_ENV === 'development') {
        setShowDebug(true)
        setIsLoading(false)
        return
      }
      
      // Redirect to appropriate dashboard based on user's permissions
      if (canAny(['access_admin_dashboard', 'manage_users', 'manage_settings', 'manage_roles'])) {
        console.log("CSR Layout: Redirecting to admin dashboard")
        router.push("/admin/dashboard")
      } else if (canAny(['access_fueler_dashboard', 'perform_fueling_task', 'update_order_status'])) {
        console.log("CSR Layout: Redirecting to fueler dashboard")
        router.push("/fueler/dashboard")
      } else if (canAny(['access_member_dashboard']) || user.is_active) {
        console.log("CSR Layout: Redirecting to member dashboard")
        router.push("/member/dashboard")
      } else {
        console.log("CSR Layout: User not active, redirecting to login")
        router.push("/login")
      }
      return
    }

    console.log("CSR Layout: User has CSR access, proceeding")
    setHasAccess(true)
    setIsLoading(false)
  }, [
    permissionsLoading, 
    user, 
    canAny, 
    isCSR,
    userPermissions,
    router
  ])

  const handleRefreshPermissions = async () => {
    setIsLoading(true)
    try {
      await refresh()
    } catch (error) {
      console.error("Failed to refresh permissions:", error)
    }
    setIsLoading(false)
  }

  // Show loading while permissions are being checked
  if (isLoading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">
            {permissionsLoading ? "Loading permissions..." : "Checking CSR access..."}
          </p>
        </div>
      </div>
    )
  }

  // Show debug information in development when access is denied
  if (showDebug && !hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-2xl w-full space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>CSR Access Denied</AlertTitle>
            <AlertDescription>
              You don't have the required permissions to access the CSR module.
            </AlertDescription>
          </Alert>

          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Debug Information</h3>
            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-96">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleRefreshPermissions} disabled={isLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh Permissions
            </Button>
            <Button variant="outline" onClick={() => router.push("/member/dashboard")}>
              Go to Member Dashboard
            </Button>
            <Button variant="outline" onClick={() => router.push("/login")}>
              Back to Login
            </Button>
          </div>
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
        userRole="csr" // Keep for compatibility, but sidebar should use permissions internally
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
