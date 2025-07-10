"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Plus } from "lucide-react"
import ServiceItemCard from "./ServiceItemCard"
import { ExtendedReceipt } from "@/app/services/receipt-service"

interface ReceiptEditorProps {
  receipt: ExtendedReceipt
  onFuelQuantityChange: (quantity: string) => void
  onToggleWaiver: (lineItemId: number) => void
  onAddService: (serviceCode: string) => void
}

export default function ReceiptEditor({ 
  receipt, 
  onFuelQuantityChange, 
  onToggleWaiver,
  onAddService 
}: ReceiptEditorProps) {
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false)
  const [availableServices] = useState([
    { code: 'GPU', name: 'Ground Power Unit' },
    { code: 'AIR_START', name: 'Air Start Service' },
    { code: 'LAVATORY', name: 'Lavatory Service' },
    { code: 'WATER', name: 'Potable Water' },
  ])

  // Get fee line items and their corresponding waivers
  const feeLineItems = receipt.line_items?.filter(item => item.line_item_type === 'FEE') || []
  const waiverLineItems = receipt.line_items?.filter(item => item.line_item_type === 'WAIVER') || []

  const getRelatedWaiver = (feeItem: any) => {
    return waiverLineItems.find(waiver => 
      waiver.fee_code_applied === feeItem.fee_code_applied
    ) || null
  }

  const handleAddService = (serviceCode: string) => {
    onAddService(serviceCode)
    setIsAddServiceOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Fuel Details Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Fuel Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fuel-quantity">Fuel Quantity (Gallons)</Label>
              <Input
                id="fuel-quantity"
                data-testid="fuel-quantity-input"
                type="number"
                value={receipt.fuel_quantity_gallons_at_receipt_time || ''}
                onChange={(e) => onFuelQuantityChange(e.target.value)}
                placeholder="Enter gallons"
              />
            </div>
            <div>
              <Label htmlFor="fuel-type">Fuel Type</Label>
              <Input
                id="fuel-type"
                value={receipt.fuel_type_at_receipt_time || ''}
                disabled
                placeholder="Fuel type"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Fees Editor */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Service Fees</CardTitle>
          <Popover open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Service
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <Command>
                <CommandInput placeholder="Search services..." />
                <CommandList>
                  <CommandEmpty>No services found.</CommandEmpty>
                  <CommandGroup>
                    {availableServices.map((service) => (
                      <CommandItem
                        key={service.code}
                        onSelect={() => handleAddService(service.code)}
                      >
                        <div>
                          <div className="font-medium">{service.name}</div>
                          <div className="text-sm text-muted-foreground">{service.code}</div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardHeader>
        <CardContent>
          {feeLineItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No service fees calculated yet. Calculate fees to see itemized breakdown.
            </div>
          ) : (
            <div className="space-y-1">
              {feeLineItems.map((feeItem) => (
                <ServiceItemCard
                  key={feeItem.id}
                  lineItem={feeItem}
                  relatedWaiver={getRelatedWaiver(feeItem)}
                  onToggleWaiver={onToggleWaiver}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}