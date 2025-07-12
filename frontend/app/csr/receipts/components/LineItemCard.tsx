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
  const { receipt, removeLineItem, handleToggleWaiver, updateLineItemQuantity, updateLineItemUnitPrice } = useReceiptContext()
  const [quantity, setQuantity] = useState(item.quantity)
  const [unitPrice, setUnitPrice] = useState(item.unit_price)
  
  // Debounce the values to prevent excessive API calls
  const debouncedQuantity = useDebounce(quantity, 1000)
  const debouncedUnitPrice = useDebounce(unitPrice, 1000)

  // Sync local state with prop changes (when the item updates from backend)
  useEffect(() => {
    setQuantity(item.quantity)
    setUnitPrice(item.unit_price)
  }, [item.quantity, item.unit_price])

  // Handle debounced quantity updates
  useEffect(() => {
    const numericQuantity = parseFloat(debouncedQuantity)
    const originalQuantity = parseFloat(item.quantity)
    
    if (!isNaN(numericQuantity) && numericQuantity !== originalQuantity && numericQuantity >= 0) {
      updateLineItemQuantity(item.id, numericQuantity)
    }
  }, [debouncedQuantity, item.id, item.quantity, updateLineItemQuantity])

  // Handle debounced unit price updates (fuel items only)
  useEffect(() => {
    const numericUnitPrice = parseFloat(debouncedUnitPrice)
    const originalUnitPrice = parseFloat(item.unit_price)
    
    if (item.line_item_type === 'FUEL' && !isNaN(numericUnitPrice) && numericUnitPrice !== originalUnitPrice && numericUnitPrice >= 0) {
      updateLineItemUnitPrice(item.id, numericUnitPrice)
    }
  }, [debouncedUnitPrice, item.id, item.unit_price, item.line_item_type, updateLineItemUnitPrice])

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

  const renderWaiverButton = () => {
    if (!item.is_manually_waivable) return null

    if (isWaived) {
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleWaiverClick}
          className="h-8 px-3 text-green-700 border-green-200 bg-green-50 hover:bg-green-100"
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
        className="h-8 px-3 text-blue-700 border-blue-200 hover:bg-blue-50"
      >
        Waive
      </Button>
    )
  }

  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="font-medium text-sm">{item.description}</div>
              {item.fee_code_applied && (
                <Badge variant="outline" className="text-xs">{item.fee_code_applied}</Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Quantity:</span>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-20 h-8"
                  min="0"
                  step={item.line_item_type === 'FUEL' ? "0.1" : "1"}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Unit Price:</span>
                {item.line_item_type === 'FUEL' ? (
                  <Input
                    type="number"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-24 h-8"
                    min="0"
                    step="0.01"
                  />
                ) : (
                  <span className="text-sm font-medium">{formatCurrency(item.unit_price)}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {renderWaiverButton()}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemove}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}