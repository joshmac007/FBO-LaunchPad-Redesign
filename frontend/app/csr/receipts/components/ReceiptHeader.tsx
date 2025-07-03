"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import CustomerSelector from "@/app/components/customer-selector"
import { ExtendedReceipt } from "@/app/services/receipt-service"
import type { Customer } from "@/app/services/customer-service"

interface ReceiptHeaderProps {
  receipt: ExtendedReceipt
  onCustomerSelected: (customer: Customer) => void
  onAircraftTypeChange: (aircraftType: string) => void
  isReadOnly?: boolean
}

export default function ReceiptHeader({ 
  receipt, 
  onCustomerSelected, 
  onAircraftTypeChange,
  isReadOnly = false 
}: ReceiptHeaderProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
      case 'GENERATED':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100'
      case 'PAID':
        return 'bg-green-100 text-green-800 hover:bg-green-100'
      case 'VOID':
        return 'bg-red-100 text-red-800 hover:bg-red-100'
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">Receipt Workspace</CardTitle>
          <div className="flex items-center gap-4">
            <Badge data-cy="receipt-status" className={getStatusColor(receipt.status)}>
              {receipt.status}
            </Badge>
            {receipt.receipt_number && (
              <div className="text-sm text-muted-foreground">
                Receipt #{receipt.receipt_number}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fuel Order Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Fuel Order Information</h3>
            <div className="space-y-2">
              <Label htmlFor="tail-number">Tail Number</Label>
              <Input
                id="tail-number"
                data-cy="receipt-tail-number"
                value={receipt.fuel_order_tail_number || ''}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuel-type">Fuel Type</Label>
              <Input
                id="fuel-type"
                data-cy="receipt-fuel-type"
                value={receipt.fuel_type_at_receipt_time || ''}
                readOnly
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (Gallons)</Label>
              <Input
                id="quantity"
                value={receipt.fuel_quantity_gallons_at_receipt_time || ''}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          {/* Editable Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Receipt Details</h3>
            
            <CustomerSelector
              data-cy="customer-selector"
              onCustomerSelected={onCustomerSelected}
              initialCustomerId={receipt.customer_id}
              required
              className="w-full"
            />

            <div className="space-y-2">
              <Label htmlFor="aircraft-type">Aircraft Type</Label>
              <Input
                id="aircraft-type"
                value={receipt.aircraft_type_at_receipt_time || ''}
                onChange={(e) => onAircraftTypeChange(e.target.value)}
                disabled={isReadOnly}
                placeholder="Enter aircraft type"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuel-order-id">Fuel Order ID</Label>
              <Input
                id="fuel-order-id"
                value={receipt.fuel_order_id ?? ''}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 