"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { LogOut, Plane, Bell, Settings, User, Shield, Plus, Search, Filter, Edit, Lock, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  type Permission,
  PermissionCategory,
  type Role,
  getAllPermissions,
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
} from "@/app/services/permission-service"
import ProtectedRoute from "@/app/components/protected-route"
import AdminLayout from "../layout"

export default function PermissionsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [activeTab, setActiveTab] = useState("roles")
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<PermissionCategory | "all">("all")

  // Role management
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [newRole, setNewRole] = useState<{
    name: string
    description: string
    permissions: string[]
  }>({
    name: "",
    description: "",
    permissions: [],
  })
  const [formError, setFormError] = useState("")

  // Role deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)

  // User role assignment - Disabled: Backend doesn't support user-role assignment endpoints yet
  // const [showAssignRoleDialog, setShowAssignRoleDialog] = useState(false)
  // const [userEmail, setUserEmail] = useState("")
  // const [userRoles, setUserRoles] = useState<string[]>([])
  // const [assignmentError, setAssignmentError] = useState("")

  useEffect(() => {
    // Load permissions and roles
    loadPermissionsAndRoles()
  }, [])

  const loadPermissionsAndRoles = async () => {
    try {
      setIsLoading(true)
      const [allPermissions, allRoles] = await Promise.all([
        getAllPermissions(),
        getAllRoles()
      ])

      setPermissions(allPermissions)
      setRoles(allRoles)
    } catch (error) {
      console.error("Error loading permissions and roles:", error)
      setFormError("Failed to load permissions and roles")
      // Ensure arrays are set even on error
      setPermissions([])
      setRoles([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("fboUser")
    window.location.href = "/login"
  }

  // Filter permissions based on search query and category
  const filteredPermissions = (permissions || []).filter((permission) => {
    const matchesSearch =
      permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = categoryFilter === "all" || (permission.category || "") === categoryFilter

    return matchesSearch && matchesCategory
  })

  // Filter roles based on search query
  const filteredRoles = (roles || []).filter(
    (role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Handle role form submission
  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")

    // Validate form
    if (!newRole.name) {
      setFormError("Role name is required")
      return
    }

    if (newRole.permissions.length === 0) {
      setFormError("Select at least one permission")
      return
    }

    try {
      if (editingRole) {
        // Update existing role
        await updateRole(editingRole.id, {
          name: newRole.name,
          description: newRole.description,
          permissions: newRole.permissions,
        })
      } else {
        // Create new role
        await createRole({
          name: newRole.name,
          description: newRole.description,
          permissions: newRole.permissions,
          isSystemRole: false,
        })
      }

      // Reload roles
      await loadPermissionsAndRoles()

      // Reset form
      setNewRole({
        name: "",
        description: "",
        permissions: [],
      })
      setEditingRole(null)
      setShowRoleForm(false)
    } catch (error) {
      console.error("Error saving role:", error)
      setFormError("Failed to save role. Please try again.")
    }
  }

  // Handle role deletion
  const handleDeleteRole = async () => {
    if (!roleToDelete) return

    try {
      await deleteRole(roleToDelete.id)

      // Reload roles
      await loadPermissionsAndRoles()

      // Close dialog
      setShowDeleteConfirm(false)
      setRoleToDelete(null)
    } catch (error) {
      console.error("Error deleting role:", error)
      setFormError("Failed to delete role. System roles cannot be deleted.")
    }
  }

  // Handle permission toggle in role form
  const handlePermissionToggle = (permissionId: string) => {
    setNewRole((prev) => {
      const permissions = prev.permissions.includes(permissionId)
        ? prev.permissions.filter((id) => id !== permissionId)
        : [...prev.permissions, permissionId]

      return { ...prev, permissions }
    })
  }

  // Handle edit role
  const handleEditRole = (role: Role) => {
    setEditingRole(role)
    setNewRole({
      name: role.name,
      description: role.description,
      permissions: [...role.permissions],
    })
    setShowRoleForm(true)
  }

  // User role assignment functions - Disabled: Backend doesn't support user-role assignment endpoints yet
  /*
  const handleLookupUserRoles = () => {
    setAssignmentError("")

    if (!userEmail.trim()) {
      setAssignmentError("Email is required")
      return
    }

    try {
      const userRolesList = getUserRoles(userEmail)
      setUserRoles(userRolesList.map((role) => role.id))
    } catch (error) {
      console.error("Error looking up user roles:", error)
      setAssignmentError("Failed to lookup user roles")
      setUserRoles([])
    }
  }

  const handleRoleAssignmentToggle = (roleId: string) => {
    if (!userEmail) return

    try {
      if (userRoles.includes(roleId)) {
        // Remove role
        removeRoleFromUser(userEmail, roleId)
        setUserRoles((prev) => prev.filter((id) => id !== roleId))
      } else {
        // Assign role
        assignRoleToUser(userEmail, roleId, user?.email || "admin")
        setUserRoles((prev) => [...prev, roleId])
      }
    } catch (error) {
      console.error("Error toggling role assignment:", error)
      setAssignmentError("Failed to update role assignment")
    }
  }
  */

  // Group permissions by category
  const permissionsByCategory = (permissions || []).reduce(
    (acc, permission) => {
      const category = permission.category || "uncategorized"
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(permission)
      return acc
    },
    {} as Record<string, Permission[]>,
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p>Loading permissions...</p>
        </div>
      </div>
    )
  }

  return (
      <div className="space-y-6 p-4 md:p-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">Permissions & Roles</h1>
              <Button variant="outline" size="sm" onClick={() => window.location.href = "/admin/dashboard"} className="gap-2">
                Back to Dashboard
              </Button>
            </div>

            <Tabs defaultValue="roles" value={activeTab} onValueChange={setActiveTab}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <TabsList className="grid w-full md:w-auto grid-cols-2 md:grid-cols-none md:flex">
                  <TabsTrigger value="roles" className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Roles</span>
                  </TabsTrigger>
                  <TabsTrigger value="permissions" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span>Permissions</span>
                  </TabsTrigger>
                </TabsList>

                <div className="flex gap-2">
                  {activeTab === "roles" && (
                    <Button
                      onClick={() => {
                        setEditingRole(null)
                        setNewRole({
                          name: "",
                          description: "",
                          permissions: [],
                        })
                        setShowRoleForm(true)
                      }}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create Role</span>
                    </Button>
                  )}
                  {/* User role assignment disabled - Backend doesn't support user-role assignment endpoints yet
                  <Button
                    variant="outline"
                    onClick={() => setShowAssignRoleDialog(true)}
                    className="flex items-center gap-2"
                  >
                    <User className="h-4 w-4" />
                    <span>Assign Roles</span>
                  </Button>
                  */}
                </div>
              </div>

              {/* Search and Filter */}
              <div className="flex flex-col md:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={`Search ${activeTab}...`}
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {activeTab === "permissions" && (
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value as PermissionCategory | "all")}
                      className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="all">All Categories</option>
                      {Object.values(PermissionCategory).map((category) => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1).replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <TabsContent value="roles">
                <Card>
                  <CardHeader>
                    <CardTitle>Roles</CardTitle>
                    <CardDescription>Manage roles that define sets of permissions for users</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filteredRoles.length === 0 ? (
                      <div className="text-center py-8">
                        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No roles found</h3>
                        <p className="text-muted-foreground mb-4">
                          {searchQuery ? "Try adjusting your search" : "Create your first role using the button above"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {filteredRoles.map((role) => (
                          <Card key={role.id} className="overflow-hidden">
                            <CardHeader className="pb-2 bg-muted/50">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    {role.name}
                                    {role.isSystemRole && (
                                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
                                        System
                                      </Badge>
                                    )}
                                  </CardTitle>
                                  <CardDescription>{role.description}</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditRole(role)}
                                    disabled={role.isSystemRole}
                                    title={role.isSystemRole ? "System roles cannot be edited" : "Edit role"}
                                  >
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Edit</span>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setRoleToDelete(role)
                                      setShowDeleteConfirm(true)
                                    }}
                                    disabled={role.isSystemRole}
                                    title={role.isSystemRole ? "System roles cannot be deleted" : "Delete role"}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">
                                  <strong>Permissions ({(role.permissions || []).length}):</strong>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {(role.permissions || []).slice(0, 5).map((permissionId) => {
                                    const permission = permissions.find((p) => p.id.toString() === permissionId.toString())
                                    return permission ? (
                                      <Badge key={permissionId} variant="secondary" className="text-xs">
                                        {permission.name}
                                      </Badge>
                                    ) : null
                                  })}
                                  {(role.permissions || []).length > 5 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{(role.permissions || []).length - 5} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="permissions">
                <Card>
                  <CardHeader>
                    <CardTitle>System Permissions</CardTitle>
                    <CardDescription>View all available permissions organized by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filteredPermissions.length === 0 ? (
                      <div className="text-center py-8">
                        <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No permissions found</h3>
                        <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => {
                          const filteredCategoryPermissions = categoryPermissions.filter((permission) => {
                            const matchesSearch =
                              permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              permission.description.toLowerCase().includes(searchQuery.toLowerCase())

                            const matchesCategory = categoryFilter === "all" || (permission.category || "") === categoryFilter

                            return matchesSearch && matchesCategory
                          })

                          if (filteredCategoryPermissions.length === 0) return null

                          return (
                            <div key={category}>
                              <h3 className="text-lg font-semibold mb-3 capitalize">
                                {category.replace("_", " ")} Permissions
                              </h3>
                              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {filteredCategoryPermissions.map((permission) => (
                                  <Card key={permission.id} className="p-4">
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <h4 className="font-medium">{permission.name}</h4>
                                        <Badge variant="outline" className="text-xs">
                                          {(permission.category || "").replace("_", " ")}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground">{permission.description}</p>
                                      <div className="text-xs text-muted-foreground">ID: {permission.id}</div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Role Form Dialog */}
            {showRoleForm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <CardHeader>
                    <CardTitle>{editingRole ? "Edit Role" : "Create New Role"}</CardTitle>
                    <CardDescription>
                      {editingRole
                        ? "Update role details and permissions"
                        : "Define a new role with specific permissions"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleRoleSubmit} className="space-y-4">
                      {formError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                          {formError}
                        </div>
                      )}

                      <div className="space-y-2">
                        <label htmlFor="roleName" className="text-sm font-medium">
                          Role Name
                        </label>
                        <Input
                          id="roleName"
                          value={newRole.name}
                          onChange={(e) => setNewRole((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter role name"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="roleDescription" className="text-sm font-medium">
                          Description
                        </label>
                        <Input
                          id="roleDescription"
                          value={newRole.description}
                          onChange={(e) => setNewRole((prev) => ({ ...prev, description: e.target.value }))}
                          placeholder="Enter role description"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-medium">Permissions</label>
                        <div className="space-y-4 max-h-60 overflow-y-auto border rounded p-3">
                          {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                            <div key={category}>
                              <h4 className="font-medium text-sm mb-2 capitalize">{category.replace("_", " ")}</h4>
                              <div className="space-y-2 ml-4">
                                {categoryPermissions.map((permission) => (
                                  <label key={permission.id} className="flex items-center space-x-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={newRole.permissions.includes(permission.id.toString())}
                                      onChange={() => handlePermissionToggle(permission.id.toString())}
                                      className="rounded border-gray-300"
                                    />
                                    <span>{permission.name}</span>
                                    <span className="text-muted-foreground">- {permission.description}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowRoleForm(false)
                            setEditingRole(null)
                            setFormError("")
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">{editingRole ? "Update Role" : "Create Role"}</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && roleToDelete && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle>Delete Role</CardTitle>
                    <CardDescription>
                      Are you sure you want to delete the role "{roleToDelete.name}"? This action cannot be undone.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setRoleToDelete(null)
                        }}
                      >
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteRole}>
                        Delete Role
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* User Role Assignment Dialog - Disabled: Backend doesn't support user-role assignment endpoints yet
            {showAssignRoleDialog && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle>Assign Roles to User</CardTitle>
                    <CardDescription>Enter a user email to view and modify their role assignments</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {assignmentError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                          {assignmentError}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Input
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                          placeholder="Enter user email"
                          type="email"
                        />
                        <Button onClick={handleLookupUserRoles}>Lookup</Button>
                      </div>

                      {userEmail && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Roles</label>
                          <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                            {roles.map((role) => (
                              <label key={role.id} className="flex items-center space-x-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={userRoles.includes(role.id)}
                                  onChange={() => handleRoleAssignmentToggle(role.id)}
                                  className="rounded border-gray-300"
                                />
                                <span>{role.name}</span>
                                <span className="text-muted-foreground">- {role.description</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowAssignRoleDialog(false)
                            setUserEmail("")
                            setUserRoles([])
                            setAssignmentError("")
                          }}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            */}
    </div>
  )
}
