"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2 } from "lucide-react"
import { ExtendedReceipt } from "@/app/services/receipt-service"
import { formatCurrency } from "@/app/services/utils"

interface ReceiptPreviewProps {
  receipt: ExtendedReceipt
  isRecalculating?: boolean
}

export default function ReceiptPreview({ receipt, isRecalculating = false }: ReceiptPreviewProps) {
  const getLineItemTypeColor = (type: string) => {
    switch (type) {
      case 'FUEL':
        return 'bg-blue-100 text-blue-800'
      case 'FEE':
        return 'bg-orange-100 text-orange-800'
      case 'WAIVER':
        return 'bg-green-100 text-green-800'
      case 'TAX':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const renderWaiverBadge = (item: any) => {
    if (item.line_item_type !== 'WAIVER') return null
    
    if (item.waiver_source === 'AUTOMATIC') {
      return <span className="text-xs text-green-600 ml-2">[⛽ Auto-waived]</span>
    } else if (item.waiver_source === 'MANUAL') {
      return <span className="text-xs text-blue-600 ml-2">[👤 Manually Waived]</span>
    }
    return null
  }

  const formatTotal = (amount: string | undefined) => {
    if (isRecalculating) {
      return (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {formatCurrency(amount || '0')}
        </span>
      )
    }
    return formatCurrency(amount || '0')
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Receipt Preview
          {isRecalculating && (
            <Badge variant="secondary" className="gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Recalculating...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Receipt Header */}
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">FBO LaunchPad</h3>
          <p className="text-sm text-muted-foreground">Aviation Services Receipt</p>
          {receipt.receipt_number && (
            <p className="text-sm font-mono">#{receipt.receipt_number}</p>
          )}
        </div>

        <Separator />

        {/* Aircraft & Customer Info */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Tail Number:</span>
            <span className="text-sm font-medium">{receipt.fuel_order_tail_number || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Aircraft Type:</span>
            <span className="text-sm">{receipt.aircraft_type_at_receipt_time || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Fuel Type:</span>
            <span className="text-sm">{receipt.fuel_type_at_receipt_time || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Fuel Quantity:</span>
            <span className="text-sm">{receipt.fuel_quantity_gallons_at_receipt_time || '0'} gal</span>
          </div>
        </div>

        <Separator />

        {/* Line Items */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Line Items</h4>
          {receipt.line_items && receipt.line_items.length > 0 ? (
            <div className="space-y-2">
              {receipt.line_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge size="sm" className={getLineItemTypeColor(item.line_item_type)}>
                      {item.line_item_type}
                    </Badge>
                    <span className="flex-1">{item.description}</span>
                    {renderWaiverBadge(item)}
                  </div>
                  <span className={`font-medium ${
                    item.line_item_type === 'WAIVER' ? 'text-green-600' : ''
                  }`}>
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No line items calculated yet
            </p>
          )}
        </div>

        <Separator />

        {/* Totals */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Totals</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fuel Subtotal:</span>
              <span>{formatTotal(receipt.fuel_subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Fees:</span>
              <span>{formatTotal(receipt.total_fees_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Waivers:</span>
              <span className="text-green-600">{formatTotal(receipt.total_waivers_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax:</span>
              <span>{formatTotal(receipt.tax_amount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Grand Total:</span>
              <span className="text-lg">{formatTotal(receipt.grand_total_amount)}</span>
            </div>
          </div>
        </div>

        {receipt.is_caa_applied && (
          <div className="mt-4">
            <Badge variant="secondary" className="w-full justify-center">
              CAA Member Discount Applied
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}