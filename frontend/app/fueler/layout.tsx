"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/hooks/usePermissions"
import AppSidebar from "@/components/layout/app-sidebar"
import AccessDenied from "@/app/components/access-denied"
import { PERMISSION_GROUPS } from "@/app/constants/permissions"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function FuelerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
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
    const fuelerPermissions = [...PERMISSION_GROUPS.FUELER]

    const hasFuelerAccess = canAny(fuelerPermissions) || isFueler

    if (!hasFuelerAccess) {
      console.log("User does not have fueler permissions")
      
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

  // Show access denied page if user doesn't have access
  if (!hasAccess) {
    return (
      <AccessDenied
        fuelerOnly={true}
        pageName="Fueler Dashboard"
        pageDescription="Line Service Technician dashboard for managing assigned fuel orders and task execution."
        anyOfPermissions={[...PERMISSION_GROUPS.FUELER]}
        suggestedActions={[
          {
            label: "Contact CSR Team",
            href: "/csr/dashboard",
            variant: "outline"
          }
        ]}
      />
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <main className="flex-1 overflow-auto">
          <div className="p-6">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
