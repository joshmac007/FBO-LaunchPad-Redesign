"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ExtendedReceipt } from "@/app/services/receipt-service"
import { formatCurrency } from "@/app/services/utils"

interface ReceiptTotalsProps {
  receipt: ExtendedReceipt
}

export default function ReceiptTotals({ receipt }: ReceiptTotalsProps) {
  const hasCalculatedTotals = receipt.grandTotalAmount !== undefined && receipt.grandTotalAmount > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receipt Totals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasCalculatedTotals ? (
          <div className="text-center py-8 text-muted-foreground">
            Totals will appear here after calculating fees
          </div>
        ) : (
          <div className="space-y-3">
            {/* Fuel Subtotal */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Fuel Subtotal:</span>
              <span className="text-sm">
                {formatCurrency(receipt.fuelSubtotal || 0)}
              </span>
            </div>

            {/* Total Fees */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Fees:</span>
              <span className="text-sm">
                {formatCurrency(receipt.totalFeesAmount || 0)}
              </span>
            </div>

            {/* Total Waivers */}
            {receipt.totalWaiversAmount !== undefined && receipt.totalWaiversAmount !== 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-700">Total Waivers:</span>
                <span className="text-sm text-green-600 font-medium">
                  {formatCurrency(receipt.totalWaiversAmount)}
                </span>
              </div>
            )}

            {/* Tax Amount */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Tax:</span>
              <span className="text-sm">
                {formatCurrency(receipt.taxAmount || 0)}
              </span>
            </div>

            <Separator />

            {/* Grand Total */}
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">Grand Total:</span>
              <span 
                className="text-lg font-bold text-primary"
                data-cy="grand-total"
              >
                {formatCurrency(receipt.grandTotalAmount || 0)}
              </span>
            </div>

            {/* CAA Applied Indicator */}
            {receipt.isCaaApplied && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-blue-700 font-medium">
                    Customer Advantage Agreement (CAA) Applied
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 