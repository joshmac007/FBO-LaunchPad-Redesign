"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Trash2 } from "lucide-react"
import { formatCurrency } from "@/app/services/utils"
import { ReceiptLineItem } from "@/app/services/receipt-service"
import { useReceiptContext } from "../contexts/ReceiptContext"
import { useDebounce } from "@/hooks/useDebounce"

interface LineItemCardProps {
  item: ReceiptLineItem
}

export default function LineItemCard({ item }: LineItemCardProps) {
  const { receipt, removeLineItem, handleToggleWaiver, updateLineItemQuantity, fuelTypes } = useReceiptContext()
  const [quantity, setQuantity] = useState(item.quantity)
  
  // Debounce the quantity value to prevent excessive API calls
  const debouncedQuantity = useDebounce(quantity, 1000)

  // Sync local state with prop changes (when the item updates from backend)
  useEffect(() => {
    setQuantity(item.quantity)
  }, [item.quantity])

  // Handle debounced quantity updates
  useEffect(() => {
    const numericQuantity = parseFloat(debouncedQuantity)
    const originalQuantity = parseFloat(item.quantity)
    
    if (!isNaN(numericQuantity) && numericQuantity !== originalQuantity && numericQuantity >= 0) {
      updateLineItemQuantity(item.id, numericQuantity)
    }
  }, [debouncedQuantity, item.id, item.quantity, updateLineItemQuantity])

  // Determine if this fee item is waived by checking for a corresponding WAIVER item
  const isWaived = receipt?.line_items.some(
    waiver => waiver.line_item_type === 'WAIVER' && 
    (waiver.description === item.description || waiver.fee_code_applied === item.fee_code_applied)
  ) || false

  const handleRemove = () => {
    removeLineItem(item.id)
  }

  const handleToggleWaiverClick = () => {
    handleToggleWaiver(item.id)
  }

  // Helper function to get fuel type name from code
  const getFuelTypeName = (fuelTypeCode: string | null | undefined): string => {
    if (!fuelTypeCode) return 'Fuel';
    
    const fuelType = fuelTypes.find(ft => ft.code === fuelTypeCode);
    return fuelType ? fuelType.name : fuelTypeCode;
  };

  const renderWaiverButton = () => {
    if (!item.is_manually_waivable) return null

    if (isWaived) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleWaiverClick}
          className="h-7 px-2 text-xs text-green-700 border-green-200 bg-green-50 hover:bg-green-100"
        >
          ✅ Waived
        </Button>
      )
    }

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggleWaiverClick}
        className="h-7 px-2 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
      >
        Waive
      </Button>
    )
  }

  return (
    <Card className="border-0 bg-gray-50">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Description with integrated fee code */}
          <div className="flex-1">
            <div className="font-medium text-sm">
              {item.line_item_type === 'FUEL' && receipt?.fuel_type_at_receipt_time ? 
                item.description.replace(/^Fuel/, getFuelTypeName(receipt.fuel_type_at_receipt_time)) : 
                item.description
              }
              {item.fee_code_applied && (
                <span className="text-xs text-muted-foreground ml-2">({item.fee_code_applied})</span>
              )}
            </div>
          </div>
          
          {/* Quantity */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Quantity:</span>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-16 h-7 text-sm"
              min="0"
              step="1"
            />
          </div>
          
          {/* Unit Price */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Unit Price:</span>
            <span className="text-sm font-medium min-w-[4rem] text-right">{formatCurrency(item.unit_price)}</span>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1">
            {renderWaiverButton()}
            {item.line_item_type === 'FEE' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemove}
                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}