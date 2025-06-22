"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { 
  FileText, 
  Download, 
  Printer, 
  Mail, 
  CheckCircle, 
  DollarSign,
  Plane,
  Calendar,
  User,
  MapPin,
  Fuel,
  FileCheck,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { ExtendedReceipt, markReceiptAsPaid, voidReceipt } from "@/app/services/receipt-service"
import { formatCurrency } from "@/app/services/utils"
import { CSRActionButton } from "@/app/components/permission-action-button"

interface ReceiptDetailViewProps {
  receipt: ExtendedReceipt
  onReceiptUpdate?: () => void
}

export default function ReceiptDetailView({ receipt, onReceiptUpdate }: ReceiptDetailViewProps) {
  const [isMarkingPaid, setIsMarkingPaid] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isEmailing, setIsEmailing] = useState(false)
  const [isVoiding, setIsVoiding] = useState(false)
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false)
  const [voidReason, setVoidReason] = useState("")
  const { toast } = useToast()

  const handleMarkAsPaid = async () => {
    try {
      setIsMarkingPaid(true)
      await markReceiptAsPaid(receipt.id)
      if (onReceiptUpdate) {
        onReceiptUpdate()
      }
    } catch (error) {
      console.error("Error marking receipt as paid:", error)
    } finally {
      setIsMarkingPaid(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true)
      
      // Get user's FBO ID
      const { getCurrentUser } = await import("@/app/services/auth-service")
      const user = getCurrentUser()
      if (!user?.fbo_id) {
        throw new Error("User is not associated with an FBO")
      }
      
      // Call the PDF generation endpoint
      const response = await fetch(`/api/fbo/${user.fbo_id}/receipts/${receipt.id}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate PDF')
      }
      
      // Create blob from response and trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Receipt_${receipt.receiptNumber || receipt.id}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      toast({
        title: "Success",
        description: "PDF downloaded successfully",
        className: "bg-green-500 text-white",
      })
    } catch (error) {
      console.error("Error downloading PDF:", error)
      toast({
        title: "Error",
        description: "Failed to download PDF. " + (error instanceof Error ? error.message : ""),
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleEmailReceipt = async () => {
    try {
      setIsEmailing(true)
      // TODO: Implement email functionality
      console.log("Emailing receipt:", receipt.receiptNumber)
    } catch (error) {
      console.error("Error emailing receipt:", error)
    } finally {
      setIsEmailing(false)
    }
  }

  const handleVoidReceipt = async () => {
    if (!voidReason) {
      toast({
        title: "Reason Required",
        description: "A reason is required to void a receipt.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsVoiding(true)
      await voidReceipt(receipt.id, voidReason)
      toast({
        title: "Success",
        description: "Receipt has been voided.",
        className: "bg-green-500 text-white",
      })
      if (onReceiptUpdate) {
        onReceiptUpdate()
      }
      setIsVoidDialogOpen(false)
    } catch (error) {
      console.error("Error voiding receipt:", error)
      toast({
        title: "Error",
        description: "Failed to void receipt. " + (error instanceof Error ? error.message : ""),
        variant: "destructive",
      })
    } finally {
      setIsVoiding(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "GENERATED":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Generated</Badge>
      case "PAID":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>
      case "VOID":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Void</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="max-w-4xl mx-auto p-6 print:p-0">
        {/* Actions Bar - Hidden in print */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Receipt Details</h1>
          </div>
          
          <div className="flex items-center gap-2">
            {receipt.status === 'GENERATED' && (
              <CSRActionButton
                requiredPermission="update_receipt_status"
                onClick={handleMarkAsPaid}
                disabled={isMarkingPaid}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {isMarkingPaid ? "Marking..." : "Mark as Paid"}
              </CSRActionButton>
            )}

            {(receipt.status === 'GENERATED' || receipt.status === 'PAID') && (
              <Dialog open={isVoidDialogOpen} onOpenChange={setIsVoidDialogOpen}>
                <DialogTrigger asChild>
                  <CSRActionButton
                    requiredPermission="void_receipt"
                    variant="destructive"
                    className="gap-2"
                  >
                    <AlertCircle className="h-4 w-4" />
                    Void Receipt
                  </CSRActionButton>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Void Receipt</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to void this receipt? This action cannot be undone. Please provide a reason.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="void-reason" className="text-right">
                        Reason
                      </Label>
                      <Input
                        id="void-reason"
                        value={voidReason}
                        onChange={(e) => setVoidReason(e.target.value)}
                        className="col-span-3"
                        placeholder="e.g., Incorrect fuel amount"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsVoidDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleVoidReceipt} disabled={isVoiding || !voidReason}>
                      {isVoiding ? "Voiding..." : "Confirm Void"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            
            <Button 
              variant="outline" 
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="gap-2"
              data-testid="download-pdf-button"
            >
              <Download className="h-4 w-4" />
              {isDownloading ? "Downloading..." : "Download PDF"}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handlePrint}
              className="gap-2"
              data-testid="print-button"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleEmailReceipt}
              disabled={isEmailing}
              className="gap-2"
              data-testid="email-button"
            >
              <Mail className="h-4 w-4" />
              {isEmailing ? "Sending..." : "Email Receipt"}
            </Button>
          </div>
        </div>

        {/* Receipt Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border print:shadow-none print:border-none"
        >
          {receipt.status === 'VOID' && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
              <span className="text-9xl font-bold text-red-500 opacity-50 transform -rotate-12 select-none">
                VOID
              </span>
            </div>
          )}
          {/* Header */}
          <div className="border-b p-6 print:p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Plane className="h-6 w-6 text-primary rotate-45" />
                  <span className="text-xl font-bold">FBO LaunchPad</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Professional Aviation Services<br />
                  Main Terminal, Gate A1<br />
                  Phone: (555) 123-4567
                </p>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-2 mb-2">
                  <FileCheck className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">RECEIPT</h2>
                </div>
                <p className="font-mono text-lg font-semibold" data-testid="receipt-number">{receipt.receiptNumber}</p>
                <div className="mt-2">
                  {getStatusBadge(receipt.status)}
                </div>
              </div>
            </div>
          </div>

          {/* Receipt Information */}
          <div className="p-6 print:p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Receipt Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4" />
                    Receipt Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Receipt Number:</span>
                    <span className="font-mono">{receipt.receipt_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Generated:</span>
                    <span>{receipt.generated_at ? format(new Date(receipt.generated_at), "PPp") : "N/A"}</span>
                  </div>
                  {receipt.paid_at && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Paid:</span>
                      <span>{format(new Date(receipt.paid_at), "PPp")}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Fuel Order ID:</span>
                    <span>#{receipt.fuel_order_id}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Account:</span>
                    <span>{receipt.customer || receipt.tailNumber}</span>
                  </div>
                  {receipt.isCaaApplied && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">CAA Member:</span>
                      <Badge variant="secondary" className="text-xs">Yes</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Aircraft Information */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Plane className="h-4 w-4" />
                  Aircraft Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Tail Number:</span>
                    <p className="font-semibold">{receipt.tailNumber}</p>
                  </div>
                  {receipt.aircraftTypeAtReceiptTime && (
                    <div>
                      <span className="text-sm text-muted-foreground">Aircraft Type:</span>
                      <p className="font-semibold">{receipt.aircraftTypeAtReceiptTime}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-muted-foreground">Location:</span>
                    <p className="font-semibold">{receipt.location || "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fueling Details */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Fuel className="h-4 w-4" />
                  Fueling Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <div>
                  <span className="text-sm text-muted-foreground">Fuel Type:</span>
                  <p className="font-semibold">{receipt.fuel_type_at_receipt_time}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Quantity:</span>
                  <p className="font-semibold">
                    {receipt.fuel_quantity_gallons_at_receipt_time} gallons
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Unit Price:</span>
                  <p className="font-semibold">
                    {formatCurrency(parseFloat(receipt.fuel_unit_price_at_receipt_time || "0"))}/gallon
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Fuel Subtotal:</span>
                  <p className="font-semibold">{formatCurrency(parseFloat(receipt.fuel_subtotal))}</p>
                </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            {receipt.line_items && receipt.line_items.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4" />
                    Itemized Charges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {receipt.line_items.map((item) => (
                      <div key={item.id} className="flex justify-between py-2 border-b last:border-b-0">
                        <div>
                          <p className="font-medium">{item.description}</p>
                          {parseFloat(item.quantity) > 1 && (
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} × {formatCurrency(parseFloat(item.unit_price))}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            item.line_item_type === 'WAIVER' || parseFloat(item.amount) < 0 
                              ? 'text-green-600' 
                              : 'text-foreground'
                          }`}>
                            {item.line_item_type === 'WAIVER' || parseFloat(item.amount) < 0 ? '-' : ''}
                            {formatCurrency(Math.abs(parseFloat(item.amount)))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Fuel Subtotal:</span>
                    <span>{formatCurrency(parseFloat(receipt.fuel_subtotal))}</span>
                  </div>
                  {parseFloat(receipt.total_fees_amount) > 0 && (
                    <div className="flex justify-between">
                      <span>Total Fees:</span>
                      <span>{formatCurrency(parseFloat(receipt.total_fees_amount))}</span>
                    </div>
                  )}
                  {parseFloat(receipt.total_waivers_amount) < 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Total Waivers:</span>
                      <span>{formatCurrency(parseFloat(receipt.total_waivers_amount))}</span>
                    </div>
                  )}
                  {parseFloat(receipt.tax_amount) > 0 && (
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>{formatCurrency(parseFloat(receipt.tax_amount))}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Grand Total:</span>
                    <span data-testid="receipt-total">{formatCurrency(parseFloat(receipt.grand_total_amount))}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Payment Status:</span>
                    <span>{receipt.status === 'PAID' ? 'Paid' : 'Unpaid'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {receipt.notes && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-sm">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{receipt.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground print:mt-4 print:pt-4">
              <p>Thank you for choosing FBO LaunchPad for your aviation services.</p>
              <p className="mt-1">For questions regarding this receipt, please contact us at (555) 123-4567.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 