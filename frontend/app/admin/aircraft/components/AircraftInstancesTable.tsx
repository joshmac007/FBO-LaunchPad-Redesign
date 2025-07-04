"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  ArrowRight,
} from "lucide-react"
import {
  getAllAdminAircraft,
  createAdminAircraft,
  updateAdminAircraft,
  deleteAdminAircraft,
  getAircraftTypes,
  type Aircraft,
  type AdminAircraftCreateRequest,
  type AdminAircraftUpdateRequest,
  type AircraftType,
} from "../../../services/aircraft-service"
import { toast } from "sonner"
import { getFuelTypes, type FuelType } from "../../../services/admin-fee-config-service"

export default function AircraftInstancesTable() {
  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  const [filteredAircraft, setFilteredAircraft] = useState<Aircraft[]>([])
  const [aircraftTypes, setAircraftTypes] = useState<AircraftType[]>([])
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null)
  const [dialogView, setDialogView] = useState<'confirm' | 'error'>('confirm')

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

  const router = useRouter()

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

  // Fetch aircraft types for dropdowns
  const fetchAircraftTypes = async () => {
    try {
      const fetchedTypes = await getAircraftTypes()
      setAircraftTypes(fetchedTypes)
    } catch (err) {
      console.error("Error fetching aircraft types:", err)
      // Don't set error state for aircraft types, just log it
    }
  }

  // Fetch fuel types for dropdowns
  const fetchFuelTypes = async () => {
    try {
      const response = await getFuelTypes()
      setFuelTypes(response.fuel_types)
    } catch (err) {
      console.error("Error fetching fuel types:", err)
      // Don't set error state for fuel types, just log it
    }
  }

  useEffect(() => {
    fetchAircraft()
    fetchAircraftTypes()
    fetchFuelTypes()
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
      filtered = filtered.filter((ac) => ac.fuelType === fuelTypeFilter)
    }

    setFilteredAircraft(filtered)
  }, [aircraft, searchTerm, fuelTypeFilter])

  const handleEditClick = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft)
    setEditAircraftData({
      aircraft_type: aircraft.aircraftType,
      fuel_type: aircraft.fuelType,
      customer_id: aircraft.customerId,
    })
    setEditFormError(null)
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft)
    setDialogView('confirm')
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
      setDialogView('error')
      return
    }
    setDeleteError(null)
    setIsDeletingAircraft(true)

    try {
      await deleteAdminAircraft(selectedAircraft.tailNumber)
      toast.success("Aircraft deleted successfully!")
      await fetchAircraft()
      setIsDeleteDialogOpen(false)
    } catch (error: any) {
      console.error("Failed to delete aircraft:", error)
      setDeleteError(error.message || "An unknown error occurred. Please try again.")
      setDialogView('error')
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
    setDialogView('confirm')
  }

  const navigateToFuelOrders = () => {
    if (selectedAircraft) {
      setIsDeleteDialogOpen(false)
      router.push(`/csr/fuel-orders?tailNumber=${selectedAircraft.tailNumber}`)
    }
  }

  // Get unique fuel types for filter
  const uniqueFuelTypes = Array.from(new Set(aircraft.map((ac) => ac.fuelType)))

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-6 w-6" />
                Aircraft Instances
              </CardTitle>
              <CardDescription>
                Manage specific aircraft, their fuel types, and customer assignments.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-6 w-6" />
              Aircraft Instances
            </CardTitle>
            <CardDescription>
              Manage specific aircraft, their fuel types, and customer assignments.
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open)
            if (!open) resetCreateForm()
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => resetCreateForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Instance
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
                  <Select
                    value={newAircraftData.aircraft_type}
                    onValueChange={(value) =>
                      setNewAircraftData({ ...newAircraftData, aircraft_type: value })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select aircraft type" />
                    </SelectTrigger>
                    <SelectContent>
                      {aircraftTypes.map((type) => (
                        <SelectItem key={type.id} value={type.name}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      {fuelTypes.map((fuelType) => (
                        <SelectItem key={fuelType.id} value={fuelType.name}>
                          {fuelType.name}
                        </SelectItem>
                      ))}
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
              <DialogFooter>
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
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

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
                <TableCell>{aircraft.aircraftType}</TableCell>
                <TableCell>{aircraft.fuelType}</TableCell>
                <TableCell>
                  {aircraft.customerId ? `Customer ID: ${aircraft.customerId}` : "N/A"}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
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
              <Select
                value={editAircraftData.aircraft_type || ""}
                onValueChange={(value) =>
                  setEditAircraftData({ ...editAircraftData, aircraft_type: value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select aircraft type" />
                </SelectTrigger>
                <SelectContent>
                  {aircraftTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  {fuelTypes.map((fuelType) => (
                    <SelectItem key={fuelType.id} value={fuelType.name}>
                      {fuelType.name}
                    </SelectItem>
                  ))}
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
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditAircraftSubmit} disabled={isSubmitting}>
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

      {/* Delete Aircraft Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        setIsDeleteDialogOpen(open)
        if (!open) resetDeleteState()
      }}>
        <AlertDialogContent>
          {dialogView === 'confirm' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  aircraft with tail number <strong>{selectedAircraft?.tailNumber}</strong>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button
                    onClick={async (e) => {
                      e.preventDefault(); // Prevents the dialog from closing on click
                      await handleConfirmDelete();
                    }}
                    disabled={isDeletingAircraft}
                  >
                    {isDeletingAircraft ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...</>
                    ) : 'Delete'}
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}

          {dialogView === 'error' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Cannot Delete Aircraft</AlertDialogTitle>
                <AlertDialogDescription>
                  This aircraft cannot be deleted because it is associated with one or more fuel orders.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 my-4 rounded" role="alert">
                <div className="flex">
                  <div className="py-1"><AlertCircle className="h-5 w-5 text-red-500 mr-3"/></div>
                  <div>
                    <p className="font-bold">Conflict Error</p>
                    <p className="text-sm">{deleteError}</p>
                  </div>
                </div>
              </div>
              <AlertDialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Close</Button>
                <Button onClick={navigateToFuelOrders}>
                  View Fuel Orders <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}