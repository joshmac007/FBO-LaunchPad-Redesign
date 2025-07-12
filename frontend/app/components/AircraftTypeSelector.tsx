"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
import { getAircraftTypes } from "@/app/services/aircraft-service"

interface AircraftTypeSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function AircraftTypeSelector({
  value,
  onChange,
  disabled,
}: AircraftTypeSelectorProps) {
  const [open, setOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [inputValue, setInputValue] = useState(value)

  const { data: aircraftTypes = [] } = useQuery({
    queryKey: ["aircraft-types"],
    queryFn: getAircraftTypes,
  })

  const handleInputChange = (value: string) => {
    setInputValue(value)
    setIsTyping(true)
    onChange(value)
  }

  const handleSelectAircraft = (selectedValue: string) => {
    setInputValue(selectedValue)
    setIsTyping(false)
    setOpen(false)
    onChange(selectedValue)
  }

  const filteredAircraftTypes = aircraftTypes.filter(type =>
    type.name.toLowerCase().includes(inputValue.toLowerCase())
  )

  const showCustomOption =
    isTyping &&
    inputValue.trim() &&
    !aircraftTypes.some(
      type => type.name.toLowerCase() === inputValue.toLowerCase()
    )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value || "Select or type aircraft type..."}
          <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder="Search or type aircraft type..."
            value={inputValue}
            onValueChange={handleInputChange}
          />
          <CommandList>
            <CommandEmpty>
              {inputValue.trim()
                ? "No aircraft type found."
                : "Start typing to search..."}
            </CommandEmpty>
            <CommandGroup>
              {filteredAircraftTypes.map(type => (
                <CommandItem
                  key={type.id}
                  value={type.name}
                  onSelect={() => handleSelectAircraft(type.name)}
                >
                  <Check
                    className={cn(
                      "mr-1.5 h-3.5 w-3.5",
                      value === type.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {type.name}
                </CommandItem>
              ))}
              {showCustomOption && (
                <CommandItem
                  value={inputValue}
                  onSelect={() => handleSelectAircraft(inputValue)}
                >
                  <Check className={cn("mr-1.5 h-3.5 w-3.5", "opacity-0")} />
                  Create "{inputValue}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}