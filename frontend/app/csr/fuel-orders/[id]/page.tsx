"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Plane, CheckCircle, Clock, AlertCircle, Receipt, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { CSRActionButton } from "@/app/components/permission-action-button"
import Link from "next/link"
import { type FuelOrderDisplay, getFuelOrder, reviewFuelOrder, updateOrderStatus, getFuelOrderStatuses } from "@/app/services/fuel-order-service"

export default function FuelOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = Number(params.id)
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fuelOrder, setFuelOrder] = useState<FuelOrderDisplay | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")

  // Status update dialog state
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [allStatuses, setAllStatuses] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState("")
  const [startMeter, setStartMeter] = useState("")
  const [endMeter, setEndMeter] = useState("")
  const [reason, setReason] = useState("")
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const loadFuelOrder = async (id: number) => {
    try {
      const order = await getFuelOrder(id)
      setFuelOrder(order)
    } catch (error) {
      console.error("Error loading fuel order:", error)
      setError("Failed to load fuel order details. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const loadStatuses = async () => {
    try {
      const statuses = await getFuelOrderStatuses()
      setAllStatuses(statuses)
    } catch (error) {
      console.error("Error loading statuses:", error)
    }
  }

  useEffect(() => {
    if (orderId) {
      loadFuelOrder(orderId);
      loadStatuses();
    }
  }, [orderId])

  // Reset dialog state when it opens
  useEffect(() => {
    if (isStatusDialogOpen && fuelOrder) {
      setSelectedStatus(fuelOrder.status)
      setStartMeter("")
      setEndMeter("")
      setReason("")
    }
  }, [isStatusDialogOpen, fuelOrder])

  const handleReviewOrder = async () => {
    if (!fuelOrder) return

    setError(null)
    setIsSubmitting(true)

    try {
      const updatedOrder = await reviewFuelOrder(fuelOrder.id, {
        approved: true,
        review_notes: reviewNotes
      })
      setFuelOrder(updatedOrder)
    } catch (error) {
      console.error("Error reviewing fuel order:", error)
      setError(error instanceof Error ? error.message : "Failed to review fuel order. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateReceipt = () => {
    if (!fuelOrder) return

    // Navigate to new receipt page with fuel order ID as query parameter
    router.push(`/csr/receipts/new?fuel_order_id=${fuelOrder.id}`)
  }

  const handleStatusUpdate = async () => {
    if (!fuelOrder || !selectedStatus) return

    // Validation for COMPLETED status
    if (selectedStatus.toUpperCase() === 'COMPLETED') {
      if (!startMeter || !endMeter) {
        toast({
          title: "Validation Error",
          description: "Start meter reading and end meter reading are required when updating status to COMPLETED",
          variant: "destructive",
        })
        return
      }

      const startMeterNum = parseFloat(startMeter)
      const endMeterNum = parseFloat(endMeter)

      if (isNaN(startMeterNum) || isNaN(endMeterNum)) {
        toast({
          title: "Validation Error", 
          description: "Meter readings must be valid numbers",
          variant: "destructive",
        })
        return
      }

      if (endMeterNum <= startMeterNum) {
        toast({
          title: "Validation Error",
          description: "End meter reading must be greater than start meter reading",
          variant: "destructive",
        })
        return
      }
    }

    setError(null)
    setIsUpdatingStatus(true)

    try {
      // Construct the payload
      const payload: any = { status: selectedStatus }
      
      if (selectedStatus.toUpperCase() === 'COMPLETED') {
        payload.start_meter_reading = parseFloat(startMeter)
        payload.end_meter_reading = parseFloat(endMeter)
      }
      
      if (reason.trim()) {
        payload.reason = reason.trim()
      }

      const updatedOrder = await updateOrderStatus(fuelOrder.id, payload)
      setFuelOrder(updatedOrder)
      setIsStatusDialogOpen(false)
      
      toast({
        title: "Success",
        description: "Status updated successfully",
      })
    } catch (error) {
      console.error("Error updating status:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to update status. Please try again."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const upperStatus = status.toUpperCase()
    switch (upperStatus) {
      case "DISPATCHED":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200" data-cy="order-status-badge">
            Dispatched
          </Badge>
        )
      case "ACKNOWLEDGED":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200" data-cy="order-status-badge">
            Acknowledged
          </Badge>
        )
      case "EN ROUTE":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200" data-cy="order-status-badge">
            En Route
          </Badge>
        )
      case "FUELING":
        return (
          <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-200" data-cy="order-status-badge">
            Fueling
          </Badge>
        )
      case "COMPLETED":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200" data-cy="order-status-badge">
            Completed
          </Badge>
        )
      case "REVIEWED":
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-200" data-cy="order-status-badge">
            Reviewed
          </Badge>
        )
      case "CANCELLED":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200" data-cy="order-status-badge">
            Cancelled
          </Badge>
        )
      default:
        return <Badge variant="outline" data-cy="order-status-badge">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p>Loading fuel order details...</p>
        </div>
      </div>
    )
  }

  if (!fuelOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h2 className="text-2xl font-bold">Fuel Order Not Found</h2>
          <p className="text-muted-foreground">
            The fuel order you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button asChild>
            <Link href="/csr/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  const canCreateReceipt = fuelOrder.status === 'Completed' || fuelOrder.status === 'Reviewed';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container flex h-16 items-center px-4">
          <div className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary rotate-45" />
            <span className="text-xl font-bold">FBO LaunchPad</span>
            <span className="bg-blue-500/10 text-blue-500 text-xs px-2 py-1 rounded-md ml-2">CSR</span>
          </div>
        </div>
      </header>

      <main className="container px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/csr/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Fuel Order #{fuelOrder.id}</CardTitle>
                  <CardDescription>Created on {new Date(fuelOrder.created_at).toLocaleString()}</CardDescription>
                </div>
                <div>{getStatusBadge(fuelOrder.status)}</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Order Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fuel Type:</span>
                      <span className="font-medium">{fuelOrder.fuel_type}</span>
                    </div>
                    {(() => {
                      const isCompletedOrReviewed = ['Completed', 'Reviewed'].includes(fuelOrder.status);
                      const requestedQty = parseFloat(fuelOrder.quantity);
                      const dispensedQty = fuelOrder.gallons_dispensed;

                      // Show dispensed only if it's a valid number and different from requested
                      const showDispensed = isCompletedOrReviewed &&
                        typeof dispensedQty === 'number' &&
                        !isNaN(dispensedQty) &&
                        dispensedQty.toFixed(2) !== requestedQty.toFixed(2);

                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              {showDispensed ? "Quantity Requested" : "Quantity"}
                            </span>
                            <span className="font-medium">{requestedQty.toFixed(2)} gallons</span>
                          </div>
                          {showDispensed && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Quantity Dispensed</span>
                              <span className="font-medium text-green-600">{dispensedQty.toFixed(2)} gallons</span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span>{getStatusBadge(fuelOrder.status)}</span>
                    </div>
                    {fuelOrder.notes && (
                      <div className="pt-2">
                        <span className="text-muted-foreground">Notes:</span>
                        <p className="mt-1 text-sm border rounded-md p-2">{fuelOrder.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Assignment</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Aircraft:</span>
                      <span className="font-medium">{fuelOrder.aircraft?.tail_number || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer:</span>
                      <span className="font-medium">{fuelOrder.customer?.name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assigned LST:</span>
                      <span className="font-medium">{fuelOrder.assigned_lst?.name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Truck ID:</span>
                      <span className="font-medium">{fuelOrder.assigned_truck_id}</span>
                    </div>
                  </div>
                </div>
              </div>

              {fuelOrder.status === "Completed" && (
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium mb-2">Review Order</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    This order has been completed by the LST. Please review and confirm the details.
                  </p>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add review notes (optional)"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)} 
                      disabled={fuelOrder.status !== "Completed"}
                    />
                  </div>
                </div>
              )}

              {fuelOrder.status === "Reviewed" && fuelOrder.review_notes && (
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium mb-2">Review Notes</h3>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <p className="text-sm">{fuelOrder.review_notes}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Reviewed on {fuelOrder.reviewed_at ? new Date(fuelOrder.reviewed_at).toLocaleString() : "N/A"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link href="/csr/dashboard">Back</Link>
              </Button>

              <div className="flex gap-2">
                <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => setIsStatusDialogOpen(true)}
                      disabled={fuelOrder.is_locked}
                      title={fuelOrder.is_locked ? "Order is locked because a receipt has been generated." : "Update Order Status"}
                      data-cy="edit-status-btn"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Update Status
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]" data-cy="status-update-dialog">
                    <DialogHeader>
                      <DialogTitle>Update Order Status</DialogTitle>
                      <DialogDescription>
                        Change the status of this fuel order. Some status changes may require additional information.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={selectedStatus} onValueChange={setSelectedStatus} data-cy="status-select">
                          <SelectTrigger>
                            <SelectValue placeholder="Select a status" />
                          </SelectTrigger>
                          <SelectContent>
                            {allStatuses.map((status) => (
                              <SelectItem key={status} value={status} data-cy={`status-option-${status.toUpperCase()}`}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedStatus?.toUpperCase() === 'COMPLETED' && (
                        <>
                          <div className="grid gap-2">
                            <Label htmlFor="start-meter">Start Meter Reading</Label>
                            <Input
                              id="start-meter"
                              type="number"
                              step="0.1"
                              value={startMeter}
                              onChange={(e) => setStartMeter(e.target.value)}
                              placeholder="Enter start meter reading"
                              data-cy="start-meter-input"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="end-meter">End Meter Reading</Label>
                            <Input
                              id="end-meter"
                              type="number"
                              step="0.1"
                              value={endMeter}
                              onChange={(e) => setEndMeter(e.target.value)}
                              placeholder="Enter end meter reading"
                              data-cy="end-meter-input"
                            />
                          </div>
                        </>
                      )}

                      <div className="grid gap-2">
                        <Label htmlFor="reason">Reason (Optional)</Label>
                        <Textarea
                          id="reason"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Enter reason for status change..."
                          data-cy="reason-textarea"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsStatusDialogOpen(false)}
                        data-cy="cancel-status-btn"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleStatusUpdate}
                        disabled={isUpdatingStatus || !selectedStatus}
                        data-cy="save-status-btn"
                      >
                        {isUpdatingStatus ? (
                          <>
                            <span>Updating...</span>
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-2"></div>
                          </>
                        ) : (
                          'Save Status'
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {fuelOrder.receipt_id ? (
                  <Link href={`/csr/receipts/${fuelOrder.receipt_id}`} passHref>
                    <Button>
                      <Receipt className="mr-2 h-4 w-4" />
                      View Receipt
                    </Button>
                  </Link>
                ) : (
                  <CSRActionButton
                    requiredPermission="create_receipt"
                    onClick={handleCreateReceipt}
                    disabled={!canCreateReceipt}
                    title={!canCreateReceipt ? "Order must be completed or reviewed to create a receipt." : "Create a new receipt for this order"}
                  >
                    <Receipt className="mr-2 h-4 w-4" />
                    Create Receipt
                  </CSRActionButton>
                )}

                {fuelOrder.status === "Completed" && (
                  <Button onClick={handleReviewOrder} disabled={isSubmitting} className="gap-2">
                    {isSubmitting ? (
                      <>
                        <span>Processing...</span>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark as Reviewed
                      </>
                    )}
                  </Button>
                )}
              </div>

              {fuelOrder.status === "Pending" && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Waiting for LST to process</span>
                </div>
              )}

              {fuelOrder.status === "In Progress" && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Fueling in progress</span>
                </div>
              )}
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
