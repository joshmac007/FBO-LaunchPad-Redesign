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
    <div className="h-fit">
      {/* Receipt # and Status - Outside the receipt */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-sm text-gray-600">Receipt #{receipt.receipt_number || 'DRAFT'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={receipt.status === 'DRAFT' ? 'secondary' : 'default'} className="text-xs">
            {receipt.status}
          </Badge>
          {isRecalculating && (
            <div className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-xs text-gray-500">Recalculating...</span>
            </div>
          )}
        </div>
      </div>

      <Card className="bg-white shadow-sm border">
        <CardContent className="p-6">
          {/* Header with FBO name and Receipt title */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Atlantic Aviation FBO</h1>
            <p className="text-sm text-gray-600">123 Airport Rd, Anytown, USA</p>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">RECEIPT</h2>
          </div>
        </div>

        <div className="border-t border-gray-300 mb-4"></div>

        {/* Bill To Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">BILL TO</h3>
            <div className="space-y-1">
              <div className="font-medium">{receipt.customer_name || 'Walk-in Customer'}</div>
              <div className="text-sm text-gray-600">Global Air Charters</div>
              <div className="text-sm">{receipt.fuel_order_tail_number || 'N/A'}</div>
            </div>
          </div>
          <div>
            <div className="text-right space-y-1">
              <div>
                <span className="text-sm text-gray-600">RECEIPT # </span>
                <span className="font-mono">{receipt.receipt_number || 'DRAFT'}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">DATE </span>
                <span>{receipt.generated_at ? new Date(receipt.generated_at).toLocaleDateString() : new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border-t border-gray-300 mb-4"></div>
        
        {displayLineItems.length > 0 ? (
          <div className="space-y-3">
            {/* Table Headers */}
            <div className="grid grid-cols-12 gap-2 text-sm font-medium text-gray-700 border-b border-gray-300 pb-2">
              <div className="col-span-5">DESCRIPTION</div>
              <div className="col-span-2 text-center">QUANTITY</div>
              <div className="col-span-2 text-right">UNIT PRICE</div>
              <div className="col-span-3 text-right">TOTAL</div>
            </div>
            
            {/* Line Items */}
            <div className="space-y-1">
              {displayLineItems.map((item) => {
                const waiver = getWaiverForFeeItem(item);
                const isWaived = !!waiver;
                
                return (
                  <div key={item.id}>
                    <div className="grid grid-cols-12 gap-2 text-sm py-1">
                      <div className="col-span-5">
                        {item.line_item_type === 'FUEL' && receipt?.fuel_type_at_receipt_time ? 
                          item.description.replace(/^Fuel/, getFuelTypeName(receipt.fuel_type_at_receipt_time)) : 
                          item.description
                        }
                        {item.line_item_type === 'FUEL' && (
                          <span className="text-gray-500"> {item.quantity} GAL</span>
                        )}
                      </div>
                      <div className="col-span-2 text-center">
                        {item.line_item_type !== 'FUEL' ? item.quantity : ''}
                      </div>
                      <div className="col-span-2 text-right">
                        {formatCurrency(parseFloat(item.unit_price))}
                      </div>
                      <div className="col-span-3 text-right">
                        {formatCurrency(parseFloat(item.amount))}
                      </div>
                    </div>
                    {isWaived && (
                      <div className="grid grid-cols-12 gap-2 text-sm py-1">
                        <div className="col-span-5 pl-4 text-green-600">Waived</div>
                        <div className="col-span-2"></div>
                        <div className="col-span-2"></div>
                        <div className="col-span-3 text-right text-green-600">
                          -{formatCurrency(parseFloat(waiver.amount))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No line items available
          </div>
        )}

        {/* Totals Section */}
        <div className="mt-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span></span>
            <span>Subtotal {formatCurrency(parseFloat(receipt.fuel_subtotal || '0') + parseFloat(receipt.total_fees_amount || '0') + parseFloat(receipt.total_waivers_amount || '0'))}</span>
          </div>
          
          {parseFloat(receipt.tax_amount || '0') > 0 && (
            <div className="flex justify-between text-sm">
              <span></span>
              <span>Taxes (7.5%) {formatCurrency(parseFloat(receipt.tax_amount || '0'))}</span>
            </div>
          )}
          
          <div className="border-t border-gray-300 pt-2">
            <div className="flex justify-between text-base font-bold">
              <span></span>
              <span>Total {formatCurrency(parseFloat(receipt.grand_total_amount || '0'))}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">Thank you for your business!</p>
        </div>
        
        </CardContent>
      </Card>
    </div>
  )
}