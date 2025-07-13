"use client"

import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Settings,
  MoreHorizontal,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  Plus,
} from "lucide-react"
import {
  getAircraftTypes,
  createAircraftType,
  updateAircraftType,
  deleteAircraftType,
  type AircraftType,
  type AircraftTypeCreateRequest,
  type AircraftTypeUpdateRequest,
} from "../../../services/aircraft-service"
import { toast } from "sonner"
import { getAircraftClassifications } from "../../../services/admin-fee-config-service"

export default function AircraftTypesTable() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedAircraftType, setSelectedAircraftType] = useState<AircraftType | null>(null)
  const [dialogView, setDialogView] = useState<'confirm' | 'error'>('confirm')

  const [newAircraftTypeData, setNewAircraftTypeData] = useState<AircraftTypeCreateRequest>({
    name: "",
    base_min_fuel_gallons_for_waiver: 0,
    classification_id: 0,
  })

  const [editAircraftTypeData, setEditAircraftTypeData] = useState<AircraftTypeUpdateRequest>({})
  const [createFormError, setCreateFormError] = useState<string | null>(null)
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const queryClient = useQueryClient()

  // Data fetching with react-query
  const {
    data: aircraftTypes = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['aircraftTypes'],
    queryFn: getAircraftTypes,
  })

  const { data: classifications = [], isLoading: isLoadingClassifications } = useQuery({
    queryKey: ["aircraftClassifications"],
    queryFn: getAircraftClassifications,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createAircraftType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aircraftTypes'] })
      toast.success("Aircraft type created successfully!")
      setIsCreateDialogOpen(false)
      resetCreateForm()
    },
    onError: (error: any) => {
      console.error("Failed to create aircraft type:", error)
      setCreateFormError(error.message || "An unknown error occurred. Please try again.")
      toast.error(error.message || "Failed to create aircraft type.")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ typeId, data }: { typeId: number; data: AircraftTypeUpdateRequest }) =>
      updateAircraftType(typeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aircraftTypes'] })
      toast.success("Aircraft type updated successfully!")
      setIsEditDialogOpen(false)
      resetEditForm()
    },
    onError: (error: any) => {
      console.error("Failed to update aircraft type:", error)
      setEditFormError(error.message || "An unknown error occurred. Please try again.")
      toast.error(error.message || "Failed to update aircraft type.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAircraftType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aircraftTypes'] })
      toast.success("Aircraft type deleted successfully!")
      setIsDeleteDialogOpen(false)
      resetDeleteState()
    },
    onError: (error: any) => {
      console.error("Failed to delete aircraft type:", error)
      setDeleteError(error.message || "An unknown error occurred. Please try again.")
      setDialogView('error')
    },
  })

  const handleEditClick = (aircraftType: AircraftType) => {
    setSelectedAircraftType(aircraftType)
    setEditAircraftTypeData({
      name: aircraftType.name,
      base_min_fuel_gallons_for_waiver: aircraftType.base_min_fuel_gallons_for_waiver,
      classification_id: aircraftType.classification_id,
    })
    setEditFormError(null)
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (aircraftType: AircraftType) => {
    setSelectedAircraftType(aircraftType)
    setDialogView('confirm')
    setDeleteError(null)
    setIsDeleteDialogOpen(true)
  }

  const handleCreateAircraftTypeSubmit = async () => {
    setCreateFormError(null)

    // Basic client-side validation
    if (!newAircraftTypeData.name.trim()) {
      setCreateFormError("Aircraft type name is required.")
      return
    }
    if (newAircraftTypeData.base_min_fuel_gallons_for_waiver <= 0) {
      setCreateFormError("Base minimum fuel for waiver must be greater than 0.")
      return
    }

    const payload: AircraftTypeCreateRequest = {
      name: newAircraftTypeData.name.trim(),
      base_min_fuel_gallons_for_waiver: newAircraftTypeData.base_min_fuel_gallons_for_waiver,
      classification_id: newAircraftTypeData.classification_id,
    }

    createMutation.mutate(payload)
  }

  const handleEditAircraftTypeSubmit = async () => {
    if (!selectedAircraftType) {
      setEditFormError("No aircraft type selected.")
      return
    }
    setEditFormError(null)

    // Basic client-side validation
    if (!editAircraftTypeData.name?.trim()) {
      setEditFormError("Aircraft type name is required.")
      return
    }
    if (editAircraftTypeData.base_min_fuel_gallons_for_waiver !== undefined && 
        editAircraftTypeData.base_min_fuel_gallons_for_waiver <= 0) {
      setEditFormError("Base minimum fuel for waiver must be greater than 0.")
      return
    }

    const payload: AircraftTypeUpdateRequest = {
      name: editAircraftTypeData.name.trim(),
      base_min_fuel_gallons_for_waiver: editAircraftTypeData.base_min_fuel_gallons_for_waiver,
      classification_id: editAircraftTypeData.classification_id,
    }

    updateMutation.mutate({ typeId: selectedAircraftType.id, data: payload })
  }

  const handleConfirmDelete = async () => {
    if (!selectedAircraftType) {
      console.error("No aircraft type selected for deletion.")
      setDeleteError("No aircraft type selected for deletion.")
      setDialogView('error')
      return
    }
    setDeleteError(null)

    deleteMutation.mutate(selectedAircraftType.id)
  }

  const resetCreateForm = () => {
    setNewAircraftTypeData({
      name: "",
      base_min_fuel_gallons_for_waiver: 0,
      classification_id: 0,
    })
    setCreateFormError(null)
  }

  const resetEditForm = () => {
    setEditAircraftTypeData({})
    setEditFormError(null)
    setSelectedAircraftType(null)
  }

  const resetDeleteState = () => {
    setDeleteError(null)
    setSelectedAircraftType(null)
    setDialogView('confirm')
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Aircraft Types
          </CardTitle>
          <CardDescription>
            Manage the master list of aircraft models and their default properties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Aircraft Types
          </CardTitle>
          <CardDescription>
            Manage the master list of aircraft models and their default properties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Failed to load aircraft types: {error instanceof Error ? error.message : 'Unknown error'}
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
              <Settings className="h-6 w-6" />
              Aircraft Types
            </CardTitle>
            <CardDescription>
              Manage the master list of aircraft models and their default properties.
            </CardDescription>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open)
            if (!open) resetCreateForm()
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => resetCreateForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Aircraft Type</DialogTitle>
                <DialogDescription>
                  Add a new aircraft type to the master list.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {createFormError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {createFormError}
                  </div>
                )}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type_name" className="text-right">
                    Type Name *
                  </Label>
                  <Input
                    id="type_name"
                    value={newAircraftTypeData.name}
                    onChange={(e) =>
                      setNewAircraftTypeData({ ...newAircraftTypeData, name: e.target.value })
                    }
                    className="col-span-3"
                    placeholder="e.g., Gulfstream G650"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="base_min_fuel" className="text-right">
                    Base Min Fuel (Waiver) *
                  </Label>
                  <Input
                    id="base_min_fuel"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={newAircraftTypeData.base_min_fuel_gallons_for_waiver}
                    onChange={(e) =>
                      setNewAircraftTypeData({ 
                        ...newAircraftTypeData, 
                        base_min_fuel_gallons_for_waiver: parseFloat(e.target.value) || 0 
                      })
                    }
                    className="col-span-3"
                    placeholder="e.g., 200.00"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="create-classification" className="text-right">
                    Classification *
                  </Label>
                  <select
                    id="create-classification"
                    className="col-span-3 border rounded px-2 py-1"
                    value={newAircraftTypeData.classification_id}
                    onChange={e => setNewAircraftTypeData({ ...newAircraftTypeData, classification_id: parseInt(e.target.value) })}
                    disabled={isLoadingClassifications}
                  >
                    <option value={0}>Select a classification</option>
                    {classifications.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAircraftTypeSubmit} disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Type"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type Name</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead>Min Fuel for Waiver</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aircraftTypes.map((aircraftType) => (
              <TableRow key={aircraftType.id}>
                <TableCell className="font-medium">{aircraftType.name}</TableCell>
                <TableCell>{aircraftType.classification_name || "Unclassified"}</TableCell>
                <TableCell>
                  {aircraftType.base_min_fuel_gallons_for_waiver != null && !isNaN(aircraftType.base_min_fuel_gallons_for_waiver)
                    ? Math.round(aircraftType.base_min_fuel_gallons_for_waiver)
                    : 'N/A'
                  }
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditClick(aircraftType)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(aircraftType)}
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

        {aircraftTypes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No aircraft types found. Add your first aircraft type to get started.
          </div>
        )}
      </CardContent>

      {/* Edit Aircraft Type Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open)
        if (!open) resetEditForm()
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Aircraft Type</DialogTitle>
            <DialogDescription>
              Update aircraft type information.
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
              <Label htmlFor="edit_type_name" className="text-right">
                Type Name *
              </Label>
              <Input
                id="edit_type_name"
                value={editAircraftTypeData.name || ""}
                onChange={(e) =>
                  setEditAircraftTypeData({ ...editAircraftTypeData, name: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_base_min_fuel" className="text-right">
                Base Min Fuel (Waiver) *
              </Label>
              <Input
                id="edit_base_min_fuel"
                type="number"
                min="0.01"
                step="0.01"
                value={editAircraftTypeData.base_min_fuel_gallons_for_waiver || ""}
                onChange={(e) =>
                  setEditAircraftTypeData({ 
                    ...editAircraftTypeData, 
                    base_min_fuel_gallons_for_waiver: parseFloat(e.target.value) || 0 
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-classification" className="text-right">
                Classification *
              </Label>
              <select
                id="edit-classification"
                className="col-span-3 border rounded px-2 py-1"
                value={editAircraftTypeData.classification_id || 0}
                onChange={e => setEditAircraftTypeData({ ...editAircraftTypeData, classification_id: parseInt(e.target.value) })}
                disabled={isLoadingClassifications}
              >
                <option value={0}>Select a classification</option>
                {classifications.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditAircraftTypeSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Type"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Aircraft Type Confirmation Dialog */}
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
                  aircraft type <strong>{selectedAircraftType?.name}</strong>.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button
                    onClick={async (e) => {
                      e.preventDefault()
                      await handleConfirmDelete()
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
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
                <AlertDialogTitle>Cannot Delete Aircraft Type</AlertDialogTitle>
                <AlertDialogDescription>
                  This aircraft type cannot be deleted because it is being used by one or more aircraft instances.
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
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}