"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { type User, getActiveLSTs } from "@/app/services/user-service"
import { type FuelTruck, getActiveFuelTrucks } from "@/app/services/fuel-truck-service"
import {
  type FuelOrderCreateRequest,
  type FuelOrderDisplay,
  createFuelOrder,
  transformToBackend,
} from "@/app/services/fuel-order-service"
import { CustomerSearchInput } from "@/app/components/search/CustomerSearchInput"
import { AircraftTailSearchInput } from "@/app/components/search/AircraftTailSearchInput"

import Link from "next/link"
import type { Aircraft } from "@/app/services/aircraft-service"
import type { Customer } from "@/app/services/customer-service"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

// Zod schema for form validation
const fuelOrderFormSchema = z.object({
  aircraft_id: z.string().min(1, { message: "Aircraft is required." }),
  customer_id: z.number().optional(),
  quantity: z.coerce.number().positive({ message: "Quantity must be a positive number." }),
  priority: z.enum(['normal', 'high', 'urgent']),
  csr_notes: z.string().optional(),
  additive_requested: z.boolean().default(false),
  location_on_ramp: z.string().optional(),
  assigned_lst_name: z.string().default('auto-assign'),
  assigned_truck_name: z.string().default('auto-assign'),
})

type FuelOrderFormData = z.infer<typeof fuelOrderFormSchema>

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

  const form = useForm<FuelOrderFormData>({
    resolver: zodResolver(fuelOrderFormSchema),
    defaultValues: {
      aircraft_id: "",
      customer_id: undefined,
      quantity: 0,
      priority: 'normal',
      csr_notes: "",
      additive_requested: false,
      location_on_ramp: "",
      assigned_lst_name: 'auto-assign',
      assigned_truck_name: 'auto-assign',
    },
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
    form.reset()
    setError(null)
    setIsSubmitting(false)
  }


  const handleAircraftFound = (aircraft: Aircraft) => {
    if (!aircraft || !aircraft.id) {
      setError("Invalid aircraft data received. Please try again.")
      return
    }
    setSelectedAircraft(aircraft)
    form.setValue('aircraft_id', aircraft.id)
    if (error?.includes("Aircraft with tail number")) {
      setError(null)
    }
  }


  const handleCustomerSelected = (customer: Customer) => {
    setSelectedCustomer(customer)
    form.setValue('customer_id', customer.id)
    if (error?.includes("customer")) {
      setError(null)
    }
  }

  const handleSubmit = async (values: FuelOrderFormData) => {
    setError(null)
    
    if (!selectedAircraft || !selectedAircraft.id) {
        setError("Please select an aircraft.")
        return
    }
    
    setIsSubmitting(true)
    
    try {
      const displayData: Partial<FuelOrderDisplay> = {
        aircraft_id: selectedAircraft.id,
        customer_id: selectedCustomer?.id,
        quantity: values.quantity.toString(),
        priority: values.priority,
        csr_notes: values.csr_notes,
        additive_requested: values.additive_requested,
        location_on_ramp: values.location_on_ramp,
        assigned_lst_name: values.assigned_lst_name,
        assigned_truck_name: values.assigned_truck_name,
      }

      const backendData = await transformToBackend(displayData)
      const fuelOrderRequest: FuelOrderCreateRequest = {
        ...backendData,
        tail_number: selectedAircraft.tailNumber,
        fuel_type: selectedAircraft.fuelType,
        requested_amount: values.quantity,
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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Aircraft Search */}
                <div className="space-y-2">
                  <Label>Aircraft</Label>
                  <AircraftTailSearchInput
                    value={selectedAircraft}
                    onValueChange={(aircraft) => {
                      if (aircraft) {
                        handleAircraftFound(aircraft)
                      } else {
                        setSelectedAircraft(null)
                        form.setValue('aircraft_id', '')
                      }
                    }}
                  />
                  {selectedAircraft && (
                    <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
                      <p><strong>Type:</strong> {selectedAircraft.aircraftType}</p>
                      <p><strong>Fuel:</strong> {selectedAircraft.fuelType}</p>
                    </div>
                  )}
                </div>
                
                {/* Customer Search */}
                <div className="space-y-2">
                  <Label>Customer (Optional)</Label>
                  <CustomerSearchInput
                    value={selectedCustomer}
                    onValueChange={(customer) => {
                      if (customer) {
                        handleCustomerSelected(customer)
                      } else {
                        setSelectedCustomer(null)
                        form.setValue('customer_id', undefined)
                      }
                    }}
                  />
                  {selectedCustomer && (
                    <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md">
                      <p><strong>Name:</strong> {selectedCustomer.name}</p>
                      {selectedCustomer.company_name && (
                        <p><strong>Company:</strong> {selectedCustomer.company_name}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fuel Quantity */}
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuel Quantity (Gallons)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter gallons"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Priority */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Assigned LST */}
                <FormField
                  control={form.control}
                  name="assigned_lst_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign Line Service Technician</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select LST" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="auto-assign">Auto-assign</SelectItem>
                          {lsts.map((lst) => (
                            <SelectItem key={lst.id} value={lst.username}>
                              {lst.fullName} ({lst.username})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Assigned Fuel Truck */}
                <FormField
                  control={form.control}
                  name="assigned_truck_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign Fuel Truck</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Fuel Truck" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="auto-assign">Auto-assign</SelectItem>
                          {fuelTrucks.map((truck) => (
                            <SelectItem key={truck.id} value={truck.truck_number}>
                              {truck.truck_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Location on Ramp */}
              <FormField
                control={form.control}
                name="location_on_ramp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location on Ramp</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* CSR Notes */}
              <FormField
                control={form.control}
                name="csr_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Additive Requested */}
              <FormField
                control={form.control}
                name="additive_requested"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Additive Requested</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
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
        </Form>
      </DialogContent>
    </Dialog>
  )
} 