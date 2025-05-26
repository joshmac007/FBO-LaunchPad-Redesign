"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated } from "@/app/services/auth-service"
import AppSidebar from "@/components/layout/app-sidebar"
import { cn } from "@/lib/utils"

export default function CSRLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in and is CSR
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
          
          // Check if user has CSR role - handle both array and string formats
          const userRoles = parsedUser.roles || []
          const hasCSRRole = Array.isArray(userRoles) 
            ? userRoles.some(role => role.toLowerCase().includes("customer service") || role.toLowerCase().includes("csr"))
            : false
            
          if (!hasCSRRole) {
            console.log("User does not have CSR role, redirecting to login")
            router.push("/login")
            return
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
    <div className="min-h-screen bg-background">
      <AppSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} userRole="csr" />
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
