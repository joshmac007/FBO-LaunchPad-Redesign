"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { 
  createCSRAircraft, 
  getAircraftTypes,
  type Aircraft,
  type AircraftType,
  type CSRAircraftCreateRequest 
} from "@/app/services/aircraft-service"
import { getFuelTypes, type FuelType } from "@/app/services/admin-fee-config-service"

// Zod schema for aircraft creation form
const aircraftFormSchema = z.object({
  tail_number: z.string().min(1, "Tail number is required"),
  aircraft_type: z.string().min(1, "Aircraft type is required"),
  fuel_type: z.string().min(1, "Fuel type is required"),
})

type AircraftFormData = z.infer<typeof aircraftFormSchema>

interface AircraftCreationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (newAircraft: Aircraft) => void
  initialTailNumber?: string
}

export function AircraftCreationDialog({
  open,
  onOpenChange,
  onSuccess,
  initialTailNumber = "",
}: AircraftCreationDialogProps) {
  const form = useForm<AircraftFormData>({
    resolver: zodResolver(aircraftFormSchema),
    defaultValues: {
      tail_number: initialTailNumber,
      aircraft_type: "",
      fuel_type: "",
    },
  })

  // Reset form when dialog opens/closes or initialTailNumber changes
  useEffect(() => {
    if (open) {
      form.reset({
        tail_number: initialTailNumber,
        aircraft_type: "",
        fuel_type: "",
      })
    }
  }, [open, initialTailNumber, form])

  // Fetch aircraft types
  const { data: aircraftTypes = [], isLoading: isLoadingTypes } = useQuery({
    queryKey: ['aircraftTypes'],
    queryFn: getAircraftTypes,
    enabled: open,
  })

  // Fetch fuel types
  const { data: fuelTypesResponse, isLoading: isLoadingFuelTypes } = useQuery({
    queryKey: ['fuelTypes'],
    queryFn: () => getFuelTypes(),
    enabled: open,
  })

  const fuelTypes = fuelTypesResponse?.fuel_types || []

  const createAircraftMutation = useMutation({
    mutationFn: createCSRAircraft,
    onSuccess: (newAircraft) => {
      toast.success("Aircraft created successfully")
      form.reset()
      onSuccess(newAircraft)
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(`Failed to create aircraft: ${error.message}`)
    },
  })

  const onSubmit = (data: AircraftFormData) => {
    const createData: CSRAircraftCreateRequest = {
      tail_number: data.tail_number.trim(),
      aircraft_type: data.aircraft_type,
      fuel_type: data.fuel_type,
    }

    createAircraftMutation.mutate(createData)
  }

  const handleClose = () => {
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Aircraft</DialogTitle>
          <DialogDescription>
            Add a new aircraft to the system. If the required aircraft type or fuel type is not available, contact an administrator to have it added.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="tail_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tail Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., N12345" 
                        {...field} 
                        disabled={createAircraftMutation.isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="aircraft_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aircraft Type</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={createAircraftMutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select aircraft type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingTypes ? (
                          <div className="flex items-center justify-center py-2">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Loading aircraft types...
                          </div>
                        ) : aircraftTypes.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-4 text-center">
                            <p className="text-sm text-muted-foreground mb-2">No aircraft types available</p>
                            <p className="text-xs text-muted-foreground">Contact admin to add aircraft types</p>
                          </div>
                        ) : (
                          aircraftTypes.map((type: AircraftType) => (
                            <SelectItem key={type.id} value={type.name}>
                              {type.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
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
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={createAircraftMutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fuel type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingFuelTypes ? (
                          <div className="flex items-center justify-center py-2">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Loading fuel types...
                          </div>
                        ) : fuelTypes.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-4 text-center">
                            <p className="text-sm text-muted-foreground mb-2">No fuel types available</p>
                            <p className="text-xs text-muted-foreground">Contact admin to add fuel types</p>
                          </div>
                        ) : (
                          fuelTypes.map((fuelType: FuelType) => (
                            <SelectItem key={fuelType.id} value={fuelType.name}>
                              {fuelType.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createAircraftMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createAircraftMutation.isPending}
              >
                {createAircraftMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Aircraft"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}