"use client"

import React, { memo } from "react"
import { Eye, Edit, Trash2, MoreHorizontal, Download, Printer, Mail } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { TableCell, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Receipt } from "@/app/services/receipt-service"

interface ReceiptTableRowProps {
  receipt: Receipt
  isSelected: boolean
  onToggleSelection: (receiptId: string) => void
  onView: (receipt: Receipt) => void
  onEdit: (receipt: Receipt) => void
  onVoid?: (receipt: Receipt) => void
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "PAID":
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Paid</Badge>
    case "GENERATED":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Generated</Badge>
    case "DRAFT":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Draft</Badge>
    case "VOID":
      return <Badge variant="secondary" className="bg-gray-200 text-gray-700">Void</Badge>
    case "PENDING":
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Pending</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "—"
  
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Memoized receipt table row component to prevent unnecessary re-renders
 * Only re-renders when receipt data, selection status, or callback functions change
 */
const ReceiptTableRow = memo(({
  receipt,
  isSelected,
  onToggleSelection,
  onView,
  onEdit,
  onVoid,
}: ReceiptTableRowProps) => {
  const handleDownloadPDF = () => {
    // TODO: Implement PDF download
    console.log("Download PDF for receipt:", receipt.id)
  }

  const handlePrint = () => {
    // TODO: Implement print functionality
    console.log("Print receipt:", receipt.id)
  }

  const handleEmail = () => {
    // TODO: Implement email functionality
    console.log("Email receipt:", receipt.id)
  }

  return (
    <TableRow key={receipt.id} className={isSelected ? "bg-muted/50" : ""}>
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(receipt.id.toString())}
          aria-label={`Select receipt ${receipt.receipt_number}`}
        />
      </TableCell>
      <TableCell className="font-medium">
        <button
          onClick={() => onView(receipt)}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {receipt.receipt_number}
        </button>
      </TableCell>
      <TableCell>
        {formatDate(receipt.generated_at || receipt.created_at)}
      </TableCell>
      <TableCell>{receipt.fuel_order_tail_number || "—"}</TableCell>
      <TableCell>
        {receipt.customer_name || `Customer ${receipt.customer_id}`}
      </TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(parseFloat(receipt.grand_total_amount))}
      </TableCell>
      <TableCell>{getStatusBadge(receipt.status)}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            
            {/* Actions for DRAFT receipts */}
            {receipt.status === "DRAFT" && (
              <>
                <DropdownMenuItem onClick={() => onEdit(receipt)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit/View Draft
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onVoid?.(receipt)}
                  className="text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Draft
                </DropdownMenuItem>
              </>
            )}

            {/* Actions for GENERATED and PAID receipts */}
            {(receipt.status === "GENERATED" || receipt.status === "PAID") && (
              <>
                <DropdownMenuItem onClick={() => onView(receipt)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDownloadPDF}>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEmail}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email Receipt
                </DropdownMenuItem>
              </>
            )}

            {/* Actions for VOID receipts */}
            {receipt.status === "VOID" && (
              <DropdownMenuItem onClick={() => onView(receipt)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  // Only re-render if the receipt data, selection status, or key props change
  return (
    prevProps.receipt.id === nextProps.receipt.id &&
    prevProps.receipt.status === nextProps.receipt.status &&
    prevProps.receipt.receipt_number === nextProps.receipt.receipt_number &&
    prevProps.receipt.grand_total_amount === nextProps.receipt.grand_total_amount &&
    prevProps.receipt.updated_at === nextProps.receipt.updated_at &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.onToggleSelection === nextProps.onToggleSelection &&
    prevProps.onView === nextProps.onView &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onVoid === nextProps.onVoid
  )
})

ReceiptTableRow.displayName = "ReceiptTableRow"

export { ReceiptTableRow }