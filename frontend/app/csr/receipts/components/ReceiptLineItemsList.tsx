"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ReceiptLineItem } from "@/app/services/receipt-service"
import { formatCurrency } from "@/app/services/utils"

interface ReceiptLineItemsListProps {
  lineItems: ReceiptLineItem[] | undefined
}

export default function ReceiptLineItemsList({ lineItems }: ReceiptLineItemsListProps) {
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
} 