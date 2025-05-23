"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AccessDenied from "./access-denied"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: string
  fallback?: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  fallback = <AccessDenied />,
}) => {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setIsClient(true)

    // Check if user is logged in
    try {
      const userData = localStorage.getItem("fboUser")
      if (!userData) {
        router.push("/login")
        return
      }

      const user = JSON.parse(userData)
      if (!user.isLoggedIn) {
        router.push("/login")
        return
      }

      // If no specific permission required, just being logged in is enough
      if (!requiredPermission) {
        setIsAuthorized(true)
        setLoading(false)
        return
      }

      // For admin user, allow all permissions
      if (user.email === "fbosaas@gmail.com") {
        setIsAuthorized(true)
        setLoading(false)
        return
      }

      // For other users, check specific permissions (implement as needed)
      setIsAuthorized(false)
      setLoading(false)
    } catch (error) {
      console.error("Error checking authorization:", error)
      router.push("/login")
    }
  }, [router, requiredPermission])

  if (!isClient || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return isAuthorized ? <>{children}</> : <>{fallback}</>
}

export default ProtectedRoute
