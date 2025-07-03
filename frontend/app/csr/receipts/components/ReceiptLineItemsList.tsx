"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ToggleLeft, ToggleRight } from "lucide-react"
import { ReceiptLineItem } from "@/app/services/receipt-service"
import { formatCurrency } from "@/app/services/utils"
import { type AvailableService } from "@/app/services/fee-service"

interface ReceiptLineItemsListProps {
  lineItems: ReceiptLineItem[] | undefined
  availableServices?: AvailableService[]
  receiptStatus?: string
  onToggleWaiver?: (lineItemId: number) => Promise<void>
  isTogglingWaiver?: number | null // ID of line item currently being toggled
}

export default function ReceiptLineItemsList({ 
  lineItems, 
  availableServices = [], 
  receiptStatus = 'DRAFT', 
  onToggleWaiver,
  isTogglingWaiver 
}: ReceiptLineItemsListProps) {
  const getLineItemTypeColor = (type: string) => {
    switch (type) {
      case 'FUEL':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100'
      case 'FEE':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-100'
      case 'WAIVER':
        return 'bg-green-100 text-green-800 hover:bg-green-100'
      case 'TAX':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-100'
      case 'DISCOUNT':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100'
    }
  }

  const isNegativeLineItem = (type: string) => {
    return type === 'WAIVER' || type === 'DISCOUNT'
  }

  const shouldShowWaiverToggle = (lineItem: ReceiptLineItem) => {
    // Only show toggle for FEE line items in DRAFT status when toggle function is provided
    if (lineItem.line_item_type !== 'FEE' || receiptStatus !== 'DRAFT' || !onToggleWaiver) {
      return false
    }

    // Check if this fee is waivable by looking up in available services
    const service = availableServices.find(s => s.code === lineItem.fee_code_applied)
    return service?.is_potentially_waivable_by_fuel_uplift === true
  }

  const isWaiverApplied = (lineItem: ReceiptLineItem) => {
    // A fee has a waiver applied if there's a corresponding waiver line item
    if (!lineItems) return false
    return lineItems.some(item => 
      item.line_item_type === 'WAIVER' && 
      item.fee_code_applied === lineItem.fee_code_applied
    )
  }

  if (!lineItems || lineItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receipt Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No line items calculated yet. Click "Calculate Fees" to generate itemized breakdown.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receipt Line Items</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {receiptStatus === 'DRAFT' && onToggleWaiver && (
                <TableHead className="text-center">Waiver</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map((item) => (
              <TableRow 
                key={item.id}
                data-cy={`line-item-${item.lineItemType.toLowerCase()}`}
                className={isNegativeLineItem(item.lineItemType) ? 'bg-green-50' : ''}
              >
                <TableCell>
                  <Badge className={getLineItemTypeColor(item.lineItemType)}>
                    {item.lineItemType}
                  </Badge>
                </TableCell>
                <TableCell 
                  className={isNegativeLineItem(item.lineItemType) ? 'text-green-700 font-medium pl-4' : ''}
                >
                  {item.description}
                </TableCell>
                <TableCell className="text-right">
                  {item.quantity}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.unitPrice)}
                </TableCell>
                <TableCell 
                  className={`text-right font-medium ${
                    isNegativeLineItem(item.lineItemType) ? 'text-green-600' : ''
                  }`}
                >
                  {formatCurrency(item.amount)}
                </TableCell>
                {receiptStatus === 'DRAFT' && onToggleWaiver && (
                  <TableCell className="text-center">
                    {shouldShowWaiverToggle(item) ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleWaiver(item.id)}
                        disabled={isTogglingWaiver === item.id}
                        className="h-8 w-8 p-0"
                        data-cy="toggle-waiver-btn"
                      >
                        {isTogglingWaiver === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isWaiverApplied(item) ? (
                          <ToggleRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    ) : null}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
} 