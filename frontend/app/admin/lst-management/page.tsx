"use client"

import { useState, useEffect } from "react"
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Award,
  Clock,
  TrendingUp,
  Star,
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

interface LST {
  id: string
  name: string
  email: string
  employeeId: string
  status: "active" | "inactive" | "on_leave"
  shift: "day" | "night" | "swing"
  certifications: string[]
  performanceRating: number
  ordersCompleted: number
  averageTime: number // in minutes
  lastActive: string
  hireDate: string
}

export default function LSTManagement() {
  const [lsts, setLsts] = useState<LST[]>([])
  const [filteredLsts, setFilteredLsts] = useState<LST[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [shiftFilter, setShiftFilter] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedLst, setSelectedLst] = useState<LST | null>(null)

  const [newLst, setNewLst] = useState({
    name: "",
    email: "",
    employeeId: "",
    status: "active" as const,
    shift: "day" as const,
    certifications: [] as string[],
  })

  const shifts = [
    { value: "day", label: "Day Shift (6AM - 2PM)" },
    { value: "swing", label: "Swing Shift (2PM - 10PM)" },
    { value: "night", label: "Night Shift (10PM - 6AM)" },
  ]

  const availableCertifications = [
    "Fuel Safety",
    "Aircraft Ground Support",
    "Hazmat Handling",
    "Fire Safety",
    "First Aid/CPR",
    "Equipment Operation",
    "Quality Control",
    "Environmental Safety",
  ]

  useEffect(() => {
    // Load LSTs from localStorage
    const storedLsts = localStorage.getItem("fboLSTs")
    if (storedLsts) {
      const parsedLsts = JSON.parse(storedLsts)
      setLsts(parsedLsts)
      setFilteredLsts(parsedLsts)
    } else {
      // Initialize with mock data
      const mockLsts: LST[] = [
        {
          id: "1",
          name: "John Smith",
          email: "john.smith@fbo.com",
          employeeId: "LST001",
          status: "active",
          shift: "day",
          certifications: ["Fuel Safety", "Aircraft Ground Support", "First Aid/CPR"],
          performanceRating: 4.8,
          ordersCompleted: 156,
          averageTime: 18,
          lastActive: "2024-01-15T10:30:00Z",
          hireDate: "2023-06-01T00:00:00Z",
        },
        {
          id: "2",
          name: "Sarah Johnson",
          email: "sarah.johnson@fbo.com",
          employeeId: "LST002",
          status: "active",
          shift: "swing",
          certifications: ["Fuel Safety", "Hazmat Handling", "Equipment Operation"],
          performanceRating: 4.6,
          ordersCompleted: 142,
          averageTime: 20,
          lastActive: "2024-01-15T09:15:00Z",
          hireDate: "2023-08-15T00:00:00Z",
        },
        {
          id: "3",
          name: "Michael Brown",
          email: "michael.brown@fbo.com",
          employeeId: "LST003",
          status: "active",
          shift: "night",
          certifications: ["Fuel Safety", "Fire Safety", "Quality Control"],
          performanceRating: 4.9,
          ordersCompleted: 98,
          averageTime: 16,
          lastActive: "2024-01-15T08:45:00Z",
          hireDate: "2023-04-10T00:00:00Z",
        },
      ]
      setLsts(mockLsts)
      setFilteredLsts(mockLsts)
      localStorage.setItem("fboLSTs", JSON.stringify(mockLsts))
    }
  }, [])

  useEffect(() => {
    let filtered = lsts

    if (searchTerm) {
      filtered = filtered.filter(
        (lst) =>
          lst.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lst.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lst.employeeId.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((lst) => lst.status === statusFilter)
    }

    if (shiftFilter !== "all") {
      filtered = filtered.filter((lst) => lst.shift === shiftFilter)
    }

    setFilteredLsts(filtered)
  }, [lsts, searchTerm, statusFilter, shiftFilter])

  const handleCreateLst = () => {
    const lst: LST = {
      id: Date.now().toString(),
      ...newLst,
      performanceRating: 0,
      ordersCompleted: 0,
      averageTime: 0,
      lastActive: new Date().toISOString(),
      hireDate: new Date().toISOString(),
    }

    const updatedLsts = [...lsts, lst]
    setLsts(updatedLsts)
    localStorage.setItem("fboLSTs", JSON.stringify(updatedLsts))

    setNewLst({
      name: "",
      email: "",
      employeeId: "",
      status: "active",
      shift: "day",
      certifications: [],
    })
    setIsCreateDialogOpen(false)
  }

  const handleEditLst = () => {
    if (!selectedLst) return

    const updatedLsts = lsts.map((lst) => (lst.id === selectedLst.id ? { ...selectedLst } : lst))
    setLsts(updatedLsts)
    localStorage.setItem("fboLSTs", JSON.stringify(updatedLsts))
    setIsEditDialogOpen(false)
    setSelectedLst(null)
  }

  const handleDeleteLst = (lstId: string) => {
    const updatedLsts = lsts.filter((lst) => lst.id !== lstId)
    setLsts(updatedLsts)
    localStorage.setItem("fboLSTs", JSON.stringify(updatedLsts))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "inactive":
        return "bg-red-100 text-red-800"
      case "on_leave":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getShiftColor = (shift: string) => {
    switch (shift) {
      case "day":
        return "bg-blue-100 text-blue-800"
      case "swing":
        return "bg-orange-100 text-orange-800"
      case "night":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPerformanceColor = (rating: number) => {
    if (rating >= 4.5) return "text-green-600"
    if (rating >= 4.0) return "text-yellow-600"
    return "text-red-600"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">LST Management</h1>
          <p className="text-muted-foreground">Manage line service technician profiles and performance</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add LST
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New LST</DialogTitle>
              <DialogDescription>Register a new line service technician to the team.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newLst.name}
                  onChange={(e) => setNewLst({ ...newLst, name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newLst.email}
                  onChange={(e) => setNewLst({ ...newLst, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  value={newLst.employeeId}
                  onChange={(e) => setNewLst({ ...newLst, employeeId: e.target.value })}
                  placeholder="LST001"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shift">Shift</Label>
                <Select
                  value={newLst.shift}
                  onValueChange={(value: "day" | "swing" | "night") => setNewLst({ ...newLst, shift: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.map((shift) => (
                      <SelectItem key={shift.value} value={shift.value}>
                        {shift.label}
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
              <Button type="button" onClick={handleCreateLst}>
                Add LST
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total LSTs</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lsts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active LSTs</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lsts.filter((lst) => lst.status === "active").length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lsts.length > 0
                ? (lsts.reduce((acc, lst) => acc + lst.performanceRating, 0) / lsts.length).toFixed(1)
                : "0.0"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion Time</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lsts.length > 0 ? Math.round(lsts.reduce((acc, lst) => acc + lst.averageTime, 0) / lsts.length) : 0}m
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
                placeholder="Search by name, email, or employee ID..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
            <Select value={shiftFilter} onValueChange={setShiftFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shifts</SelectItem>
                <SelectItem value="day">Day Shift</SelectItem>
                <SelectItem value="swing">Swing Shift</SelectItem>
                <SelectItem value="night">Night Shift</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* LSTs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Line Service Technicians ({filteredLsts.length})
          </CardTitle>
          <CardDescription>Monitor LST performance, certifications, and assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>LST</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Orders Completed</TableHead>
                <TableHead>Avg Time</TableHead>
                <TableHead>Certifications</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLsts.map((lst) => (
                <TableRow key={lst.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{lst.name}</div>
                      <div className="text-sm text-muted-foreground">{lst.employeeId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(lst.status)}>{lst.status.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getShiftColor(lst.shift)}>{lst.shift}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Star className={`h-4 w-4 ${getPerformanceColor(lst.performanceRating)}`} />
                      <span className={getPerformanceColor(lst.performanceRating)}>
                        {lst.performanceRating.toFixed(1)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{lst.ordersCompleted}</TableCell>
                  <TableCell>{lst.averageTime}m</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {lst.certifications.slice(0, 2).map((cert) => (
                        <Badge key={cert} variant="secondary" className="text-xs">
                          {cert}
                        </Badge>
                      ))}
                      {lst.certifications.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{lst.certifications.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
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
                            setSelectedLst(lst)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Award className="mr-2 h-4 w-4" />
                          View Performance
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Clock className="mr-2 h-4 w-4" />
                          Schedule Training
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteLst(lst.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit LST Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit LST</DialogTitle>
            <DialogDescription>Update line service technician information.</DialogDescription>
          </DialogHeader>
          {selectedLst && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={selectedLst.name}
                  onChange={(e) => setSelectedLst({ ...selectedLst, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={selectedLst.email}
                  onChange={(e) => setSelectedLst({ ...selectedLst, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-employeeId">Employee ID</Label>
                <Input
                  id="edit-employeeId"
                  value={selectedLst.employeeId}
                  onChange={(e) => setSelectedLst({ ...selectedLst, employeeId: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={selectedLst.status}
                  onValueChange={(value: "active" | "inactive" | "on_leave") =>
                    setSelectedLst({ ...selectedLst, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-shift">Shift</Label>
                <Select
                  value={selectedLst.shift}
                  onValueChange={(value: "day" | "swing" | "night") => setSelectedLst({ ...selectedLst, shift: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {shifts.map((shift) => (
                      <SelectItem key={shift.value} value={shift.value}>
                        {shift.label}
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
            <Button type="button" onClick={handleEditLst}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
