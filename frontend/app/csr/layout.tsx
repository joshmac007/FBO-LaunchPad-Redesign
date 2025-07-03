"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { usePermissions } from "@/hooks/usePermissions"
import AppSidebar from "@/components/layout/app-sidebar"
import AccessDenied from "@/app/components/access-denied"
import { QueryProvider } from "@/app/providers/query-provider"
import {
  SidebarInset,
  SidebarProvider,
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
        <AppSidebar />
        <SidebarInset>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </QueryProvider>
  )
}

export default CSRLayout
