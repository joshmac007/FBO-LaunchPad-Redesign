"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useSearchDebounce } from "@/hooks/useDebounce"
import { API_BASE_URL, getAuthHeaders, handleApiResponse } from "@/app/services/api-config"
import { type Aircraft } from "@/app/services/aircraft-service"
import { AircraftCreationDialog } from "@/app/components/dialogs/AircraftCreationDialog"

interface AircraftTailSearchInputProps {
  value: Aircraft | null
  onValueChange: (aircraft: Aircraft | null) => void
  placeholder?: string
  className?: string
}

interface AircraftSearchResult {
  aircraft: {
    tail_number: string
    aircraft_type: string
    fuel_type: string
    customer_id?: number
  }[]
  message: string
}

// API function for searching aircraft tails
async function searchAircraftTails(query: string): Promise<AircraftSearchResult> {
  if (!query.trim()) {
    return { aircraft: [], message: "No query provided" }
  }

  const response = await fetch(`${API_BASE_URL}/api/search/aircraft-tails?q=${encodeURIComponent(query)}`, {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return await handleApiResponse<AircraftSearchResult>(response)
}

export function AircraftTailSearchInput({
  value,
  onValueChange,
  placeholder = "Search aircraft tail numbers...",
  className,
}: AircraftTailSearchInputProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddingNew, setIsAddingNew] = useState(false)

  const { debouncedSearchTerm } = useSearchDebounce(searchTerm, 300)

  // Search aircraft API call
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['aircraftTailSearch', debouncedSearchTerm],
    queryFn: () => searchAircraftTails(debouncedSearchTerm),
    enabled: debouncedSearchTerm.length > 0,
    staleTime: 30000, // Cache results for 30 seconds
  })

  const aircraft = searchResults?.aircraft || []

  // Handle aircraft selection
  const handleAircraftSelect = (aircraftItem: AircraftSearchResult['aircraft'][0]) => {
    // Convert to Aircraft interface format
    const aircraftData: Aircraft = {
      id: aircraftItem.tail_number,
      tailNumber: aircraftItem.tail_number,
      aircraftType: aircraftItem.aircraft_type,
      fuelType: aircraftItem.fuel_type,
      customerId: aircraftItem.customer_id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    onValueChange(aircraftData)
    setOpen(false)
    setSearchTerm("")
  }

  // Handle new aircraft creation success
  const handleAircraftCreated = (newAircraft: Aircraft) => {
    onValueChange(newAircraft)
    setIsAddingNew(false)
  }

  // Clear selection
  const handleClear = () => {
    onValueChange(null)
    setSearchTerm("")
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", className)}
          >
            {value ? (
              <span className="font-medium">{value.tailNumber}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search by tail number..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              {isLoading && debouncedSearchTerm.length > 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Searching aircraft...
                </div>
              )}

              {!isLoading && debouncedSearchTerm.length > 0 && aircraft.length === 0 && (
                <CommandEmpty>
                  <div className="py-6 text-center">
                    <div className="text-sm text-muted-foreground mb-2">
                      No aircraft found for "{debouncedSearchTerm}"
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setIsAddingNew(true)}
                      className="mt-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Aircraft
                    </Button>
                  </div>
                </CommandEmpty>
              )}

              {aircraft.length > 0 && (
                <CommandGroup>
                  {aircraft.map((aircraftItem) => (
                    <CommandItem
                      key={aircraftItem.tail_number}
                      value={aircraftItem.tail_number}
                      onSelect={() => handleAircraftSelect(aircraftItem)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{aircraftItem.tail_number}</span>
                        <span className="text-sm text-muted-foreground">
                          {aircraftItem.aircraft_type} • {aircraftItem.fuel_type}
                        </span>
                      </div>
                      <Check
                        className={cn(
                          "h-4 w-4",
                          value?.tailNumber === aircraftItem.tail_number ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {debouncedSearchTerm.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Start typing to search for aircraft...
                </div>
              )}

              {value && (
                <CommandGroup>
                  <CommandItem onSelect={handleClear} className="text-muted-foreground">
                    Clear selection
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <AircraftCreationDialog
        open={isAddingNew}
        onOpenChange={setIsAddingNew}
        onSuccess={handleAircraftCreated}
        initialTailNumber={debouncedSearchTerm}
      />
    </>
  )
}