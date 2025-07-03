"use client"

import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  UserPlus,
  MoreHorizontal,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react"
import {
  getAllAdminCustomers,
  createAdminCustomer,
  updateAdminCustomer,
  deleteAdminCustomer, // Import deleteAdminCustomer
  type Customer,
  type AdminCustomerCreateRequest,
  type AdminCustomerUpdateRequest,
} from "../../services/customer-service" // Adjusted path
import { toast } from "sonner" // For notifications

const customerFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  phone: z.string().optional(),
})

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const form = useForm<z.infer<typeof customerFormSchema>>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  })
  // Adjusted editCustomerData state for form fields
  const [editCustomerData, setEditCustomerData] = useState<{
    id: number | null
    name: string
    email: string
    phone: string
  }>({ id: null, name: "", email: "", phone: "" })
  const [isSubmitting, setIsSubmitting] = useState(false) // Used for Create/Edit forms
  const [createFormError, setCreateFormError] = useState<string | null>(null)
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Define fetchCustomers here to be accessible by other functions
  const fetchCustomers = async () => {
    setIsLoading(true)
    try {
      const fetchedData = await getAllAdminCustomers()
      setCustomers(fetchedData)
      setError(null)
    } catch (err) {
      setError("Failed to fetch customers.")
      setCustomers([])
      console.error("Error fetching customers:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleEditClick = (customer: Customer) => {
    setSelectedCustomer(customer)
    // Populate editCustomerData with the selected customer's details
    setEditCustomerData({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || "", // Ensure phone is always a string
    })
    setEditFormError(null) // Clear previous edit errors
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (customer: Customer) => {
    setSelectedCustomer(customer)
    setDeleteError(null) // Clear previous delete errors
    setIsDeleteDialogOpen(true)
  }

  const handleCreateCustomerSubmit = async (values: z.infer<typeof customerFormSchema>) => {
    setIsSubmitting(true)
    try {
      const payload: AdminCustomerCreateRequest = {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
      }
      await createAdminCustomer(payload)
      toast.success("Customer created successfully!")
      await fetchCustomers() // Refresh the list
      setIsCreateDialogOpen(false) // Close dialog on success
      form.reset()
    } catch (error: any) {
      console.error("Failed to create customer:", error)
      toast.error(error.message || "Failed to create customer.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditCustomerSubmit = async () => {
    if (!editCustomerData || !editCustomerData.id) {
      setEditFormError("No customer selected or customer ID is missing.")
      return
    }
    setEditFormError(null)

    // Basic client-side validation
    if (!editCustomerData.name.trim()) {
      setEditFormError("Name is required.")
      return
    }
    if (!editCustomerData.email.trim() || !/\S+@\S+\.\S+/.test(editCustomerData.email)) {
      setEditFormError("A valid email is required.")
      return
    }

    setIsSubmitting(true)
    try {
      const payload: AdminCustomerUpdateRequest = {
        name: editCustomerData.name.trim(),
        email: editCustomerData.email.trim(),
        phone: editCustomerData.phone?.trim() || undefined,
      }
      await updateAdminCustomer(editCustomerData.id, payload)
      toast.success("Customer updated successfully!")
      await fetchCustomers()
      setIsEditDialogOpen(false)
    } catch (error: any) {
      console.error("Failed to update customer:", error)
      setEditFormError(error.message || "An unknown error occurred. Please try again.")
      toast.error(error.message || "Failed to update customer.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedCustomer || !selectedCustomer.id) {
      console.error("No customer selected for deletion or ID is missing.")
      setDeleteError("No customer selected for deletion or ID is missing.")
      return
    }
    setDeleteError(null)
    setIsDeletingCustomer(true)

    try {
      await deleteAdminCustomer(selectedCustomer.id)
      toast.success("Customer deleted successfully.")
      await fetchCustomers()
      setIsDeleteDialogOpen(false)
      setSelectedCustomer(null) // Clear selection after successful delete
    } catch (error: any) {
      console.error("Failed to delete customer:", error)
      // Basic error parsing for conflict
      if (error.message && (error.message.includes("constraint") || error.message.includes("foreign key") || error.message.includes("409"))) {
        setDeleteError("This customer cannot be deleted as they are referenced by other records (e.g., aircraft).")
        toast.error("Deletion failed: Customer is in use.")
      } else {
        const genericError = "Failed to delete customer. Please try again."
        setDeleteError(genericError)
        toast.error(genericError)
      }
    } finally {
      setIsDeletingCustomer(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Customer Management</h1>
          <Dialog 
            open={isCreateDialogOpen} 
            onOpenChange={(isOpen) => {
              setIsCreateDialogOpen(isOpen);
              if (!isOpen) {
                form.reset(); // Reset form data
                setCreateFormError(null); // Clear any form errors
              }
            }}
          >
            <DialogTrigger asChild>
              {/* Ensure DialogTrigger's child is a valid trigger, e.g., Button */}
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" /> Add Customer
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Fill in the details to add a new customer. Click create when you&apos;re done.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateCustomerSubmit)} className="grid gap-4 py-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
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
                        <Input type="email" placeholder="john.doe@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="(123) 456-7890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Customer</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading customers...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center py-10 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
          <p className="text-red-600 font-medium text-lg">Error</p>
          <p className="text-red-500">{error}</p>
          <Button onClick={() => { /* Allow retry or specific action */ }} className="mt-4">Try Again</Button>
        </div>
      )}

      {!isLoading && !error && (
        <Card>
          <CardHeader>
            <CardTitle>Customers</CardTitle>
            <CardDescription>
              Manage your customer records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table data-testid="customer-list">
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length > 0 ? (
                  customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>{customer.id}</TableCell>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.phone || "N/A"}</TableCell>
                      <TableCell>
                        {customer.created_at
                          ? new Date(customer.created_at).toLocaleDateString()
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(customer)}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteClick(customer)} className="text-red-600 hover:text-red-600! hover:bg-red-100!">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
                      No customers found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Customer Dialog */}
      <Dialog 
        open={isEditDialogOpen} 
        onOpenChange={(isOpen) => {
          setIsEditDialogOpen(isOpen);
          if (!isOpen) {
            setEditCustomerData({ id: null, name: "", email: "", phone: "" }); // Reset edit form
            setSelectedCustomer(null); // Clear selected customer
            setEditFormError(null); // Clear edit form errors
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Update the customer&apos;s information. Click save when you&apos;re done.
            </DialogDescription>
          </DialogHeader>
          {editCustomerData && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name-edit" className="text-right">Name</Label>
                <Input
                  id="name-edit"
                  value={editCustomerData.name}
                  onChange={(e) => setEditCustomerData({ ...editCustomerData, name: e.target.value })}
                  className="col-span-3"
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email-edit" className="text-right">Email</Label>
                <Input
                  id="email-edit"
                  type="email"
                  value={editCustomerData.email}
                  onChange={(e) => setEditCustomerData({ ...editCustomerData, email: e.target.value })}
                  className="col-span-3"
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone-edit" className="text-right">Phone</Label>
                <Input
                  id="phone-edit"
                  value={editCustomerData.phone}
                  onChange={(e) => setEditCustomerData({ ...editCustomerData, phone: e.target.value })}
                  className="col-span-3"
                  disabled={isSubmitting}
                />
              </div>
              {editFormError && (
                <div className="col-span-4 bg-red-50 p-2 rounded-md border border-red-200 text-xs text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
                  {editFormError}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEditCustomerSubmit} disabled={isSubmitting || !editCustomerData?.id}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Customer Dialog */}
      <Dialog 
        open={isDeleteDialogOpen} 
        onOpenChange={(isOpen) => {
          setIsDeleteDialogOpen(isOpen);
          if (!isOpen) {
            setSelectedCustomer(null); // Clear selected customer when dialog is closed
            setDeleteError(null); // Clear delete error when dialog is closed
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete customer "{selectedCustomer?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="bg-red-50 p-3 rounded-md border border-red-200 text-sm text-red-700 flex items-center my-2">
              <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeletingCustomer}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeletingCustomer}>
              {isDeletingCustomer && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeletingCustomer ? "Deleting..." : "Delete Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
