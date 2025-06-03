"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Plane,
  MoreHorizontal,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  Search,
  Plus,
} from "lucide-react"
import {
  getAllAdminAircraft,
  createAdminAircraft,
  updateAdminAircraft,
  deleteAdminAircraft,
  type Aircraft,
  type AdminAircraftCreateRequest,
  type AdminAircraftUpdateRequest,
} from "../../services/aircraft-service"
import { toast } from "sonner"
import AdminLayout from '../layout'
import { Badge } from '@/components/ui/badge'

export default function AdminAircraftPage() {
  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  const [filteredAircraft, setFilteredAircraft] = useState<Aircraft[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null)

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [fuelTypeFilter, setFuelTypeFilter] = useState<string>("")

  const [newAircraftData, setNewAircraftData] = useState<AdminAircraftCreateRequest>({
    tail_number: "",
    aircraft_type: "",
    fuel_type: "",
    customer_id: undefined,
  })

  const [editAircraftData, setEditAircraftData] = useState<AdminAircraftUpdateRequest>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createFormError, setCreateFormError] = useState<string | null>(null)
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [isDeletingAircraft, setIsDeletingAircraft] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Define fetchAircraft here to be accessible by other functions
  const fetchAircraft = async () => {
    setIsLoading(true)
    try {
      const fetchedData = await getAllAdminAircraft()
      setAircraft(fetchedData)
      setError(null)
    } catch (err) {
      setError("Failed to fetch aircraft.")
      setAircraft([])
      console.error("Error fetching aircraft:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAircraft()
  }, [])

  // Filter and search effect
  useEffect(() => {
    let filtered = aircraft

    // Search by tail number
    if (searchTerm) {
      filtered = filtered.filter((ac) =>
        ac.tailNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by fuel type
    if (fuelTypeFilter) {
      filtered = filtered.filter((ac) => ac.preferredFuelType === fuelTypeFilter)
    }

    setFilteredAircraft(filtered)
  }, [aircraft, searchTerm, fuelTypeFilter])

  const handleEditClick = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft)
    setEditAircraftData({
      aircraft_type: aircraft.type,
      fuel_type: aircraft.preferredFuelType,
      customer_id: aircraft.customer_id,
    })
    setEditFormError(null)
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft)
    setDeleteError(null)
    setIsDeleteDialogOpen(true)
  }

  const handleCreateAircraftSubmit = async () => {
    setCreateFormError(null)

    // Basic client-side validation
    if (!newAircraftData.tail_number.trim()) {
      setCreateFormError("Tail number is required.")
      return
    }
    if (!newAircraftData.aircraft_type.trim()) {
      setCreateFormError("Aircraft type is required.")
      return
    }
    if (!newAircraftData.fuel_type.trim()) {
      setCreateFormError("Fuel type is required.")
      return
    }

    setIsSubmitting(true)
    try {
      const payload: AdminAircraftCreateRequest = {
        tail_number: newAircraftData.tail_number.trim().toUpperCase(),
        aircraft_type: newAircraftData.aircraft_type.trim(),
        fuel_type: newAircraftData.fuel_type,
        customer_id: newAircraftData.customer_id || undefined,
      }
      await createAdminAircraft(payload)
      toast.success("Aircraft created successfully!")
      await fetchAircraft()
      setIsCreateDialogOpen(false)
      // Reset form
      setNewAircraftData({
        tail_number: "",
        aircraft_type: "",
        fuel_type: "",
        customer_id: undefined,
      })
    } catch (error: any) {
      console.error("Failed to create aircraft:", error)
      setCreateFormError(error.message || "An unknown error occurred. Please try again.")
      toast.error(error.message || "Failed to create aircraft.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditAircraftSubmit = async () => {
    if (!selectedAircraft) {
      setEditFormError("No aircraft selected.")
      return
    }
    setEditFormError(null)

    // Basic client-side validation
    if (!editAircraftData.aircraft_type?.trim()) {
      setEditFormError("Aircraft type is required.")
      return
    }
    if (!editAircraftData.fuel_type?.trim()) {
      setEditFormError("Fuel type is required.")
      return
    }

    setIsSubmitting(true)
    try {
      const payload: AdminAircraftUpdateRequest = {
        aircraft_type: editAircraftData.aircraft_type.trim(),
        fuel_type: editAircraftData.fuel_type,
        customer_id: editAircraftData.customer_id || undefined,
      }
      await updateAdminAircraft(selectedAircraft.id, payload)
      toast.success("Aircraft updated successfully!")
      await fetchAircraft()
      setIsEditDialogOpen(false)
    } catch (error: any) {
      console.error("Failed to update aircraft:", error)
      setEditFormError(error.message || "An unknown error occurred. Please try again.")
      toast.error(error.message || "Failed to update aircraft.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedAircraft) {
      console.error("No aircraft selected for deletion.")
      setDeleteError("No aircraft selected for deletion.")
      return
    }
    setDeleteError(null)
    setIsDeletingAircraft(true)

    try {
      await deleteAdminAircraft(selectedAircraft.id)
      toast.success("Aircraft deleted successfully!")
      await fetchAircraft()
      setIsDeleteDialogOpen(false)
    } catch (error: any) {
      console.error("Failed to delete aircraft:", error)
      setDeleteError(error.message || "An unknown error occurred. Please try again.")
      toast.error(error.message || "Failed to delete aircraft.")
    } finally {
      setIsDeletingAircraft(false)
    }
  }

  const resetCreateForm = () => {
    setNewAircraftData({
      tail_number: "",
      aircraft_type: "",
      fuel_type: "",
      customer_id: undefined,
    })
    setCreateFormError(null)
  }

  const resetEditForm = () => {
    setEditAircraftData({})
    setEditFormError(null)
    setSelectedAircraft(null)
  }

  const resetDeleteState = () => {
    setDeleteError(null)
    setSelectedAircraft(null)
  }

  // Get unique fuel types for filter
  const uniqueFuelTypes = Array.from(new Set(aircraft.map((ac) => ac.preferredFuelType)))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Aircraft Management</h1>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open)
            if (!open) resetCreateForm()
          }}>
            <DialogTrigger asChild>
                             <Button onClick={() => resetCreateForm()}>
                 <Plane className="h-4 w-4 mr-2" />
                 Add Aircraft
               </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Aircraft</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {createFormError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {createFormError}
                  </div>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="tail_number" className="text-right">
                    Tail Number *
                  </Label>
                  <Input
                    id="tail_number"
                    value={newAircraftData.tail_number}
                    onChange={(e) =>
                      setNewAircraftData({ ...newAircraftData, tail_number: e.target.value })
                    }
                    className="col-span-3"
                    placeholder="e.g., N12345"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="aircraft_type" className="text-right">
                    Aircraft Type *
                  </Label>
                  <Input
                    id="aircraft_type"
                    value={newAircraftData.aircraft_type}
                    onChange={(e) =>
                      setNewAircraftData({ ...newAircraftData, aircraft_type: e.target.value })
                    }
                    className="col-span-3"
                    placeholder="e.g., Cessna 172"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="fuel_type" className="text-right">
                    Fuel Type *
                  </Label>
                  <Select
                    value={newAircraftData.fuel_type}
                    onValueChange={(value) =>
                      setNewAircraftData({ ...newAircraftData, fuel_type: value })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Jet A">Jet A</SelectItem>
                      <SelectItem value="100LL">100LL</SelectItem>
                      <SelectItem value="Avgas">Avgas</SelectItem>
                      <SelectItem value="Jet A-1">Jet A-1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="customer_id" className="text-right">
                    Customer ID
                  </Label>
                  <Input
                    id="customer_id"
                    type="number"
                    value={newAircraftData.customer_id || ""}
                    onChange={(e) =>
                      setNewAircraftData({
                        ...newAircraftData,
                        customer_id: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    className="col-span-3"
                    placeholder="Optional customer ID"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAircraftSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Aircraft"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="mb-4">
          <Input
            placeholder="Search aircraft by tail number, manufacturer, or model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

                 <Card>
           <CardHeader>
             <div className="flex items-center justify-between">
               <div>
                 <CardTitle className="flex items-center gap-2">
                   <Plane className="h-6 w-6" />
                   Aircraft Management
                 </CardTitle>
                 <CardDescription>
                   Manage aircraft records, including tail numbers, types, and fuel preferences.
                 </CardDescription>
               </div>
             </div>
           </CardHeader>
           <CardContent>
             {/* Search and Filter Controls */}
             <div className="flex gap-4 mb-6">
               <div className="flex-1">
                 <div className="relative">
                   <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                   <Input
                     placeholder="Search by tail number..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="pl-8"
                   />
                 </div>
               </div>
               <Select
                 value={fuelTypeFilter}
                 onValueChange={(value) => setFuelTypeFilter(value === "all" ? "" : value)}
               >
                 <SelectTrigger className="w-40">
                   <SelectValue placeholder="Fuel type" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All fuel types</SelectItem>
                   {uniqueFuelTypes.map((fuelType) => (
                     <SelectItem key={fuelType} value={fuelType}>
                       {fuelType}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>

             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Tail Number</TableHead>
                   <TableHead>Aircraft Type</TableHead>
                   <TableHead>Fuel Type</TableHead>
                   <TableHead>Customer</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead className="w-[100px]">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody data-testid="aircraft-list">
                 {filteredAircraft.map((aircraft) => (
                   <TableRow key={aircraft.id}>
                     <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
                     <TableCell>{aircraft.type}</TableCell>
                     <TableCell>{aircraft.preferredFuelType}</TableCell>
                     <TableCell>
                       {aircraft.customer_id ? `Customer ID: ${aircraft.customer_id}` : "N/A"}
                     </TableCell>
                     <TableCell>
                       <span
                         className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                           aircraft.status === "active"
                             ? "bg-green-100 text-green-800"
                             : aircraft.status === "maintenance"
                             ? "bg-yellow-100 text-yellow-800"
                             : "bg-gray-100 text-gray-800"
                         }`}
                       >
                         {aircraft.status}
                       </span>
                     </TableCell>
                     <TableCell>
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button variant="ghost" className="h-8 w-8 p-0">
                             <MoreHorizontal className="h-4 w-4" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => handleEditClick(aircraft)}>
                             <Edit2 className="h-4 w-4 mr-2" />
                             Edit
                           </DropdownMenuItem>
                           <DropdownMenuItem
                             onClick={() => handleDeleteClick(aircraft)}
                             className="text-red-600"
                           >
                             <Trash2 className="h-4 w-4 mr-2" />
                             Delete
                           </DropdownMenuItem>
                         </DropdownMenuContent>
                       </DropdownMenu>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>

             {filteredAircraft.length === 0 && !isLoading && (
               <div className="text-center py-8 text-muted-foreground">
                 {searchTerm || fuelTypeFilter
                   ? "No aircraft found matching your filters."
                   : "No aircraft found. Add your first aircraft to get started."}
               </div>
             )}
           </CardContent>
         </Card>

         {/* Edit Aircraft Dialog */}
         <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
           setIsEditDialogOpen(open)
           if (!open) resetEditForm()
         }}>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Edit Aircraft</DialogTitle>
               <DialogDescription>
                 Update aircraft information. Tail number cannot be changed.
               </DialogDescription>
             </DialogHeader>
             <div className="grid gap-4 py-4">
               {editFormError && (
                 <div className="flex items-center gap-2 text-red-600 text-sm">
                   <AlertCircle className="h-4 w-4" />
                   {editFormError}
                 </div>
               )}
               <div className="grid grid-cols-4 items-center gap-4">
                 <Label htmlFor="edit_tail_number" className="text-right">
                   Tail Number
                 </Label>
                 <Input
                   id="edit_tail_number"
                   value={selectedAircraft?.tailNumber || ""}
                   disabled
                   className="col-span-3"
                 />
               </div>
               <div className="grid grid-cols-4 items-center gap-4">
                 <Label htmlFor="edit_aircraft_type" className="text-right">
                   Aircraft Type *
                 </Label>
                 <Input
                   id="edit_aircraft_type"
                   value={editAircraftData.aircraft_type || ""}
                   onChange={(e) =>
                     setEditAircraftData({ ...editAircraftData, aircraft_type: e.target.value })
                   }
                   className="col-span-3"
                 />
               </div>
               <div className="grid grid-cols-4 items-center gap-4">
                 <Label htmlFor="edit_fuel_type" className="text-right">
                   Fuel Type *
                 </Label>
                 <Select
                   value={editAircraftData.fuel_type || ""}
                   onValueChange={(value) =>
                     setEditAircraftData({ ...editAircraftData, fuel_type: value })
                   }
                 >
                   <SelectTrigger className="col-span-3">
                     <SelectValue placeholder="Select fuel type" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="Jet A">Jet A</SelectItem>
                     <SelectItem value="100LL">100LL</SelectItem>
                     <SelectItem value="Avgas">Avgas</SelectItem>
                     <SelectItem value="Jet A-1">Jet A-1</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div className="grid grid-cols-4 items-center gap-4">
                 <Label htmlFor="edit_customer_id" className="text-right">
                   Customer ID
                 </Label>
                 <Input
                   id="edit_customer_id"
                   type="number"
                   value={editAircraftData.customer_id || ""}
                   onChange={(e) =>
                     setEditAircraftData({
                       ...editAircraftData,
                       customer_id: e.target.value ? parseInt(e.target.value) : undefined,
                     })
                   }
                   className="col-span-3"
                 />
               </div>
             </div>
             <DialogFooter>
               <Button type="submit" onClick={handleEditAircraftSubmit} disabled={isSubmitting}>
                 {isSubmitting ? (
                   <>
                     <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                     Updating...
                   </>
                 ) : (
                   "Update Aircraft"
                 )}
               </Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>
      </div>

      {/* Delete Aircraft Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        setIsDeleteDialogOpen(open)
        if (!open) resetDeleteState()
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Aircraft</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete aircraft {selectedAircraft?.tailNumber}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              {deleteError}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAircraft}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeletingAircraft}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingAircraft ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  )
} 