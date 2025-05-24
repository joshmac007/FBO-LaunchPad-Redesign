"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { fetchUserPermissions, getCurrentUser, isAuthenticated } from "@/app/services/auth-service"

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
    const loadPermissions = async () => {
      try {
        if (isAuthenticated()) {
          const currentUser = getCurrentUser()
          if (currentUser && currentUser.roles) {
            setUserRoles(currentUser.roles)
          } else {
            setUserRoles([])
          }

          try {
            const permissions = await fetchUserPermissions()
            setUserPermissions(permissions)
          } catch (error) {
            console.error("Failed to fetch user permissions:", error)
            setUserPermissions([])
          }
        } else {
          setUserPermissions([])
          setUserRoles([])
        }
      } catch (error) {
        // This catch block is for errors in isAuthenticated or getCurrentUser,
        // or any other unexpected error within loadPermissions.
        console.error("Error loading permissions and roles:", error)
        setUserPermissions([])
        setUserRoles([])
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
