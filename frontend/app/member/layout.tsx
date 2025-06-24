"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { usePermissions } from "@/hooks/usePermissions"
import AppSidebar from "@/components/layout/app-sidebar"
import AccessDenied from "@/app/components/access-denied"
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar"

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  const { 
    loading: permissionsLoading, 
    user, 
    isMember 
  } = usePermissions()

  useEffect(() => {
    // Wait for permissions to load
    if (permissionsLoading) {
      return
    }

    // Check authentication
    if (!user || !user.isLoggedIn) {
      router.push("/login")
      return
    }

    // Members don't need specific permissions, just being logged in
    // But we'll check for member role or allow any authenticated user
    const hasMemberAccess = isMember || user.isLoggedIn

    if (!hasMemberAccess) {
      console.log("User does not have member access")
      
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
    isMember,
    router
  ])

  // Show loading while permissions are being checked
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">
            Loading dashboard...
          </p>
        </div>
      </div>
    )
  }

  // Show access denied page if user doesn't have access
  if (!hasAccess) {
    return (
      <AccessDenied
        pageName="Member Dashboard"
        pageDescription="Member dashboard for viewing system status and basic operations."
        suggestedActions={[
          {
            label: "Contact Support",
            href: "mailto:support@fbolaunchpad.com",
            variant: "outline"
          }
        ]}
      />
    )
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <AppSidebar userRole="member" />
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <main className="p-4 md:p-6 lg:pr-8 lg:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}