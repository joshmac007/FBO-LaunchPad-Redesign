"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plane, AlertCircle, WifiOff, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { isAuthenticated } from "@/app/services/auth-service"
import { type User, getActiveLSTs } from "@/app/services/user-service"
import { type FuelTruck, getActiveFuelTrucks } from "@/app/services/fuel-truck-service"
import { type CreateFuelOrderRequest, createFuelOrder } from "@/app/services/fuel-order-service"
import AircraftLookup from "@/app/components/aircraft-lookup"
import OwnershipChangeAlert from "@/app/components/ownership-change-alert"
import Link from "next/link"
import { checkApiHealth } from "@/app/services/api-config"
import type { Aircraft } from "@/app/services/aircraft-service"

export default function NewFuelOrderPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lsts, setLsts] = useState<User[]>([])
  const [fuelTrucks, setFuelTrucks] = useState<FuelTruck[]>([])
  const [isApiConnected, setIsApiConnected] = useState<boolean>(true)
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null)

  // Form state
  const [formData, setFormData] = useState<CreateFuelOrderRequest>({
    aircraft_id: 0,
    customer_id: 0,
    fuel_type: "",
    quantity: "",
    assigned_lst_id: 0,
    assigned_truck_id: 0,
    notes: "",
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
      if (!parsedUser.isLoggedIn || parsedUser.role !== "csr") {
        router.push("/login")
        return
      }
    }

    // Load LSTs and fuel trucks
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Check API health first
        const isApiAvailable = await checkApiHealth()
        setIsApiConnected(isApiAvailable)

        // Use Promise.allSettled to handle partial failures
        const results = await Promise.allSettled([getActiveLSTs(), getActiveFuelTrucks()])

        if (results[0].status === "fulfilled") {
          setLsts(results[0].value)
        } else {
          console.error("Error loading LSTs:", results[0].reason)
        }

        if (results[1].status === "fulfilled") {
          setFuelTrucks(results[1].value)
        } else {
          console.error("Error loading fuel trucks:", results[1].reason)
        }

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

  const handleAircraftFound = (aircraft: Aircraft) => {
    setSelectedAircraft(aircraft)
    setFormData((prev) => ({
      ...prev,
      aircraft_id: aircraft.id,
      fuel_type: aircraft.preferredFuelType || prev.fuel_type,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Convert string IDs to numbers
      const orderData = {
        ...formData,
        aircraft_id: Number(formData.aircraft_id),
        customer_id: Number(formData.customer_id),
        assigned_lst_id: Number(formData.assigned_lst_id),
        assigned_truck_id: Number(formData.assigned_truck_id),
      }

      const result = await createFuelOrder(orderData)

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

      <header className="border-b bg-white sticky top-0 z-40 shadow-sm">
        <div className="container flex h-16 items-center px-4">
          <div className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-blue-500 rotate-45" />
            <span className="text-xl font-bold">FBO LaunchPad</span>
            <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-md ml-2">CSR</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!isApiConnected && (
              <div className="flex items-center gap-1 text-amber-500 bg-amber-100 px-2 py-1 rounded-md">
                <WifiOff className="h-4 w-4" />
                <span className="text-xs">Offline Mode</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
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
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2 mb-4">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Aircraft Lookup Section */}
                <div className="space-y-1">
                  <h3 className="text-lg font-medium">Aircraft Information</h3>
                  <p className="text-sm text-gray-500">
                    Enter the aircraft tail number to automatically retrieve aircraft details
                  </p>
                </div>

                <AircraftLookup onAircraftFound={handleAircraftFound} />

                {/* Customer Information */}
                <div className="border-t pt-6">
                  <div className="space-y-1 mb-4">
                    <h3 className="text-lg font-medium">Customer Information</h3>
                    <p className="text-sm text-gray-500">Enter the customer details for this fuel order</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer_id">Customer ID</Label>
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
                </div>

                {/* Fuel Order Details */}
                <div className="border-t pt-6">
                  <div className="space-y-1 mb-4">
                    <h3 className="text-lg font-medium">Fuel Order Details</h3>
                    <p className="text-sm text-gray-500">Specify the fuel type and quantity</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fuel_type">Fuel Type</Label>
                      <Select
                        onValueChange={(value) => handleSelectChange("fuel_type", value)}
                        value={formData.fuel_type}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select fuel type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Jet A">Jet A</SelectItem>
                          <SelectItem value="Jet A-1">Jet A-1</SelectItem>
                          <SelectItem value="Avgas 100LL">Avgas 100LL</SelectItem>
                        </SelectContent>
                      </Select>
                      {selectedAircraft && selectedAircraft.preferredFuelType && (
                        <div className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                          <Info className="h-3 w-3" />
                          Preferred fuel type: {selectedAircraft.preferredFuelType}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity (gallons)</Label>
                      <Input
                        id="quantity"
                        name="quantity"
                        type="text"
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
                  </div>
                </div>

                {/* Assignment */}
                <div className="border-t pt-6">
                  <div className="space-y-1 mb-4">
                    <h3 className="text-lg font-medium">Assignment</h3>
                    <p className="text-sm text-gray-500">Assign a Line Service Technician and fuel truck</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assigned_lst_id">Assign LST</Label>
                      <Select
                        onValueChange={(value) => handleSelectChange("assigned_lst_id", value)}
                        value={formData.assigned_lst_id.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select LST" />
                        </SelectTrigger>
                        <SelectContent>
                          {lsts.map((lst) => (
                            <SelectItem key={lst.id} value={lst.id.toString()}>
                              {lst.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assigned_truck_id">Assign Fuel Truck</Label>
                      <Select
                        onValueChange={(value) => handleSelectChange("assigned_truck_id", value)}
                        value={formData.assigned_truck_id.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select fuel truck" />
                        </SelectTrigger>
                        <SelectContent>
                          {fuelTrucks.map((truck) => (
                            <SelectItem key={truck.id} value={truck.id.toString()}>
                              {truck.truck_number} - {truck.fuel_type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="border-t pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      placeholder="Enter any additional notes"
                      rows={3}
                      value={formData.notes || ""}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
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
