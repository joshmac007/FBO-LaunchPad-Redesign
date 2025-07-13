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
import { type Customer } from "@/app/services/customer-service"
import { CustomerCreationDialog } from "@/app/components/dialogs/CustomerCreationDialog"

interface CustomerSearchInputProps {
  value: Customer | null
  onValueChange: (customer: Customer | null) => void
  placeholder?: string
  className?: string
}

interface CustomerSearchResult {
  customers: Customer[]
  message: string
}

// API function for searching customers
async function searchCustomers(query: string): Promise<CustomerSearchResult> {
  if (!query.trim()) {
    return { customers: [], message: "No query provided" }
  }

  const response = await fetch(`${API_BASE_URL}/api/search/customers?q=${encodeURIComponent(query)}`, {
    method: "GET",
    headers: getAuthHeaders(),
  })

  return await handleApiResponse<CustomerSearchResult>(response)
}

export function CustomerSearchInput({
  value,
  onValueChange,
  placeholder = "Search customers...",
  className,
}: CustomerSearchInputProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddingNew, setIsAddingNew] = useState(false)

  const { debouncedSearchTerm } = useSearchDebounce(searchTerm, 300)

  // Search customers API call
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['customerSearch', debouncedSearchTerm],
    queryFn: () => searchCustomers(debouncedSearchTerm),
    enabled: debouncedSearchTerm.length > 0,
    staleTime: 30000, // Cache results for 30 seconds
  })

  const customers = searchResults?.customers || []

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    onValueChange(customer)
    setOpen(false)
    setSearchTerm("")
  }

  // Handle new customer creation success
  const handleCustomerCreated = (newCustomer: Customer) => {
    onValueChange(newCustomer)
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
              <span className="flex items-center gap-2">
                <span className="font-medium">{value.name}</span>
                {value.company_name && (
                  <span className="text-sm text-muted-foreground">
                    ({value.company_name})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search by name or company..."
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              {isLoading && debouncedSearchTerm.length > 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Searching customers...
                </div>
              )}

              {!isLoading && debouncedSearchTerm.length > 0 && customers.length === 0 && (
                <CommandEmpty>
                  <div className="py-6 text-center">
                    <div className="text-sm text-muted-foreground mb-2">
                      No customers found for "{debouncedSearchTerm}"
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setIsAddingNew(true)}
                      className="mt-2"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Customer
                    </Button>
                  </div>
                </CommandEmpty>
              )}

              {customers.length > 0 && (
                <CommandGroup>
                  {customers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={`${customer.name} ${customer.company_name || ""}`}
                      onSelect={() => handleCustomerSelect(customer)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{customer.name}</span>
                        {customer.company_name && (
                          <span className="text-sm text-muted-foreground">
                            {customer.company_name}
                          </span>
                        )}
                      </div>
                      <Check
                        className={cn(
                          "h-4 w-4",
                          value?.id === customer.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {debouncedSearchTerm.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Start typing to search for customers...
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

      <CustomerCreationDialog
        open={isAddingNew}
        onOpenChange={setIsAddingNew}
        onSuccess={handleCustomerCreated}
      />
    </>
  )
}