"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

interface PermissionContextType {
  userPermissions: string[]
  userRoles: string[]
  checkPermission: (permissionId: string) => boolean
  loading: boolean
}

const PermissionContext = createContext<PermissionContextType>({
  userPermissions: [],
  userRoles: [],
  checkPermission: () => false,
  loading: true,
})

export const usePermissions = () => useContext(PermissionContext)

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simple permission loading without external dependencies
    const loadPermissions = () => {
      try {
        const userData = localStorage.getItem("fboUser")
        if (userData) {
          const user = JSON.parse(userData)
          if (user.isLoggedIn && user.email) {
            // For admin user, give all permissions
            if (user.email === "fbosaas@gmail.com") {
              setUserPermissions([
                "view_fuel_orders",
                "create_fuel_order",
                "update_fuel_order",
                "delete_fuel_order",
                "view_aircraft",
                "create_aircraft",
                "view_users",
                "create_user",
                "manage_roles",
                "view_fuel_trucks",
                "view_lst",
              ])
              setUserRoles(["Administrator"])
            }
          }
        }
      } catch (error) {
        console.error("Error loading permissions:", error)
      } finally {
        setLoading(false)
      }
    }

    loadPermissions()
  }, [])

  const checkPermission = (permissionId: string): boolean => {
    return userPermissions.includes(permissionId)
  }

  return (
    <PermissionContext.Provider value={{ userPermissions, userRoles, checkPermission, loading }}>
      {children}
    </PermissionContext.Provider>
  )
}
