"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getAircraftTypes, type AircraftType } from "@/app/services/aircraft-service"

interface AircraftTypeSearchInputProps {
  value: AircraftType | null
  onValueChange: (aircraftType: AircraftType | null) => void
  placeholder?: string
  className?: string
}

export function AircraftTypeSearchInput({
  value,
  onValueChange,
  placeholder = "Select aircraft type...",
  className,
}: AircraftTypeSearchInputProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Fetch aircraft types with long cache time since they don't change often
  const { data: aircraftTypes = [], isLoading } = useQuery({
    queryKey: ['aircraftTypes'],
    queryFn: getAircraftTypes,
    staleTime: 1000 * 60 * 60, // 1 hour cache
    gcTime: 1000 * 60 * 60 * 24, // 24 hours cache
  })

  // Client-side filtering of aircraft types
  const filteredTypes = aircraftTypes.filter((type) =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Handle aircraft type selection
  const handleTypeSelect = (type: AircraftType) => {
    onValueChange(type)
    setOpen(false)
    setSearchTerm("")
  }

  // Clear selection
  const handleClear = () => {
    onValueChange(null)
    setSearchTerm("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value ? (
            <span className="font-medium">{value.name}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search aircraft types..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList>
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading aircraft types...
              </div>
            )}

            {!isLoading && filteredTypes.length === 0 && searchTerm.length > 0 && (
              <CommandEmpty>
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No aircraft types found for "{searchTerm}"
                </div>
              </CommandEmpty>
            )}

            {!isLoading && filteredTypes.length === 0 && searchTerm.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Start typing to search aircraft types...
              </div>
            )}

            {filteredTypes.length > 0 && (
              <CommandGroup>
                {filteredTypes.map((type) => (
                  <CommandItem
                    key={type.id}
                    value={type.name}
                    onSelect={() => handleTypeSelect(type)}
                    className="flex items-center justify-between"
                  >
                    <span>{type.name}</span>
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value?.id === type.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
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
  )
}