"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Users, UserPlus, Search, Filter, MoreHorizontal, Edit, Trash2, Shield, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
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

const userFormSchema = z.object({
  username: z.string().min(1, { message: "Username is required." }),
  fullName: z.string().min(1, { message: "Full name is required." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
  role: z.string().min(1, { message: "Please select a role." }),
  is_active: z.boolean(),
})

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

  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      fullName: "",
      email: "",
      password: "",
      role: "",
      is_active: true,
    },
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
      // Prepare filters for API call
      const filters: { role?: string; is_active?: string } = {}
      
      if (roleFilter !== "all") {
        filters.role = roleFilter
      }
      
      if (statusFilter !== "all") {
        filters.is_active = statusFilter === "active" ? "true" : "false"
      }
      
      const fetchedUsers = await getAllUsers(Object.keys(filters).length > 0 ? filters : undefined)
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
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [roleFilter, statusFilter]) // Re-fetch when filters change

  useEffect(() => {
    // Now only handle search term filtering client-side since role and status filtering happens server-side
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          (user.fullName && user.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm]) // Remove roleFilter and statusFilter from dependencies since they're handled server-side

  const handleCreateUser = async (values: z.infer<typeof userFormSchema>) => {
    setIsSubmitting(true)
    const roleId = roleStringToIdMap[values.role.toLowerCase()]
    if (!roleId) {
      toast.error(`Invalid role selected: ${values.role}. Please select a valid role.`)
      setIsSubmitting(false)
      return
    }

    const payload: UserCreateRequest = {
      username: values.username,
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      role_ids: [roleId], // Use dynamic mapping
      is_active: values.is_active,
    }

    try {
      await createUser(payload)
      toast.success("User created successfully!")
      fetchUsers() // Refresh user list
      form.reset()
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


  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts, roles, and permissions</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={(isOpen) => {
          setIsCreateDialogOpen(isOpen)
          if (!isOpen) {
            form.reset()
          }
        }}>
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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateUser)} className="grid gap-4 py-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="johndoe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
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
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange} disabled={isLoadingRoles}>
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
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value ? "active" : "inactive"}
                          onValueChange={(value) => field.onChange(value === "active")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create User</Button>
                </DialogFooter>
              </form>
            </Form>
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
          <Table data-testid="user-list">
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
                      <Badge variant={user.is_active ? "success" : "destructive"}>{user.is_active ? "Active" : "Inactive"}</Badge>
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
