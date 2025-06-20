"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Loader2, AlertCircle, User, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getAllAdminCustomers, type Customer } from "../services/customer-service"

interface CustomerSelectorProps {
  onCustomerSelected?: (customer: Customer) => void
  onCustomerCleared?: () => void
  initialCustomerId?: number
  className?: string
  required?: boolean
}

export default function CustomerSelector({
  onCustomerSelected,
  onCustomerCleared,
  initialCustomerId,
  className = "",
  required = false,
}: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoadedCustomers, setHasLoadedCustomers] = useState(false)

  // Load customers from API
  const loadCustomers = useCallback(async () => {
    if (hasLoadedCustomers) return // Only load once
    
    setIsLoading(true)
    setError(null)
    
    try {
      const customerList = await getAllAdminCustomers()
      setCustomers(customerList)
      setFilteredCustomers(customerList)
      setHasLoadedCustomers(true)
      
      // If initialCustomerId is provided, find and select that customer
      if (initialCustomerId) {
        const initialCustomer = customerList.find(c => c.id === initialCustomerId)
        if (initialCustomer) {
          setSelectedCustomer(initialCustomer)
          if (onCustomerSelected) {
            onCustomerSelected(initialCustomer)
          }
        }
      }
    } catch (err) {
      console.error("Error loading customers:", err)
      setError("Failed to load customers. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [hasLoadedCustomers, initialCustomerId, onCustomerSelected])

  // Load customers when component mounts or when popover opens
  useEffect(() => {
    if (isOpen && !hasLoadedCustomers) {
      loadCustomers()
    }
  }, [isOpen, hasLoadedCustomers, loadCustomers])

  // Filter customers based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = customers.filter(customer => 
      customer.name.toLowerCase().includes(query) ||
      customer.email.toLowerCase().includes(query) ||
      customer.id.toString().includes(query)
    )
    setFilteredCustomers(filtered)
  }, [searchQuery, customers])

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsOpen(false)
    setSearchQuery("")
    
    if (onCustomerSelected) {
      onCustomerSelected(customer)
    }
  }

  const handleClearSelection = () => {
    setSelectedCustomer(null)
    setSearchQuery("")
    
    if (onCustomerCleared) {
      onCustomerCleared()
    }
  }

  const handlePopoverOpen = (open: boolean) => {
    setIsOpen(open)
    if (open && !hasLoadedCustomers) {
      loadCustomers()
    }
    if (!open) {
      setSearchQuery("")
    }
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        <Label htmlFor="customer-selector">
          Customer {required && <span className="text-red-500">*</span>}
        </Label>
        
        <Popover open={isOpen} onOpenChange={handlePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              id="customer-selector"
              variant="outline"
              role="combobox"
              aria-expanded={isOpen}
              className="w-full justify-between text-left font-normal"
            >
              {selectedCustomer ? (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="truncate">{selectedCustomer.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    ID: {selectedCustomer.id}
                  </Badge>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-500">
                  <User className="h-4 w-4" />
                  <span>Search customers...</span>
                </div>
              )}
              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <div className="flex items-center border-b px-3">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <Input
                  placeholder="Search by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 focus:ring-0 focus:outline-none bg-transparent"
                  data-cy="customer-search"
                />
                {isLoading && (
                  <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
                )}
              </div>
              
              <CommandList className="max-h-[300px]">
                {error ? (
                  <div className="p-4 text-sm text-red-500 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={loadCustomers}
                      className="ml-auto"
                    >
                      Retry
                    </Button>
                  </div>
                ) : !hasLoadedCustomers && isLoading ? (
                  <div className="p-4 text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading customers...
                  </div>
                ) : filteredCustomers.length === 0 && searchQuery ? (
                  <CommandEmpty>
                    No customers found matching "{searchQuery}"
                  </CommandEmpty>
                ) : filteredCustomers.length === 0 ? (
                  <CommandEmpty>
                    No customers available
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {filteredCustomers.map((customer) => (
                      <CommandItem
                        key={customer.id}
                        value={`${customer.name} ${customer.email} ${customer.id}`}
                        onSelect={() => handleCustomerSelect(customer)}
                        className="cursor-pointer"
                        data-cy="customer-option"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <User className="h-4 w-4 text-gray-500" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{customer.name}</div>
                            <div className="text-sm text-gray-500 truncate">{customer.email}</div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            ID: {customer.id}
                          </Badge>
                          {selectedCustomer?.id === customer.id && (
                            <Check className="ml-2 h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {selectedCustomer && (
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-blue-800">
                  Selected Customer
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                  className="text-blue-600 hover:text-blue-800 h-6 w-6 p-0"
                >
                  <AlertCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium text-blue-800">{selectedCustomer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="text-blue-700">{selectedCustomer.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer ID:</span>
                  <span className="font-mono text-blue-700">{selectedCustomer.id}</span>
                </div>
                {selectedCustomer.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="text-blue-700">{selectedCustomer.phone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fallback: Direct ID input for backwards compatibility */}
        {!selectedCustomer && (
          <div className="pt-2 border-t">
            <Label htmlFor="customer-id-fallback" className="text-sm text-gray-600">
              Or enter Customer ID directly:
            </Label>
            <Input
              id="customer-id-fallback"
              type="number"
              placeholder="Enter customer ID"
              className="mt-1"
              onChange={(e) => {
                const id = parseInt(e.target.value)
                if (id && customers.length > 0) {
                  const customer = customers.find(c => c.id === id)
                  if (customer) {
                    handleCustomerSelect(customer)
                  }
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
} 