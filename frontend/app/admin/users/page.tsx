"use client"

import { useState, useEffect } from "react"
import { Users, UserPlus, Search, Filter, MoreHorizontal, Edit, Trash2, Shield, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { User as ServiceUser, getAllUsers, createUser, updateUser, deleteUser, UserCreateRequest, UserUpdateRequest, Role, getRoles, getAdminUserById } from "@/app/services/user-service" // Import service functions
import { toast } from "sonner" // For notifications

export default function UserManagement() {
  const [users, setUsers] = useState<ServiceUser[]>([]) // Use ServiceUser type
  const [filteredUsers, setFilteredUsers] = useState<ServiceUser[]>([]) // Use ServiceUser type
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all") // Typed status filter
  const [roleFilter, setRoleFilter] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<ServiceUser | null>(null) // Use ServiceUser type
  const [showPassword, setShowPassword] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false) // For form submissions
  
  // Dynamic role management
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(true)
  const [roleStringToIdMap, setRoleStringToIdMap] = useState<Record<string, number>>({})

  const [newUser, setNewUser] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
    role: "", // This will be a role name string, to be mapped to role_ids
    is_active: true, // Changed from status
  })

  // Fetch roles from API and create mapping
  const fetchRoles = async () => {
    setIsLoadingRoles(true)
    try {
      const fetchedRoles = await getRoles()
      setRoles(fetchedRoles)
      
      // Create mapping from role name to ID
      const mapping: Record<string, number> = {}
      fetchedRoles.forEach((role) => {
        mapping[role.name.toLowerCase()] = role.id
      })
      setRoleStringToIdMap(mapping)
    } catch (error) {
      console.error("Failed to fetch roles:", error)
      toast.error("Failed to load roles. Please try again.")
    } finally {
      setIsLoadingRoles(false)
    }
  }

  const fetchUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const fetchedUsers = await getAllUsers()
      setUsers(fetchedUsers)
      setFilteredUsers(fetchedUsers) // Initialize filteredUsers
    } catch (error) {
      console.error("Failed to fetch users:", error)
      toast.error("Failed to load users. Please try again.")
    } finally {
      setIsLoadingUsers(false)
    }
  }

  useEffect(() => {
    fetchRoles()
    fetchUsers()
  }, [])

  useEffect(() => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    if (statusFilter !== "all") {
      const isActiveFilter = statusFilter === "active"
      filtered = filtered.filter((user) => user.is_active === isActiveFilter)
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => 
        user.roles.some(role => {
          // Handle both string roles and role objects
          const roleStr = typeof role === 'string' ? role : (role as any)?.name || String(role)
          return roleStr.toLowerCase() === roleFilter.toLowerCase()
        })
      )
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, statusFilter, roleFilter])

  const handleCreateUser = async () => {
    setIsSubmitting(true)
    const roleId = roleStringToIdMap[newUser.role.toLowerCase()]
    if (!roleId) {
      toast.error(`Invalid role selected: ${newUser.role}. Please select a valid role.`)
      setIsSubmitting(false)
      return
    }

    const payload: UserCreateRequest = {
      username: newUser.username,
      fullName: newUser.fullName,
      email: newUser.email,
      password: newUser.password,
      role_ids: [roleId], // Use dynamic mapping
      is_active: newUser.is_active,
    }

    try {
      await createUser(payload)
      toast.success("User created successfully!")
      fetchUsers() // Refresh user list
      setNewUser({ username: "", fullName: "", email: "", password: "", role: "", is_active: true })
      setIsCreateDialogOpen(false)
    } catch (error: any) {
      console.error("Failed to create user:", error)
      toast.error(`Failed to create user: ${error.message || "Unknown error"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditUser = async () => {
    if (!selectedUser) return
    setIsSubmitting(true)

    // Extract role string from either string or object format
    const firstRole = selectedUser.roles[0]
    const roleString = typeof firstRole === 'string' ? firstRole : (firstRole as any)?.name || ""
    const roleId = roleStringToIdMap[roleString.toLowerCase()]
    
    if (!roleId && selectedUser.roles.length > 0) {
      // Check if the role string exists in our map
      toast.error(`Invalid role detected: ${roleString}. Please select a valid role.`)
      setIsSubmitting(false)
      return
    }

    const payload: UserUpdateRequest = {
      username: selectedUser.username,
      fullName: selectedUser.fullName,
      email: selectedUser.email,
      is_active: selectedUser.is_active,
      // Only include role_ids if a valid role was found/selected
      ...(roleId && { role_ids: [roleId] }),
    }

    try {
      await updateUser(selectedUser.id, payload)
      toast.success("User updated successfully!")
      fetchUsers() // Refresh user list
      setIsEditDialogOpen(false)
      setSelectedUser(null)
    } catch (error: any) {
      console.error("Failed to update user:", error)
      toast.error(`Failed to update user: ${error.message || "Unknown error"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    // Add confirmation dialog before deleting
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this user? The user will be deactivated for data integrity."
    )
    
    if (!isConfirmed) {
      return
    }

    try {
      await deleteUser(userId)
      toast.success("User has been deactivated successfully!")
      fetchUsers() // Refresh user list
    } catch (error: any) {
      console.error("Failed to delete user:", error)
      toast.error(`Failed to delete user: ${error.message || "Unknown error"}`)
    }
  }

  const getRoleDisplayName = (roleName: string) => {
    // Handle cases where roleName is null, undefined, or empty
    if (!roleName) {
      return 'No Role'
    }
    
    // Convert to string if it's not already (in case it's a number or other type)
    const roleString = String(roleName)
    
    // If we don't have roles loaded yet, just return the role string
    if (roles.length === 0) {
      return roleString
    }
    
    // Try to find the role in our loaded roles
    const role = roles.find((r) => r.name.toLowerCase() === roleString.toLowerCase())
    return role ? role.name : roleString
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={isLoadingRoles}>
              <UserPlus className="h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>Add a new user to the system with appropriate role and permissions.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="johndoe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="••••••••"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })} disabled={isLoadingRoles}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingRoles ? "Loading roles..." : "Select a role"} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.name}
                        {role.description && <span className="text-muted-foreground text-sm"> - {role.description}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Add is_active select for create dialog */}
              <div className="grid gap-2">
                <Label htmlFor="status-create">Status</Label>
                <Select
                  value={newUser.is_active ? "active" : "inactive"}
                  onValueChange={(value) => setNewUser({ ...newUser, is_active: value === "active" })}
                >
                  <SelectTrigger id="status-create">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCreateUser} disabled={isSubmitting || isLoadingRoles}>
                {isSubmitting ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: "all" | "active" | "inactive") => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter} disabled={isLoadingRoles}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={isLoadingRoles ? "Loading..." : "Filter by role"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({filteredUsers.length})
          </CardTitle>
          <CardDescription>Manage user accounts and their access permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingUsers ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.fullName || user.username || "N/A"}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                        {user.username && user.fullName && (
                          <div className="text-xs text-muted-foreground">Username: {user.username}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.roles.map((role, index) => {
                        // Handle both string roles and role objects
                        const roleStr = typeof role === 'string' ? role : (role as any)?.name || String(role)
                        return (
                          <Badge key={roleStr || index} variant="outline" className="mr-1 mb-1">
                            {getRoleDisplayName(roleStr)}
                          </Badge>
                        )
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(user.is_active)}>{user.is_active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell>{user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={async () => {
                              try {
                                // Use admin endpoint to get full user details
                                const fullUserData = await getAdminUserById(user.id)
                                setSelectedUser(fullUserData)
                                setIsEditDialogOpen(true)
                              } catch (error) {
                                console.error("Failed to fetch user details:", error)
                                toast.error("Failed to load user details for editing")
                              }
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Shield className="mr-2 h-4 w-4" />
                            Manage Roles (Future)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive hover:text-destructive-foreground hover:bg-destructive" onClick={() => handleDeleteUser(user.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => {
        setIsEditDialogOpen(isOpen);
        if (!isOpen) setSelectedUser(null); // Clear selected user when dialog closes
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and settings.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={selectedUser.username || ""}
                  onChange={(e) => setSelectedUser({ ...selectedUser, username: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-fullName">Full Name</Label>
                <Input
                  id="edit-fullName"
                  value={selectedUser.fullName || ""}
                  onChange={(e) => setSelectedUser({ ...selectedUser, fullName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={(() => {
                    // Handle both string roles and role objects
                    const firstRole = selectedUser.roles[0]
                    return typeof firstRole === 'string' ? firstRole : (firstRole as any)?.name || ""
                  })()}
                  onValueChange={(value) => setSelectedUser({ ...selectedUser, roles: [{ id: roleStringToIdMap[value.toLowerCase()] || 0, name: value }] })}
                  disabled={isLoadingRoles}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingRoles ? "Loading roles..." : "Select a role"} />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.name}>
                        {role.name}
                        {role.description && <span className="text-muted-foreground text-sm"> - {role.description}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={selectedUser.is_active ? "active" : "inactive"}
                  onValueChange={(value) => setSelectedUser({ ...selectedUser, is_active: value === "active" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleEditUser} disabled={isSubmitting || isLoadingRoles}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
