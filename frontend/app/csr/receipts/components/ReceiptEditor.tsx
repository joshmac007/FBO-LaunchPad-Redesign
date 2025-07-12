"use client";

import { useState } from "react";
import { useReceiptContext } from '../contexts/ReceiptContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus } from "lucide-react";
import LineItemCard from "./LineItemCard";

export default function ReceiptEditor() {
  const {
    receipt,
    addLineItem,
    availableServices,
  } = useReceiptContext();

  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);

  if (!receipt) {
    return null;
  }

  // Get all FEE and FUEL line items for editing
  const editableLineItems = receipt.line_items?.filter(
    item => item.line_item_type === 'FEE' || item.line_item_type === 'FUEL'
  ) || [];

  const onAddService = (serviceCode: string) => {
    addLineItem(serviceCode, 1); // Default quantity of 1
    setIsAddServiceOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Customer Information */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Customer: </span>
              <span>{receipt.customer_name || 'No customer selected'}</span>
            </div>
            <div>
              <span className="font-medium">Aircraft: </span>
              <span>{receipt.fuel_order_tail_number || receipt.aircraft_type_at_receipt_time || 'No aircraft information'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Services & Fuel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Add Services & Fuel</CardTitle>
          <Popover open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Line Item
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
          {editableLineItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No line items yet. Use the "Add Line Item" button to add services or fuel charges.
            </div>
          ) : (
            <div className="space-y-3">
              {editableLineItems.map((item) => (
                <LineItemCard
                  key={item.id}
                  item={item}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}