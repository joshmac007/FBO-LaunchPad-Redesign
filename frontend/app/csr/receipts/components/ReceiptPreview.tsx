"use client";

import { useReceiptContext } from '../contexts/ReceiptContext';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { formatCurrency } from "@/app/services/utils";

export default function ReceiptPreview() {
  const { receipt, status, fuelTypes } = useReceiptContext();
  const isRecalculating = status === 'calculating_fees';

  // Helper function to get fuel type name from code
  const getFuelTypeName = (fuelTypeCode: string | null | undefined): string => {
    if (!fuelTypeCode) return 'Fuel';
    
    const fuelType = fuelTypes.find(ft => ft.code === fuelTypeCode);
    return fuelType ? fuelType.name : fuelTypeCode;
  };

  if (!receipt) {
    return (
      <Card className="h-fit">
        <CardContent className="p-8">
          <p className="text-muted-foreground text-center">No receipt data available.</p>
        </CardContent>
      </Card>
    );
  }

  // Helper function to get waiver for a fee item
  const getWaiverForFeeItem = (feeItem: any) => {
    return receipt.line_items?.find(item => 
      item.line_item_type === 'WAIVER' && 
      (item.description === feeItem.description || item.fee_code_applied === feeItem.fee_code_applied)
    );
  };

  // Get the line items to display (excluding standalone WAIVER items)
  const displayLineItems = receipt.line_items?.filter(item => 
    item.line_item_type === 'FUEL' || item.line_item_type === 'FEE'
  ) || [];

  return (
    <Card className="h-fit">
      <CardContent className="p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">FBO LaunchPad</h1>
            <p className="text-sm text-muted-foreground">123 Aviation Way, Airport City, AC 12345</p>
            <p className="text-sm text-muted-foreground">Phone: (555) 123-FUEL | Email: service@fbolaunchpad.com</p>
          </div>
          <div className="bg-primary/10 p-3 rounded">
            <h2 className="text-xl font-semibold">RECEIPT</h2>
            {isRecalculating && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Recalculating...</span>
              </div>
            )}
          </div>
          <div className="flex justify-between text-sm">
            <div>Receipt #: <span className="font-mono">{receipt.receipt_number || 'DRAFT'}</span></div>
            <div>Date: {receipt.generated_at ? new Date(receipt.generated_at).toLocaleDateString() : new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <Separator />

        {/* Bill To Section */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Bill To:</h3>
          <div className="pl-4 space-y-1">
            <div><span className="font-medium">{receipt.customer_name || 'Walk-in Customer'}</span></div>
            <div>Aircraft: {receipt.fuel_order_tail_number || receipt.aircraft_type_at_receipt_time || 'N/A'}</div>
            {receipt.fuel_order_tail_number && receipt.aircraft_type_at_receipt_time && (
              <div>Type: {receipt.aircraft_type_at_receipt_time}</div>
            )}
          </div>
        </div>

        <Separator />

        {/* Line Items Table */}
        <div className="space-y-3">
          <div className="grid grid-cols-12 gap-2 text-sm font-semibold border-b pb-2">
            <div className="col-span-6">DESCRIPTION</div>
            <div className="col-span-2 text-center">QTY</div>
            <div className="col-span-2 text-right">UNIT PRICE</div>
            <div className="col-span-2 text-right">TOTAL</div>
          </div>
          
          {displayLineItems.length > 0 ? (
            <div className="space-y-2">
              {displayLineItems.map((item) => {
                const waiver = getWaiverForFeeItem(item);
                const isWaived = !!waiver;
                
                return (
                  <div key={item.id} className="grid grid-cols-12 gap-2 text-sm">
                    <div className="col-span-6">
                      {item.line_item_type === 'FUEL' && receipt?.fuel_type_at_receipt_time ? 
                        item.description.replace(/^Fuel/, getFuelTypeName(receipt.fuel_type_at_receipt_time)) : 
                        item.description
                      }
                    </div>
                    <div className="col-span-2 text-center">{item.quantity}</div>
                    <div className="col-span-2 text-right">{formatCurrency(parseFloat(item.unit_price))}</div>
                    <div className="col-span-2 text-right flex items-center justify-end gap-2">
                      {isWaived ? (
                        <>
                          <span className="text-red-600">-{formatCurrency(parseFloat(waiver.amount))}</span>
                          <Badge variant="secondary" className="text-xs">Waived</Badge>
                        </>
                      ) : (
                        <span>{formatCurrency(parseFloat(item.amount))}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No line items available
            </div>
          )}
        </div>

        <Separator />

        {/* Totals Section */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(parseFloat(receipt.fuel_subtotal || '0') + parseFloat(receipt.total_fees_amount || '0'))}</span>
          </div>
          <div className="flex justify-between">
            <span>Taxes (7.5%):</span>
            <span>{formatCurrency(parseFloat(receipt.tax_amount || '0'))}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-semibold">
            <span>Total:</span>
            <span>{formatCurrency(parseFloat(receipt.grand_total_amount || '0'))}</span>
          </div>
        </div>

        {receipt.is_caa_applied && (
          <div className="mt-4">
            <Badge variant="secondary" className="w-full justify-center">
              CAA Member Discount Applied
            </Badge>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground border-t pt-4">
          Thank you for choosing FBO LaunchPad for your aviation services.
        </div>
      </CardContent>
    </Card>
  )
}