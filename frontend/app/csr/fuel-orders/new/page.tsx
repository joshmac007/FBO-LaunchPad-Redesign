"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Info, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { isAuthenticated } from "@/app/services/auth-service"
import { type User, getActiveLSTs } from "@/app/services/user-service"
import { type FuelTruck, getActiveFuelTrucks } from "@/app/services/fuel-truck-service"
import { 
  type FuelOrderCreateRequest, 
  type FuelOrderDisplay,
  createFuelOrder,
  transformToBackend 
} from "@/app/services/fuel-order-service"
import AircraftLookup from "@/app/components/aircraft-lookup"
import OwnershipChangeAlert from "@/app/components/ownership-change-alert"
import Link from "next/link"
import type { Aircraft } from "@/app/services/aircraft-service"

// Enhanced form data interface for the new fields
interface EnhancedFormData {
  aircraft_id: number
  customer_id: number
  quantity: string
  priority: 'normal' | 'high' | 'urgent'
  csr_notes: string
  additive_requested: boolean
  location_on_ramp: string
  assigned_lst_name: string
  assigned_truck_name: string
}

export default function NewFuelOrderPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lsts, setLsts] = useState<User[]>([])
  const [fuelTrucks, setFuelTrucks] = useState<FuelTruck[]>([])
  const [isApiConnected, setIsApiConnected] = useState<boolean>(true)
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null)

  // Enhanced form state with new fields
  const [formData, setFormData] = useState<EnhancedFormData>({
    aircraft_id: 0,
    customer_id: 0,
    quantity: "",
    priority: 'normal',
    csr_notes: "",
    additive_requested: false,
    location_on_ramp: "",
    assigned_lst_name: 'auto-assign',
    assigned_truck_name: 'auto-assign',
  })

  useEffect(() => {
    // Check if user is logged in and is CSR
    if (!isAuthenticated()) {
      router.push("/login")
      return
    }

    const userData = localStorage.getItem("fboUser")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      
      // Check if user has CSR role - handle both array and string formats (same as CSR layout)
      const userRoles = parsedUser.roles || []
      const hasCSRRole = Array.isArray(userRoles) 
        ? userRoles.some(role => role.toLowerCase().includes("customer service") || role.toLowerCase().includes("csr"))
        : false
        
      if (!parsedUser.isLoggedIn || !hasCSRRole) {
        router.push("/login")
        return
      }
    }

    // Load LSTs and fuel trucks
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Note: Removed API health check as it was causing console 401 errors
        // The actual API calls below will determine if the backend is available
        setIsApiConnected(true) // Assume connected, will be updated based on actual API calls

        // Use Promise.allSettled to handle partial failures
        const results = await Promise.allSettled([getActiveLSTs(), getActiveFuelTrucks()])

        let apiCallsSuccessful = 0

        if (results[0].status === "fulfilled") {
          setLsts(results[0].value)
          apiCallsSuccessful++
        } else {
          console.error("Error loading LSTs:", results[0].reason)
        }

        if (results[1].status === "fulfilled") {
          setFuelTrucks(results[1].value)
          apiCallsSuccessful++
        } else {
          console.error("Error loading fuel trucks:", results[1].reason)
        }

        // Update API connection status based on actual API call results
        setIsApiConnected(apiCallsSuccessful > 0)

        // Show error if both failed
        if (results[0].status === "rejected" && results[1].status === "rejected") {
          setError("Failed to load required data. Using demo data instead.")
        }
      } catch (error) {
        console.error("Error loading data:", error)
        setError("Failed to load required data. Using demo data instead.")
        setIsApiConnected(false)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleAircraftFound = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft)
    setFormData((prev) => ({
      ...prev,
      aircraft_id: aircraft.id,
    }))
    // Clear any previous aircraft lookup errors
    if (error?.includes("Aircraft with tail number")) {
      setError(null)
    }
  }

  const handleAircraftNotFound = (tailNumber: string) => {
    setSelectedAircraft(null)
    setFormData((prev) => ({
      ...prev,
      aircraft_id: 0,
    }))
    setError(`Aircraft "${tailNumber}" not found. Please verify the tail number and try again.`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Validate required fields
      if (!formData.aircraft_id) {
        throw new Error("Please select an aircraft")
      }
      if (!formData.customer_id) {
        throw new Error("Please enter a customer ID")
      }
      if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
        throw new Error("Please enter a valid quantity")
      }

      // Transform form data to backend format using the new service layer
      const displayData: Partial<FuelOrderDisplay> = {
        aircraft_id: formData.aircraft_id,
        customer_id: formData.customer_id,
        quantity: formData.quantity,
        priority: formData.priority,
        csr_notes: formData.csr_notes,
        additive_requested: formData.additive_requested,
        location_on_ramp: formData.location_on_ramp,
        assigned_lst_name: formData.assigned_lst_name,
        assigned_truck_name: formData.assigned_truck_name,
      }

      // Transform to backend format
      const backendData = await transformToBackend(displayData)
      
      // Create the fuel order using the new service
      const result = await createFuelOrder(backendData as FuelOrderCreateRequest)

      // Show success message before redirecting
      setError(null)

      // Redirect after a short delay to show success
      setTimeout(() => {
        router.push(`/csr/fuel-orders/${result.id}`)
      }, 1000)
    } catch (error) {
      console.error("Error creating fuel order:", error)
      setError(error instanceof Error ? error.message : "Failed to create fuel order. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Ownership change alert */}
      {selectedAircraft && <OwnershipChangeAlert specificAircraftId={selectedAircraft.id} />}

      <main className="container px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/csr/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
              </Link>
            </Button>
          </div>

          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle>Create New Fuel Order</CardTitle>
              <CardDescription>Fill in the details to create a new fuel order</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Aircraft Information Section */}
                <div className="space-y-2">
                  <AircraftLookup 
                    onAircraftFound={handleAircraftFound} 
                    onAircraftNotFound={handleAircraftNotFound}
                  />
                </div>

                {/* Customer Information Section */}
                <div className="border-t pt-4 space-y-2">
                  <div className="space-y-2">
                    <Label htmlFor="customer_id">Customer ID *</Label>
                    <Input
                      id="customer_id"
                      name="customer_id"
                      type="number"
                      placeholder="Enter customer ID"
                      required
                      value={formData.customer_id || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Fuel Details Section */}
                <div className="border-t pt-4 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity (gallons) *</Label>
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        min="1"
                        step="0.1"
                        placeholder="Enter quantity"
                        required
                        value={formData.quantity}
                        onChange={handleInputChange}
                      />
                      {selectedAircraft && selectedAircraft.fuelCapacity && (
                        <div className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                          <Info className="h-3 w-3" />
                          Max capacity: {selectedAircraft.fuelCapacity} gallons
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        onValueChange={(value) => handleSelectChange("priority", value)}
                        value={formData.priority}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High Priority</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="additive_requested"
                      checked={formData.additive_requested}
                      onCheckedChange={(checked) => handleCheckboxChange("additive_requested", checked as boolean)}
                    />
                    <Label htmlFor="additive_requested" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Additive Requested
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location_on_ramp">Location on Ramp</Label>
                    <Input
                      id="location_on_ramp"
                      name="location_on_ramp"
                      type="text"
                      placeholder="e.g., Hangar 5, Gate A2, Terminal Ramp"
                      value={formData.location_on_ramp}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Assignment Section */}
                <div className="border-t pt-4 space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assigned_lst_name">Assigned LST</Label>
                      <Select
                        onValueChange={(value) => handleSelectChange("assigned_lst_name", value)}
                        value={formData.assigned_lst_name}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select LST" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto-assign">
                            <div className="flex items-center gap-2">
                              <Bot className="h-4 w-4 text-blue-500" />
                              <span>Auto-assign best LST</span>
                            </div>
                          </SelectItem>
                          {lsts.map((lst) => (
                            <SelectItem key={lst.id} value={lst.name || `User ${lst.id}`}>
                              {lst.name || `User ${lst.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assigned_truck_name">Assigned Fuel Truck</Label>
                      <Select
                        onValueChange={(value) => handleSelectChange("assigned_truck_name", value)}
                        value={formData.assigned_truck_name}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select fuel truck" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto-assign">
                            <div className="flex items-center gap-2">
                              <Bot className="h-4 w-4 text-blue-500" />
                              <span>Auto-assign best truck</span>
                            </div>
                          </SelectItem>
                          {fuelTrucks.map((truck) => (
                            <SelectItem 
                              key={truck.id} 
                              value={truck.truck_number}
                              disabled={!truck.is_active}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{truck.truck_number}</span>
                                <span className="text-xs text-gray-500 ml-2">
                                  {truck.capacity}gal, {truck.is_active ? 'Available' : 'Unavailable'}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="border-t pt-4 space-y-2">
                  <div className="space-y-2">
                    <Label htmlFor="csr_notes">CSR Notes</Label>
                                          <Textarea
                        id="csr_notes"
                        name="csr_notes"
                        placeholder="Special instructions, customer requests, etc."
                        rows={2}
                        value={formData.csr_notes}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
              <Button variant="outline" asChild>
                <Link href="/csr/dashboard">Cancel</Link>
              </Button>
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isSubmitting ? (
                  <>
                    <span className="mr-2">Creating...</span>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </>
                ) : (
                  "Create Fuel Order"
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
