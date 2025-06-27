"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { usePermissions } from "@/hooks/usePermissions"
import AppSidebar from "@/components/layout/app-sidebar"
import AccessDenied from "@/app/components/access-denied"
import { QueryProvider } from "@/app/providers/query-provider"
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar"

const CSRLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, isAuthenticated, hasPermission, user } = usePermissions()
  const [isClient, setIsClient] = useState(false)

  // Ensure consistent rendering between server and client
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Always render loading state during SSR and initial hydration
  if (!isClient || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <p>Verifying CSR Access...</p>
      </div>
    )
  }

  const canAccess = isAuthenticated() && hasPermission("access_csr_dashboard")

  if (!canAccess) {
    return (
      <AccessDenied
        pageName="CSR Module"
        requiredPermissions={["access_csr_dashboard"]}
      />
    )
  }

  return (
    <QueryProvider>
      <SidebarProvider>
        <Sidebar>
          <AppSidebar />
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <main className="p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </QueryProvider>
  )
}

export default CSRLayout
