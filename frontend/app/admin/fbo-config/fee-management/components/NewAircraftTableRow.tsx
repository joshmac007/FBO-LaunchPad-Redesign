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
  fboId: number
  aircraftClassificationId: number
  aircraftClassificationName: string
  onSave: () => void
  onCancel: () => void
}

export function NewAircraftTableRow({
  fboId,
  aircraftClassificationId,
  aircraftClassificationName,
  onSave,
  onCancel,
}: NewAircraftTableRowProps) {
  const [aircraftTypeName, setAircraftTypeName] = useState("")
  const [minFuelGallons, setMinFuelGallons] = useState("100")
  const [open, setOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)

  const queryClient = useQueryClient()

  // Fetch aircraft types for autocomplete
  const { data: aircraftTypes = [] } = useQuery({
    queryKey: ['aircraft-types', fboId],
    queryFn: () => getAircraftTypes(fboId),
  })

  // Add aircraft mutation
  const addAircraftMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        aircraft_type_name: aircraftTypeName.trim(),
        aircraft_classification_id: aircraftClassificationId,
        min_fuel_gallons: parseInt(minFuelGallons, 10),
      }
      
      return addAircraftToFeeSchedule(fboId, payload)
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the table
      queryClient.invalidateQueries({ queryKey: ['consolidated-fee-schedule', fboId] })
      toast.success(`Aircraft "${aircraftTypeName}" added successfully to ${aircraftClassificationName}`)
      onSave()
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to add aircraft. Please try again."
      toast.error(errorMessage)
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
        <div className="flex items-center gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {aircraftTypeName || "Select or type aircraft type..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
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
                            "mr-2 h-4 w-4",
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
                            "mr-2 h-4 w-4",
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
          className="w-24"
          min="1"
        />
      </TableCell>
      
      {/* Empty cells for fee columns - will be populated after save */}
      <TableCell>-</TableCell>
      <TableCell>-</TableCell>
      <TableCell>-</TableCell>
      <TableCell>-</TableCell>
      
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={addAircraftMutation.isPending}
          >
            {addAircraftMutation.isPending ? "Adding..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={addAircraftMutation.isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}