"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { type User, getActiveLSTs } from "@/app/services/user-service"
import { type FuelTruck, getActiveFuelTrucks } from "@/app/services/fuel-truck-service"
import {
  type FuelOrderCreateRequest,
  type FuelOrderDisplay,
  createFuelOrder,
  transformToBackend,
} from "@/app/services/fuel-order-service"
import AircraftLookup from "@/app/components/aircraft-lookup"
import CustomerSelector from "@/app/components/customer-selector"

import Link from "next/link"
import type { Aircraft } from "@/app/services/aircraft-service"
import type { Customer } from "@/app/services/customer-service"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

// Enhanced form data interface for the new fields
interface EnhancedFormData {
  aircraft_id: string
  customer_id: number | undefined
  quantity: string
  priority: 'normal' | 'high' | 'urgent'
  csr_notes: string
  additive_requested: boolean
  location_on_ramp: string
  assigned_lst_name: string
  assigned_truck_name: string
}

interface NewFuelOrderDialogProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onOrderCreated: () => void
}

export default function NewFuelOrderDialog({ isOpen, onOpenChange, onOrderCreated }: NewFuelOrderDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lsts, setLsts] = useState<User[]>([])
  const [fuelTrucks, setFuelTrucks] = useState<FuelTruck[]>([])
  const [selectedAircraft, setSelectedAircraft] = useState<Aircraft | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const [formData, setFormData] = useState<EnhancedFormData>({
    aircraft_id: "",
    customer_id: undefined,
    quantity: "",
    priority: 'normal',
    csr_notes: "",
    additive_requested: false,
    location_on_ramp: "",
    assigned_lst_name: 'auto-assign',
    assigned_truck_name: 'auto-assign',
  })

  useEffect(() => {
    if (isOpen) {
      setError(null)
      const loadData = async () => {
        try {
          setIsLoading(true)
          const [lstsResult, fuelTrucksResult] = await Promise.allSettled([
            getActiveLSTs(),
            getActiveFuelTrucks(),
          ])

          if (lstsResult.status === "fulfilled") {
            setLsts(lstsResult.value)
          } else {
            console.error("Error loading LSTs:", lstsResult.reason)
          }

          if (fuelTrucksResult.status === "fulfilled") {
            setFuelTrucks(fuelTrucksResult.value)
          } else {
            console.error("Error loading fuel trucks:", fuelTrucksResult.reason)
          }

          if (lstsResult.status === "rejected" || fuelTrucksResult.status === "rejected") {
            setError("Failed to load some required data. Some options may be unavailable.")
          }
        } catch (error) {
          console.error("Error loading data:", error)
          setError("Failed to load required data. Some options may be unavailable.")
        } finally {
          setIsLoading(false)
        }
      }
      loadData()
    } else {
        resetForm()
    }
  }, [isOpen])
  
  const resetForm = () => {
    setSelectedAircraft(null)
    setSelectedCustomer(null)
    setFormData({
        aircraft_id: "",
        customer_id: undefined,
        quantity: "",
        priority: 'normal',
        csr_notes: "",
        additive_requested: false,
        location_on_ramp: "",
        assigned_lst_name: 'auto-assign',
        assigned_truck_name: 'auto-assign',
    })
    setError(null)
    setIsSubmitting(false)
  }

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
    if (!aircraft || !aircraft.id) {
      setError("Invalid aircraft data received. Please try again.")
      return
    }
    setSelectedAircraft(aircraft)
    setFormData((prev) => ({ ...prev, aircraft_id: aircraft.id }))
    if (error?.includes("Aircraft with tail number")) {
      setError(null)
    }
  }

  const handleAircraftNotFound = (tailNumber: string) => {
    setSelectedAircraft(null)
    setFormData((prev) => ({ ...prev, aircraft_id: "" }))
    setError(`Aircraft "${tailNumber}" not found. Please verify the tail number.`)
  }

  const handleCustomerSelected = (customer: Customer) => {
    setSelectedCustomer(customer)
    setFormData((prev) => ({ ...prev, customer_id: customer.id }))
    if (error?.includes("customer")) {
      setError(null)
    }
  }
  
  const handleCustomerCleared = () => {
    setSelectedCustomer(null)
    setFormData((prev) => ({...prev, customer_id: undefined,}))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!selectedAircraft || !selectedAircraft.id) {
        setError("Please select an aircraft.")
        return
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
        setError("Please enter a valid quantity.")
        return
    }
    
    setIsSubmitting(true)
    
    try {
      const displayData: Partial<FuelOrderDisplay> = {
        aircraft_id: selectedAircraft.id,
        customer_id: selectedCustomer?.id,
        quantity: formData.quantity,
        priority: formData.priority,
        csr_notes: formData.csr_notes,
        additive_requested: formData.additive_requested,
        location_on_ramp: formData.location_on_ramp,
        assigned_lst_name: formData.assigned_lst_name,
        assigned_truck_name: formData.assigned_truck_name,
      }

      const backendData = await transformToBackend(displayData)
      const fuelOrderRequest: FuelOrderCreateRequest = {
        ...backendData,
        tail_number: selectedAircraft.tailNumber,
        fuel_type: selectedAircraft.fuelType,
        requested_amount: parseFloat(formData.quantity),
        customer_id: selectedCustomer?.id,
      }

      await createFuelOrder(fuelOrderRequest)
      toast.success("Fuel order created successfully!")
      onOrderCreated()
      onOpenChange(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred."
      setError(errorMessage)
      toast.error(`Failed to create fuel order: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>New Fuel Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Aircraft Lookup */}
              <div className="space-y-2">
                <AircraftLookup
                  onAircraftFound={handleAircraftFound}
                  onAircraftNotFound={handleAircraftNotFound}
                />
                 {selectedAircraft && (
                    <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
                        <p><strong>Type:</strong> {selectedAircraft.aircraftType}</p>
                        <p><strong>Fuel:</strong> {selectedAircraft.fuelType}</p>
                    </div>
                )}
              </div>
              
              {/* Customer Selector */}
              <div className="space-y-2">
                <CustomerSelector 
                  onCustomerSelected={handleCustomerSelected}
                  onCustomerCleared={handleCustomerCleared}
                />
                 {selectedCustomer && (
                    <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
                        <p><strong>Company:</strong> {selectedCustomer.name}</p>
                    </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fuel Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Fuel Quantity (Gallons)</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required
                />
              </div>
              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  name="priority"
                  value={formData.priority}
                  onValueChange={(value) => handleSelectChange('priority', value)}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assigned LST */}
              <div className="space-y-2">
                <Label htmlFor="assigned_lst_name">Assign Line Service Technician</Label>
                <Select
                  name="assigned_lst_name"
                  value={formData.assigned_lst_name}
                  onValueChange={(value) => handleSelectChange('assigned_lst_name', value)}
                >
                  <SelectTrigger id="assigned_lst_name">
                    <SelectValue placeholder="Select LST" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto-assign">Auto-assign</SelectItem>
                    {lsts.map((lst) => (
                      <SelectItem key={lst.id} value={lst.username}>
                        {lst.fullName} ({lst.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Assigned Fuel Truck */}
              <div className="space-y-2">
                <Label htmlFor="assigned_truck_name">Assign Fuel Truck</Label>
                <Select
                  name="assigned_truck_name"
                  value={formData.assigned_truck_name}
                  onValueChange={(value) => handleSelectChange('assigned_truck_name', value)}
                >
                  <SelectTrigger id="assigned_truck_name">
                    <SelectValue placeholder="Select Fuel Truck" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto-assign">Auto-assign</SelectItem>
                    {fuelTrucks.map((truck) => (
                      <SelectItem key={truck.id} value={truck.truck_number}>
                        {truck.truck_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Location on Ramp */}
            <div className="space-y-2">
              <Label htmlFor="location_on_ramp">Location on Ramp</Label>
              <Input
                id="location_on_ramp"
                name="location_on_ramp"
                value={formData.location_on_ramp}
                onChange={handleInputChange}
              />
            </div>
            
            {/* CSR Notes */}
            <div className="space-y-2">
              <Label htmlFor="csr_notes">Notes</Label>
              <Textarea
                id="csr_notes"
                name="csr_notes"
                value={formData.csr_notes}
                onChange={handleInputChange}
              />
            </div>

            {/* Additive Requested */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="additive_requested"
                name="additive_requested"
                checked={formData.additive_requested}
                onCheckedChange={(checked) => handleCheckboxChange('additive_requested', !!checked)}
              />
              <Label htmlFor="additive_requested">Additive Requested</Label>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? "Creating Order..." : "Create Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 