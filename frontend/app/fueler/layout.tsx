"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated } from "@/app/services/auth-service"
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

  useEffect(() => {
    // Check if user is logged in and has fueler role
    const checkAuth = async () => {
      try {
        if (!isAuthenticated()) {
          router.push("/login")
          return
        }

        const userData = localStorage.getItem("fboUser")
        if (userData) {
          const parsedUser = JSON.parse(userData)
          if (!parsedUser.isLoggedIn) {
            router.push("/login")
            return
          }
          
          // Check if user has fueler role - handle both array and string formats
          const userRoles = parsedUser.roles || []
          const hasFuelerRole = Array.isArray(userRoles) 
            ? userRoles.some(role => 
                role.toLowerCase().includes("line service") || 
                role.toLowerCase().includes("technician") || 
                role.toLowerCase().includes("fueler")
              )
            : false
            
          // For fueler, we'll allow access even without specific role (could be member using fueler features)
          // but still log the role check
          if (!hasFuelerRole && userRoles.length > 0) {
            console.log("User does not have fueler role but has other roles, allowing access")
          }
        } else {
          router.push("/login")
          return
        }

        setIsLoading(false)
      } catch (error) {
        console.error("Authentication error:", error)
        router.push("/login")
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        <AppSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} userRole="fueler" />
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
