"use client";

import { useState } from "react";
import { useReceiptContext } from '../contexts/ReceiptContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus } from "lucide-react";
import ServiceItemCard from "./ServiceItemCard";

export default function ReceiptEditor() {
  const {
    receipt,
    handleFuelQuantityChange,
    handleToggleWaiver,
    handleAddService,
    isManualReceipt,
    handleFuelTypeChange,
    handleFuelPriceChange,
    availableServices,
  } = useReceiptContext();

  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);

  if (!receipt) {
    return null;
  }
  
  // Get fee line items and their corresponding waivers
  const feeLineItems = receipt.line_items?.filter(item => item.line_item_type === 'FEE') || [];
  const waiverLineItems = receipt.line_items?.filter(item => item.line_item_type === 'WAIVER') || [];

  const getRelatedWaiver = (feeItem: any) => {
    return waiverLineItems.find(waiver => 
      waiver.fee_code_applied === feeItem.fee_code_applied
    ) || null;
  };

  const onAddService = (serviceCode: string) => {
    handleAddService(serviceCode);
    setIsAddServiceOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Fuel Details Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Fuel Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isManualReceipt ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fuel-quantity-manual">Fuel Quantity (Gallons)</Label>
                <Input
                  id="fuel-quantity-manual"
                  data-testid="fuel-quantity-manual-input"
                  type="number"
                  value={receipt.fuel_quantity_gallons_at_receipt_time || ''}
                  onChange={(e) => handleFuelQuantityChange(e.target.value)}
                  placeholder="Enter gallons"
                />
              </div>
              <div>
                <Label htmlFor="fuel-type-manual">Fuel Type</Label>
                <Input
                  id="fuel-type-manual"
                  value={receipt.fuel_type_at_receipt_time || ''}
                  onChange={(e) => handleFuelTypeChange(e.target.value)}
                  placeholder="Enter fuel type (e.g., Jet A, Avgas 100LL)"
                />
              </div>
              <div>
                <Label htmlFor="fuel-price">Price per Gallon</Label>
                <Input
                  id="fuel-price"
                  data-testid="fuel-price-input"
                  type="number"
                  step="0.01"
                  value={receipt.fuel_unit_price_at_receipt_time || ''}
                  onChange={(e) => handleFuelPriceChange(e.target.value)}
                  placeholder="Enter price per gallon"
                />
              </div>
              <div>
                <Label htmlFor="fuel-subtotal">Fuel Subtotal</Label>
                <Input
                  id="fuel-subtotal"
                  value={receipt.fuel_subtotal || '0.00'}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fuel-quantity">Fuel Quantity (Gallons)</Label>
                <Input
                  id="fuel-quantity"
                  data-testid="fuel-quantity-input"
                  type="number"
                  value={receipt.fuel_quantity_gallons_at_receipt_time || ''}
                  onChange={(e) => handleFuelQuantityChange(e.target.value)}
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
          )}
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
                        onSelect={() => onAddService(service.code)}
                      >
                        <div>
                          <div className="font-medium">{service.fee_name}</div>
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
                  onToggleWaiver={handleToggleWaiver}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}