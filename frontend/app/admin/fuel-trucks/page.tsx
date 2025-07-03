"use client"

import React, { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Truck,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Fuel,
  Loader2,
} from "lucide-react"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import {
  getAllFuelTrucks,
  createFuelTruck,
  updateFuelTruck,
  deleteFuelTruck,
  type FuelTruck,
  type FuelTruckCreateRequest,
  type FuelTruckUpdateRequest,
} from "../../services/fuel-truck-service"
import { toast } from "sonner"

const FUEL_TYPES = ["Jet A", "Jet A-1", "Avgas 100LL", "Diesel"]

const truckFormSchema = z.object({
  truck_number: z.string().min(1, { message: "Truck number is required." }),
  fuel_type: z.string(),
  capacity: z.coerce.number().positive({ message: "Capacity must be a positive number." }),
  current_meter_reading: z.coerce.number().min(0),
})

type EditTruckData = {
  id: number
  truck_number?: string
  fuel_type?: string
  capacity?: number
  current_meter_reading?: number
  is_active?: boolean
}

export default function FuelTruckManagementPage() {
  const [trucks, setTrucks] = useState<FuelTruck[]>([])
  const [filteredTrucks, setFilteredTrucks] = useState<FuelTruck[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [fuelTypeFilter, setFuelTypeFilter] = useState("all")

  const [isLoadingPage, setIsLoadingPage] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [selectedTruck, setSelectedTruck] = useState<FuelTruck | null>(null)
  const [formError, setFormError] = useState<string | null>(null) // Used for delete dialog errors

  const form = useForm<z.infer<typeof truckFormSchema>>({
    resolver: zodResolver(truckFormSchema),
    defaultValues: {
      truck_number: "",
      fuel_type: "Jet A",
      capacity: 5000,
      current_meter_reading: 0,
    },
  })

  const [editTruckData, setEditTruckData] = useState<Partial<EditTruckData>>({})

  const fetchTrucks = async () => {
    setIsLoadingPage(true)
    try {
      const data = await getAllFuelTrucks()
      setTrucks(data)
    } catch (error) {
      console.error("Failed to fetch fuel trucks:", error)
      toast.error("Failed to load fuel trucks.")
    } finally {
      setIsLoadingPage(false)
    }
  }

  useEffect(() => {
    fetchTrucks()
  }, [])

  useEffect(() => {
    let currentFilteredTrucks = trucks

    if (searchTerm) {
      currentFilteredTrucks = currentFilteredTrucks.filter((truck) =>
        truck.truck_number.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      const isActive = statusFilter === "active"
      currentFilteredTrucks = currentFilteredTrucks.filter((truck) => truck.is_active === isActive)
    }

    if (fuelTypeFilter !== "all") {
      currentFilteredTrucks = currentFilteredTrucks.filter((truck) => truck.fuel_type === fuelTypeFilter)
    }

    setFilteredTrucks(currentFilteredTrucks)
  }, [trucks, searchTerm, statusFilter, fuelTypeFilter])

  const handleCreateSubmit = async (values: z.infer<typeof truckFormSchema>) => {
    setIsSubmitting(true)
    try {
      await createFuelTruck(values)
      toast.success("Fuel truck created successfully!")
      fetchTrucks()
      setIsCreateDialogOpen(false)
      form.reset()
    } catch (error: any) {
      toast.error(`Failed to create truck: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditSubmit = async () => {
    if (!selectedTruck || !editTruckData.id) {
      setFormError("No truck selected for editing.")
      return
    }
    setFormError(null)
    if (editTruckData.truck_number && !editTruckData.truck_number.trim()) {
      setFormError("Truck number cannot be empty.")
      return
    }
    if (editTruckData.capacity !== undefined && editTruckData.capacity <= 0) {
      setFormError("Capacity must be a positive number.")
      return
    }

    setIsSubmitting(true)
    try {
      const { id, ...payload } = editTruckData as EditTruckData
      await updateFuelTruck(selectedTruck.id, payload)
      toast.success("Fuel truck updated successfully!")
      await fetchTrucks()
      setIsEditDialogOpen(false)
    } catch (error: any) {
      console.error("Failed to update fuel truck:", error)
      setFormError(error.message || "Failed to update fuel truck.")
      toast.error(error.message || "Failed to update fuel truck.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedTruck) {
      setFormError("No truck selected for deletion.")
      return
    }
    setIsDeleting(true)
    setFormError(null)
    try {
      await deleteFuelTruck(selectedTruck.id)
      toast.success("Fuel truck deleted successfully!")
      await fetchTrucks()
      setIsDeleteDialogOpen(false)
    } catch (error: any) {
      console.error("Failed to delete fuel truck:", error)
      const defaultErrorMsg = "Failed to delete fuel truck."
      if (error.message && (error.message.includes("409") || error.message.toLowerCase().includes("conflict"))) {
        setFormError("Cannot delete truck. It may have associated records or operations.")
        toast.error("Cannot delete truck. It may have associated records or operations.")
      } else {
        setFormError(error.message || defaultErrorMsg)
        toast.error(error.message || defaultErrorMsg)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadgeStyle = (isActive: boolean) => {
    return isActive
      ? "bg-green-100 text-green-800 border-green-300"
      : "bg-red-100 text-red-800 border-red-300"
  }

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />
  }

  if (isLoadingPage) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-lg">Loading fuel trucks...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fuel Truck Management</h1>
          <p className="text-muted-foreground">Monitor and manage fuel truck fleet operations</p>
        </div>
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(isOpen) => {
            setIsCreateDialogOpen(isOpen)
            if (!isOpen) {
              form.reset()
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Add Fuel Truck
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Fuel Truck</DialogTitle>
              <DialogDescription>Register a new fuel truck to the fleet management system.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="grid gap-4 py-4">
                <FormField
                  control={form.control}
                  name="truck_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Truck Number</FormLabel>
                      <FormControl>
                        <Input placeholder="T-101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fuel_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuel Type</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select fuel type" />
                          </SelectTrigger>
                          <SelectContent>
                            {FUEL_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
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
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacity (Gallons)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="5000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="current_meter_reading"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Meter Reading</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Create Truck</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Trucks</CardTitle><Truck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{trucks.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Active Trucks</CardTitle><CheckCircle className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{trucks.filter((t) => t.is_active).length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Inactive Trucks</CardTitle><AlertTriangle className="h-4 w-4 text-red-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{trucks.filter((t) => !t.is_active).length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Avg. Fuel Level</CardTitle><Fuel className="h-4 w-4 text-blue-600" /></CardHeader><CardContent>
            <div className="text-2xl font-bold">
              {trucks.length > 0 ? Math.round(trucks.reduce((acc, truck) => acc + (truck.capacity > 0 ? (truck.current_meter_reading / truck.capacity) * 100 : 0), 0) / trucks.filter(t => t.capacity > 0).length) : 0}%
            </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by truck number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={(value: "all" | "active" | "inactive") => setStatusFilter(value)}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
            <Select value={fuelTypeFilter} onValueChange={setFuelTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Filter by fuel type" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Fuel Types</SelectItem>{FUEL_TYPES.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" />Fuel Trucks ({filteredTrucks.length})</CardTitle><CardDescription>Monitor fuel truck status, capacity, and meter readings.</CardDescription></CardHeader>
        <CardContent>
          <Table data-testid="fuel-truck-list">
            <TableHeader><TableRow><TableHead>Truck Number</TableHead><TableHead>Fuel Type</TableHead><TableHead>Fuel Level (Meter)</TableHead><TableHead>Status</TableHead><TableHead>Created At</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredTrucks.map((truck) => {
                const fuelPercentage = truck.capacity > 0 ? (truck.current_meter_reading / truck.capacity) * 100 : 0
                return (
                  <TableRow key={truck.id}>
                    <TableCell><div><div className="font-medium">{truck.truck_number}</div><div className="text-sm text-muted-foreground">{truck.capacity.toLocaleString()} gal capacity</div></div></TableCell>
                    <TableCell><Badge variant="outline">{truck.fuel_type}</Badge></TableCell>
                    <TableCell><div className="space-y-1"><div className="flex items-center justify-between text-sm"><span>{truck.current_meter_reading.toLocaleString()} gal</span><span>{Math.round(fuelPercentage)}%</span></div><Progress value={fuelPercentage} className="h-2" /></div></TableCell>
                    <TableCell><Badge className={getStatusBadgeStyle(truck.is_active)}><div className="flex items-center gap-1">{getStatusIcon(truck.is_active)}{truck.is_active ? "Active" : "Inactive"}</div></Badge></TableCell>
                    <TableCell>{truck.created_at ? new Date(truck.created_at).toLocaleDateString() : "N/A"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => { 
                            setSelectedTruck(truck); 
                            setEditTruckData({ 
                              id: truck.id,
                              truck_number: truck.truck_number,
                              fuel_type: truck.fuel_type,
                              capacity: truck.capacity,
                              current_meter_reading: truck.current_meter_reading,
                              is_active: truck.is_active
                            }); 
                            setIsEditDialogOpen(true); 
                            setFormError(null);
                          }}>
                            <Edit className="mr-2 h-4 w-4" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive hover:text-destructive-foreground! hover:bg-destructive!" onClick={() => { setSelectedTruck(truck); setIsDeleteDialogOpen(true); setFormError(null);}}>
                            <Trash2 className="mr-2 h-4 w-4" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => { setIsEditDialogOpen(isOpen); if (!isOpen) { setEditTruckData({}); setSelectedTruck(null); setFormError(null); }}}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Edit Fuel Truck</DialogTitle><DialogDescription>Update fuel truck information and status.</DialogDescription></DialogHeader>
          {selectedTruck && editTruckData && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><Label htmlFor="truck_number-edit">Truck Number</Label><Input id="truck_number-edit" value={editTruckData.truck_number || ""} onChange={(e) => setEditTruckData({ ...editTruckData, truck_number: e.target.value })} disabled={isSubmitting} /></div>
              <div className="grid gap-2"><Label htmlFor="fuel_type-edit">Fuel Type</Label>
                <Select value={editTruckData.fuel_type || ""} onValueChange={(value) => setEditTruckData({ ...editTruckData, fuel_type: value })} disabled={isSubmitting}>
                  <SelectTrigger id="fuel_type-edit"><SelectValue placeholder="Select fuel type" /></SelectTrigger>
                  <SelectContent>{FUEL_TYPES.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label htmlFor="capacity-edit">Capacity (Gallons)</Label><Input id="capacity-edit" type="number" value={editTruckData.capacity || 0} onChange={(e) => setEditTruckData({ ...editTruckData, capacity: Number.parseInt(e.target.value) || 0 })} disabled={isSubmitting} /></div>
              <div className="grid gap-2"><Label htmlFor="current_meter_reading-edit">Current Meter Reading</Label><Input id="current_meter_reading-edit" type="number" value={editTruckData.current_meter_reading || 0} onChange={(e) => setEditTruckData({ ...editTruckData, current_meter_reading: Number.parseInt(e.target.value) || 0})} disabled={isSubmitting} /></div>
              <div className="grid gap-2"><Label htmlFor="is_active-edit" className="flex items-center justify-between w-full"><span>Status</span><Switch id="is_active-edit" checked={editTruckData.is_active} onCheckedChange={(checked) => setEditTruckData({ ...editTruckData, is_active: checked })} disabled={isSubmitting} /></Label></div>
              {formError && (<div className="text-sm text-red-500 p-2 bg-red-50 border border-red-200 rounded-md">{formError}</div>)}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="button" onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={(isOpen) => { setIsDeleteDialogOpen(isOpen); if (!isOpen) { setSelectedTruck(null); setFormError(null); }}}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Delete</DialogTitle><DialogDescription>Are you sure you want to delete truck {selectedTruck?.truck_number}? This action cannot be undone.</DialogDescription></DialogHeader>
          {formError && (<div className="text-sm text-red-500 p-2 bg-red-50 border border-red-200 rounded-md my-2">{formError}</div>)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
