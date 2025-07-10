"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatCurrency } from "@/app/services/utils"
import { ReceiptLineItem } from "@/app/services/receipt-service"

interface ServiceItemCardProps {
  lineItem: ReceiptLineItem
  relatedWaiver: ReceiptLineItem | null
  onToggleWaiver: (lineItemId: number) => void
}

export default function ServiceItemCard({ 
  lineItem, 
  relatedWaiver, 
  onToggleWaiver 
}: ServiceItemCardProps) {
  const renderWaiverControls = () => {
    // Case 1: Related waiver exists with AUTOMATIC source
    if (relatedWaiver && relatedWaiver.waiver_source === 'AUTOMATIC') {
      return (
        <Badge variant="secondary" className="gap-1 text-green-700 bg-green-50 border-green-200">
          <span>⛽</span>
          Auto-waived
        </Badge>
      )
    }
    
    // Case 2: Related waiver exists with MANUAL source
    if (relatedWaiver && relatedWaiver.waiver_source === 'MANUAL') {
      return (
        <Badge 
          variant="outline" 
          className="gap-1 cursor-pointer hover:bg-blue-50 text-blue-700 border-blue-200"
          onClick={() => onToggleWaiver(lineItem.id)}
        >
          <span>👤</span>
          Manually Waived
        </Badge>
      )
    }
    
    // Case 3: No waiver but line item is manually waivable
    if (lineItem.line_item_type === 'FEE' && lineItem.is_manually_waivable) {
      return (
        <Button 
          variant="link" 
          size="sm" 
          onClick={() => onToggleWaiver(lineItem.id)}
          className="h-auto p-0 text-blue-600 hover:text-blue-800 text-sm"
        >
          (Waive)
        </Button>
      )
    }
    
    // Case 4: No waiver control needed
    return null
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div>
                <h4 className="font-medium text-sm">{lineItem.description}</h4>
                <div className="text-xs text-muted-foreground">
                  {lineItem.fee_code_applied && `Code: ${lineItem.fee_code_applied}`}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Qty: {lineItem.quantity}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-medium">{formatCurrency(lineItem.amount)}</div>
              {lineItem.unit_price !== lineItem.amount && (
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(lineItem.unit_price)} each
                </div>
              )}
            </div>
            
            {renderWaiverControls()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}