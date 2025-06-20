"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FuelOrder } from "@/hooks/useRealtimeOrders"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Calculator } from "lucide-react"

interface CompleteOrderDialogProps {
  order: FuelOrder | null
  isOpen: boolean
  onClose: () => void
  onComplete: (data: {
    orderId: number
    startMeterReading: number
    endMeterReading: number
    notes?: string
  }) => void
}

export function CompleteOrderDialog({
  order,
  isOpen,
  onClose,
  onComplete,
}: CompleteOrderDialogProps) {
  const [startMeterReading, setStartMeterReading] = useState("")
  const [endMeterReading, setEndMeterReading] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState("")

  // Reset form when dialog opens/closes or order changes
  useEffect(() => {
    if (isOpen && order) {
      setStartMeterReading(order.start_meter_reading?.toString() || "")
      setEndMeterReading(order.end_meter_reading?.toString() || "")
      setNotes(order.notes || "")
      setError("")
    } else {
      setStartMeterReading("")
      setEndMeterReading("")
      setNotes("")
      setError("")
    }
  }, [isOpen, order])

  // Real-time gallons calculation
  const calculatedGallons = useMemo(() => {
    const start = parseFloat(startMeterReading) || 0
    const end = parseFloat(endMeterReading) || 0
    
    if (start > 0 && end > 0 && end >= start) {
      return (end - start).toFixed(2)
    }
    return "0.00"
  }, [startMeterReading, endMeterReading])

  // Validation
  const isValidInput = useMemo(() => {
    const start = parseFloat(startMeterReading)
    const end = parseFloat(endMeterReading)
    
    return (
      !isNaN(start) &&
      !isNaN(end) &&
      start > 0 &&
      end > 0 &&
      end >= start
    )
  }, [startMeterReading, endMeterReading])

  const handleSubmit = () => {
    if (!order) return

    const start = parseFloat(startMeterReading)
    const end = parseFloat(endMeterReading)

    // Validation
    if (isNaN(start) || start <= 0) {
      setError("Please enter a valid start meter reading")
      return
    }

    if (isNaN(end) || end <= 0) {
      setError("Please enter a valid end meter reading")
      return
    }

    if (end < start) {
      setError("End meter reading must be greater than or equal to start meter reading")
      return
    }

    const gallons = parseFloat(calculatedGallons)
    if (gallons <= 0) {
      setError("Calculated gallons must be greater than 0")
      return
    }

    // Submit the completion data
    onComplete({
      orderId: order.id,
      startMeterReading: start,
      endMeterReading: end,
      notes: notes.trim() || undefined,
    })

    // Close dialog
    onClose()
  }

  const handleClose = () => {
    setError("")
    onClose()
  }

  if (!order) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[500px]"
        data-cy="complete-order-dialog"
      >
        <DialogHeader>
          <DialogTitle>Complete Fueling Order</DialogTitle>
          <DialogDescription>
            Enter the meter readings to complete this fuel order. The dispensed amount will be calculated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Order Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Aircraft:</span>
              <span className="text-sm">{order.aircraft_registration || order.tail_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Customer:</span>
              <span className="text-sm">{order.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Requested:</span>
              <span className="text-sm">{order.gallons_requested} gallons</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Fuel Type:</span>
              <span className="text-sm">{order.fuel_type}</span>
            </div>
          </div>

          {/* Meter Readings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label 
                htmlFor="start-meter" 
                className="text-sm font-medium"
              >
                Start Meter Reading
              </Label>
              <Input
                id="start-meter"
                type="number"
                step="0.1"
                min="0"
                placeholder="0.0"
                value={startMeterReading}
                onChange={(e) => setStartMeterReading(e.target.value)}
                data-cy="start-meter-input"
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label 
                htmlFor="end-meter" 
                className="text-sm font-medium"
              >
                End Meter Reading
              </Label>
              <Input
                id="end-meter"
                type="number"
                step="0.1"
                min="0"
                placeholder="0.0"
                value={endMeterReading}
                onChange={(e) => setEndMeterReading(e.target.value)}
                data-cy="end-meter-input"
                className="text-lg"
              />
            </div>
          </div>

          {/* Calculated Gallons - Real-time display */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">Calculated Gallons Dispensed:</span>
            </div>
            <div 
              className="text-2xl font-bold text-green-800 mt-1"
              data-cy="calculated-gallons"
            >
              {calculatedGallons} gallons
            </div>
            {!isValidInput && (startMeterReading || endMeterReading) && (
              <div className="text-sm text-orange-600 mt-1">
                {parseFloat(endMeterReading) < parseFloat(startMeterReading) 
                  ? "End reading must be ≥ start reading"
                  : "Enter valid meter readings"
                }
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label 
              htmlFor="completion-notes" 
              className="text-sm font-medium"
            >
              Completion Notes (Optional)
            </Label>
            <Textarea
              id="completion-notes"
              placeholder="Any notes about the fueling operation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-cy="completion-notes-input"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            data-cy="cancel-completion-button"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isValidInput}
            data-cy="submit-completion-button"
          >
            Complete Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 