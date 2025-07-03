"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { TableCell, TableRow } from "@/components/ui/table"
import { getAircraftTypes, addAircraftToFeeSchedule } from "@/app/services/admin-fee-config-service"

interface NewAircraftTableRowProps {
  categoryId: number
  feeColumns: string[]
  primaryFeeRules: any[]
  onSuccess: () => void
  onCancel: () => void
}

export function NewAircraftTableRow({
  categoryId,
  feeColumns,
  primaryFeeRules,
  onSuccess,
  onCancel,
}: NewAircraftTableRowProps) {
  const [aircraftTypeName, setAircraftTypeName] = useState("")
  const [minFuelGallons, setMinFuelGallons] = useState("100")
  const [open, setOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  const queryClient = useQueryClient()

  // Fetch aircraft types for autocomplete
  const { data: aircraftTypes = [] } = useQuery({
    queryKey: ['aircraft-types'],
    queryFn: () => getAircraftTypes(),
  })

  // Add aircraft mutation with optimistic updates
  const addAircraftMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        aircraft_type_name: aircraftTypeName.trim(),
        aircraft_classification_id: categoryId,
        min_fuel_gallons: parseInt(minFuelGallons, 10),
      }
      
      return addAircraftToFeeSchedule(payload)
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['global-fee-schedule'] })
      await queryClient.cancelQueries({ queryKey: ['aircraft-types'] })
      
      // Snapshot previous values
      const previousScheduleData = queryClient.getQueryData(['global-fee-schedule'])
      const previousAircraftTypes = queryClient.getQueryData(['aircraft-types'])
      
      // Create optimistic aircraft data
      const optimisticAircraft = {
        id: Date.now(), // Temporary ID
        name: aircraftTypeName.trim(),
        classification_id: categoryId,
        base_min_fuel_gallons_for_waiver: parseInt(minFuelGallons, 10),
        fees: {}, // Will be populated with default fees
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      // Optimistically update global fee schedule
      if (previousScheduleData) {
        const newScheduleData = { ...previousScheduleData as any }
        newScheduleData.schedule = newScheduleData.schedule.map((classification: any) => {
          if (classification.id === categoryId) {
            return {
              ...classification,
              aircraft_types: [...classification.aircraft_types, optimisticAircraft]
            }
          }
          return classification
        })
        
        queryClient.setQueryData(['global-fee-schedule'], newScheduleData)
      }
      
      // Optimistically update aircraft types list
      if (previousAircraftTypes) {
        const newAircraftTypes = [...(previousAircraftTypes as any[]), {
          id: optimisticAircraft.id,
          name: optimisticAircraft.name
        }]
        queryClient.setQueryData(['aircraft-types'], newAircraftTypes)
      }
      
      // Show immediate success feedback
      toast.success(`Aircraft "${aircraftTypeName}" added successfully`)
      
      // Reset form immediately for snappy UX
      const formData = { aircraftTypeName, minFuelGallons }
      setAircraftTypeName("")
      setMinFuelGallons("100")
      setOpen(false)
      onSuccess()
      
      return { previousScheduleData, previousAircraftTypes, formData }
    },
    onError: (error: any, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousScheduleData) {
        queryClient.setQueryData(['global-fee-schedule'], context.previousScheduleData)
      }
      if (context?.previousAircraftTypes) {
        queryClient.setQueryData(['aircraft-types'], context.previousAircraftTypes)
      }
      
      // Restore form data
      if (context?.formData) {
        setAircraftTypeName(context.formData.aircraftTypeName)
        setMinFuelGallons(context.formData.minFuelGallons)
      }
      
      const errorMessage = error?.message || "Failed to add aircraft. Please try again."
      toast.error(errorMessage)
    },
    onSuccess: () => {
      // Invalidate queries to get fresh data from server
      queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['aircraft-types'] })
    }
  })

  const handleSave = () => {
    if (!aircraftTypeName.trim()) {
      toast.error("Please select or enter an aircraft type")
      return
    }

    if (!minFuelGallons || parseInt(minFuelGallons, 10) <= 0) {
      toast.error("Please enter a valid minimum fuel gallons amount")
      return
    }

    // Mutation will handle optimistic updates
    addAircraftMutation.mutate()
  }

  const handleInputChange = (value: string) => {
    setAircraftTypeName(value)
    setIsTyping(true)
  }

  const handleSelectAircraft = (selectedValue: string) => {
    setAircraftTypeName(selectedValue)
    setIsTyping(false)
    setOpen(false)
  }

  const filteredAircraftTypes = aircraftTypes.filter(type =>
    type.name.toLowerCase().includes(aircraftTypeName.toLowerCase())
  )

  // Show custom option if user is typing and no exact match exists
  const showCustomOption = isTyping && 
    aircraftTypeName.trim() && 
    !aircraftTypes.some(type => type.name.toLowerCase() === aircraftTypeName.toLowerCase())

  return (
    <TableRow className="bg-muted/50 border-dashed">
      <TableCell className="font-medium">
        <div className="flex items-center gap-1.5">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between h-7"
              >
                {aircraftTypeName || "Select or type aircraft type..."}
                <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput
                  placeholder="Search or type aircraft type..."
                  value={aircraftTypeName}
                  onValueChange={handleInputChange}
                />
                <CommandList>
                  <CommandEmpty>
                    {aircraftTypeName.trim() ? "No aircraft type found." : "Start typing to search..."}
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredAircraftTypes.map((type) => (
                      <CommandItem
                        key={type.id}
                        value={type.name}
                        onSelect={() => handleSelectAircraft(type.name)}
                      >
                        <Check
                          className={cn(
                            "mr-1.5 h-3.5 w-3.5",
                            aircraftTypeName === type.name ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {type.name}
                      </CommandItem>
                    ))}
                    {showCustomOption && (
                      <CommandItem
                        value={aircraftTypeName}
                        onSelect={() => handleSelectAircraft(aircraftTypeName)}
                      >
                        <Check
                          className={cn(
                            "mr-1.5 h-3.5 w-3.5",
                            "opacity-0"
                          )}
                        />
                        Create "{aircraftTypeName}"
                      </CommandItem>
                    )}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </TableCell>
      
      <TableCell>
        <Input
          type="number"
          placeholder="100"
          value={minFuelGallons}
          onChange={(e) => setMinFuelGallons(e.target.value)}
          className="w-20 h-7"
          min="1"
        />
      </TableCell>
      
      {/* Empty cell for expander column */}
      <TableCell></TableCell>
      
      {/* Empty cells for fee columns - will be populated after save */}
      {primaryFeeRules.map(rule => (
        <TableCell key={rule.id} className="hidden md:table-cell">-</TableCell>
      ))}
      
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={addAircraftMutation.isPending}
            className="h-7"
          >
            {addAircraftMutation.isPending ? "Adding..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={addAircraftMutation.isPending}
            className="h-7"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}