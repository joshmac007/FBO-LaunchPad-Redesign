"use client"

import { useState, useEffect } from "react"
import {
  Truck,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Wrench,
  CheckCircle,
  AlertTriangle,
  Fuel,
} from "lucide-react"
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
import { Progress } from "@/components/ui/progress"

interface FuelTruck {
  id: string
  truckNumber: string
  fuelType: string
  capacity: number
  currentLevel: number
  status: "operational" | "maintenance" | "out_of_service"
  lastMaintenance: string
  nextMaintenance: string
  assignedLST?: string
  location: string
  createdAt: string
}

export default function FuelTruckManagement() {
  const [trucks, setTrucks] = useState<FuelTruck[]>([])
  const [filteredTrucks, setFilteredTrucks] = useState<FuelTruck[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [fuelTypeFilter, setFuelTypeFilter] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedTruck, setSelectedTruck] = useState<FuelTruck | null>(null)

  const [newTruck, setNewTruck] = useState({
    truckNumber: "",
    fuelType: "Jet A",
    capacity: 5000,
    currentLevel: 0,
    status: "operational" as const,
    location: "Hangar 1",
  })

  const fuelTypes = ["Jet A", "Jet A-1", "Avgas 100LL", "Diesel"]
  const locations = ["Hangar 1", "Hangar 2", "Fuel Farm", "Maintenance Bay", "Ramp A", "Ramp B"]

  useEffect(() => {
    // Load trucks from localStorage
    const storedTrucks = localStorage.getItem("fboFuelTrucks")
    if (storedTrucks) {
      const parsedTrucks = JSON.parse(storedTrucks)
      setTrucks(parsedTrucks)
      setFilteredTrucks(parsedTrucks)
    } else {
      // Initialize with mock data
      const mockTrucks: FuelTruck[] = [
        {
          id: "1",
          truckNumber: "FT-001",
          fuelType: "Jet A",
          capacity: 5000,
          currentLevel: 3500,
          status: "operational",
          lastMaintenance: "2024-01-01T00:00:00Z",
          nextMaintenance: "2024-04-01T00:00:00Z",
          assignedLST: "John Smith",
          location: "Ramp A",
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "2",
          truckNumber: "FT-002",
          fuelType: "Avgas 100LL",
          capacity: 3000,
          currentLevel: 2200,
          status: "operational",
          lastMaintenance: "2024-01-05T00:00:00Z",
          nextMaintenance: "2024-04-05T00:00:00Z",
          assignedLST: "Sarah Johnson",
          location: "Hangar 1",
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "3",
          truckNumber: "FT-003",
          fuelType: "Jet A-1",
          capacity: 7000,
          currentLevel: 6000,
          status: "maintenance",
          lastMaintenance: "2024-01-10T00:00:00Z",
          nextMaintenance: "2024-04-10T00:00:00Z",
          location: "Maintenance Bay",
          createdAt: "2024-01-01T00:00:00Z",
        },
      ]
      setTrucks(mockTrucks)
      setFilteredTrucks(mockTrucks)
      localStorage.setItem("fboFuelTrucks", JSON.stringify(mockTrucks))
    }
  }, [])

  useEffect(() => {
    let filtered = trucks

    if (searchTerm) {
      filtered = filtered.filter(
        (truck) =>
          truck.truckNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          truck.assignedLST?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((truck) => truck.status === statusFilter)
    }

    if (fuelTypeFilter !== "all") {
      filtered = filtered.filter((truck) => truck.fuelType === fuelTypeFilter)
    }

    setFilteredTrucks(filtered)
  }, [trucks, searchTerm, statusFilter, fuelTypeFilter])

  const handleCreateTruck = () => {
    const truck: FuelTruck = {
      id: Date.now().toString(),
      ...newTruck,
      lastMaintenance: new Date().toISOString(),
      nextMaintenance: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
      createdAt: new Date().toISOString(),
    }

    const updatedTrucks = [...trucks, truck]
    setTrucks(updatedTrucks)
    localStorage.setItem("fboFuelTrucks", JSON.stringify(updatedTrucks))

    setNewTruck({
      truckNumber: "",
      fuelType: "Jet A",
      capacity: 5000,
      currentLevel: 0,
      status: "operational",
      location: "Hangar 1",
    })
    setIsCreateDialogOpen(false)
  }

  const handleEditTruck = () => {
    if (!selectedTruck) return

    const updatedTrucks = trucks.map((truck) => (truck.id === selectedTruck.id ? { ...selectedTruck } : truck))
    setTrucks(updatedTrucks)
    localStorage.setItem("fboFuelTrucks", JSON.stringify(updatedTrucks))
    setIsEditDialogOpen(false)
    setSelectedTruck(null)
  }

  const handleDeleteTruck = (truckId: string) => {
    const updatedTrucks = trucks.filter((truck) => truck.id !== truckId)
    setTrucks(updatedTrucks)
    localStorage.setItem("fboFuelTrucks", JSON.stringify(updatedTrucks))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "bg-green-100 text-green-800"
      case "maintenance":
        return "bg-yellow-100 text-yellow-800"
      case "out_of_service":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "operational":
        return <CheckCircle className="h-4 w-4" />
      case "maintenance":
        return <Wrench className="h-4 w-4" />
      case "out_of_service":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return null
    }
  }

  const getFuelLevelColor = (percentage: number) => {
    if (percentage > 70) return "bg-green-500"
    if (percentage > 30) return "bg-yellow-500"
    return "bg-red-500"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fuel Truck Management</h1>
          <p className="text-muted-foreground">Monitor and manage fuel truck fleet operations</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Fuel Truck
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Fuel Truck</DialogTitle>
              <DialogDescription>Register a new fuel truck to the fleet management system.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="truckNumber">Truck Number</Label>
                <Input
                  id="truckNumber"
                  value={newTruck.truckNumber}
                  onChange={(e) => setNewTruck({ ...newTruck, truckNumber: e.target.value })}
                  placeholder="FT-001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fuelType">Fuel Type</Label>
                <Select
                  value={newTruck.fuelType}
                  onValueChange={(value) => setNewTruck({ ...newTruck, fuelType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fuelTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="capacity">Capacity (Gallons)</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={newTruck.capacity}
                  onChange={(e) => setNewTruck({ ...newTruck, capacity: Number.parseInt(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currentLevel">Current Fuel Level (Gallons)</Label>
                <Input
                  id="currentLevel"
                  type="number"
                  value={newTruck.currentLevel}
                  onChange={(e) => setNewTruck({ ...newTruck, currentLevel: Number.parseInt(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Select
                  value={newTruck.location}
                  onValueChange={(value) => setNewTruck({ ...newTruck, location: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCreateTruck}>
                Add Truck
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trucks</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trucks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Operational</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trucks.filter((t) => t.status === "operational").length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trucks.filter((t) => t.status === "maintenance").length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Fuel Level</CardTitle>
            <Fuel className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trucks.length > 0
                ? Math.round(
                    trucks.reduce((acc, truck) => acc + (truck.currentLevel / truck.capacity) * 100, 0) / trucks.length,
                  )
                : 0}
              %
            </div>
          </CardContent>
        </Card>
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
                placeholder="Search by truck number or assigned LST..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="out_of_service">Out of Service</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fuelTypeFilter} onValueChange={setFuelTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by fuel type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fuel Types</SelectItem>
                {fuelTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Trucks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Fuel Trucks ({filteredTrucks.length})
          </CardTitle>
          <CardDescription>Monitor fuel truck status, capacity, and assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Truck</TableHead>
                <TableHead>Fuel Type</TableHead>
                <TableHead>Fuel Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned LST</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrucks.map((truck) => {
                const fuelPercentage = (truck.currentLevel / truck.capacity) * 100
                return (
                  <TableRow key={truck.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{truck.truckNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          {truck.capacity.toLocaleString()} gal capacity
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{truck.fuelType}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{truck.currentLevel.toLocaleString()} gal</span>
                          <span>{Math.round(fuelPercentage)}%</span>
                        </div>
                        <Progress value={fuelPercentage} className="h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(truck.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(truck.status)}
                          {truck.status.replace("_", " ")}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>{truck.assignedLST || "Unassigned"}</TableCell>
                    <TableCell>{truck.location}</TableCell>
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
                            onClick={() => {
                              setSelectedTruck(truck)
                              setIsEditDialogOpen(true)
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Wrench className="mr-2 h-4 w-4" />
                            Schedule Maintenance
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Fuel className="mr-2 h-4 w-4" />
                            Refuel
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTruck(truck.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
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

      {/* Edit Truck Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Fuel Truck</DialogTitle>
            <DialogDescription>Update fuel truck information and status.</DialogDescription>
          </DialogHeader>
          {selectedTruck && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-truckNumber">Truck Number</Label>
                <Input
                  id="edit-truckNumber"
                  value={selectedTruck.truckNumber}
                  onChange={(e) => setSelectedTruck({ ...selectedTruck, truckNumber: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-fuelType">Fuel Type</Label>
                <Select
                  value={selectedTruck.fuelType}
                  onValueChange={(value) => setSelectedTruck({ ...selectedTruck, fuelType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fuelTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-capacity">Capacity (Gallons)</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  value={selectedTruck.capacity}
                  onChange={(e) => setSelectedTruck({ ...selectedTruck, capacity: Number.parseInt(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-currentLevel">Current Fuel Level (Gallons)</Label>
                <Input
                  id="edit-currentLevel"
                  type="number"
                  value={selectedTruck.currentLevel}
                  onChange={(e) =>
                    setSelectedTruck({ ...selectedTruck, currentLevel: Number.parseInt(e.target.value) })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={selectedTruck.status}
                  onValueChange={(value: "operational" | "maintenance" | "out_of_service") =>
                    setSelectedTruck({ ...selectedTruck, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Operational</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="out_of_service">Out of Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-location">Location</Label>
                <Select
                  value={selectedTruck.location}
                  onValueChange={(value) => setSelectedTruck({ ...selectedTruck, location: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleEditTruck}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
