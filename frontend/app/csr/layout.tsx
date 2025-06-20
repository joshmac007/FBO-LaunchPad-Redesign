"use client"

import type React from "react"
import { useState } from "react"
import { usePermissions } from "@/hooks/usePermissions"
import AppSidebar from "@/components/layout/app-sidebar"
import AccessDenied from "@/app/components/access-denied"
import { cn } from "@/lib/utils"

const CSRLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, isAuthenticated, hasPermission, user } = usePermissions()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  console.log(
    `%c[CSRLayout] Render. Loading: ${loading}, Authenticated: ${isAuthenticated()}, User Email: ${user?.email}`, 
    "color: purple;"
  )

  if (loading) {
    console.log("[CSRLayout] Showing loading skeleton.")
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Verifying CSR Access...</p>
      </div>
    )
  }

  const canAccess = isAuthenticated() && hasPermission("access_csr_dashboard")
  console.log(`[CSRLayout] Access check complete. Result: ${canAccess}`)

  if (!canAccess) {
    console.error("[CSRLayout] Access Denied. Rendering AccessDenied component.")
    return (
      <AccessDenied
        pageName="CSR Module"
        requiredPermissions={["access_csr_dashboard"]}
      />
    )
  }

  console.log("%c[CSRLayout] Access Granted. Rendering children.", "color: green;")
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} userRole="csr" />
      <div
        className={cn(
          "transition-all duration-300 ease-in-out min-h-screen",
          sidebarCollapsed ? "lg:pl-[80px]" : "lg:pl-[280px]",
        )}
      >
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}

export default CSRLayout
