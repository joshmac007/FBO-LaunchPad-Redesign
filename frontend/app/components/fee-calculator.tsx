"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  calculateFees,
  type FeeCalculationResult,
} from "../services/fee-service"
import { getAircraftList, type Aircraft } from "../services/aircraft-service"
import { AlertCircle, Calculator, DollarSign } from "lucide-react"
import { usePermissions } from "../contexts/permission-context"

interface FeeCalculatorProps {
  aircraftId?: string
  customerId?: string
  fuelType?: string
  quantity?: number
  onCalculationComplete?: (result: FeeCalculationResult) => void
  className?: string
}

const FeeCalculator: React.FC<FeeCalculatorProps> = ({
  aircraftId: initialAircraftId = "",
  customerId: initialCustomerId = "",
  fuelType: initialFuelType = "",
  quantity: initialQuantity = 0,
  onCalculationComplete,
  className,
}) => {
  const [aircraftId, setAircraftId] = useState(initialAircraftId)
  const [customerId, setCustomerId] = useState(initialCustomerId)
  const [fuelType, setFuelType] = useState(initialFuelType)
  const [quantity, setQuantity] = useState(initialQuantity.toString())
  const [isCalculating, setIsCalculating] = useState(false)
  const [calculationResult, setCalculationResult] = useState<FeeCalculationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const { hasPermission } = usePermissions()

  // Load aircraft
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const aircraftData = await getAircraftList()
        setAircraft(aircraftData)
      } catch (err) {
        console.error("Error loading data:", err)
        setError("Failed to load required data. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const handleCalculate = async () => {
    if (!aircraftId) {
      setError("Please select an aircraft")
      return
    }

    if (!customerId) {
      setError("Please enter a customer ID")
      return
    }

    if (!fuelType) {
      setError("Please select a fuel type")
      return
    }

    if (!quantity || Number.parseFloat(quantity) <= 0) {
      setError("Please enter a valid quantity")
      return
    }

    setError(null)
    setIsCalculating(true)

    try {
      const result = await calculateFees({
        aircraftId,
        customerId,
        fuelType,
        quantity: Number.parseFloat(quantity),
      })

      setCalculationResult(result)

      if (onCalculationComplete) {
        onCalculationComplete(result)
      }
    } catch (err) {
      console.error("Calculation error:", err)
      setError("Failed to calculate fees. Please try again.")
      setCalculationResult(null)
    } finally {
      setIsCalculating(false)
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Check if user has permission to calculate fees
  const hasCalculationPermission = hasPermission("view_billing_info")

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex justify-center items-center py-6">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2">Loading...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Fee Calculator
        </CardTitle>
        <CardDescription>Calculate fuel fees based on aircraft, fuel type, and quantity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aircraft">Aircraft</Label>
              <Select
                value={aircraftId}
                onValueChange={setAircraftId}
                disabled={isCalculating || !hasCalculationPermission}
              >
                <SelectTrigger id="aircraft">
                  <SelectValue placeholder="Select aircraft" />
                </SelectTrigger>
                <SelectContent>
                  {aircraft.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.tailNumber} - {a.aircraftType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerId">Customer ID</Label>
              <Input
                id="customerId"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                disabled={isCalculating || !hasCalculationPermission}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fuelType">Fuel Type</Label>
              <Select
                value={fuelType}
                onValueChange={setFuelType}
                disabled={isCalculating || !hasCalculationPermission}
              >
                <SelectTrigger id="fuelType">
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Jet A">Jet A</SelectItem>
                  <SelectItem value="Jet A-1">Jet A-1</SelectItem>
                  <SelectItem value="Avgas 100LL">Avgas 100LL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (gallons)</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={isCalculating || !hasCalculationPermission}
              />
            </div>
          </div>


          {!hasCalculationPermission && (
            <p className="text-xs text-amber-500 mt-1">You don't have permission to calculate fees</p>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          <Button onClick={handleCalculate} disabled={isCalculating || !hasCalculationPermission} className="w-full">
            {isCalculating ? (
              <>
                <span className="mr-2">Calculating</span>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              </>
            ) : (
              <>
                <DollarSign className="h-4 w-4 mr-2" />
                Calculate Fees
              </>
            )}
          </Button>

          {calculationResult && (
            <div className="border rounded-md p-4 bg-muted/50">
              <h3 className="font-medium text-lg mb-3 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Fee Calculation Result
              </h3>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Base Rate:</div>
                  <div className="text-sm">{formatCurrency(calculationResult.breakdown.baseFuelPrice)} per gallon</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Quantity:</div>
                  <div className="text-sm">{quantity} gallons</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Subtotal:</div>
                  <div className="text-sm">{formatCurrency(calculationResult.subtotal)}</div>
                </div>

                <div className="pt-2">
                  <div className="text-sm font-medium mb-1">Discounts:</div>
                  <div className="grid grid-cols-2 gap-2 pl-4">
                    <div className="text-sm">Customer Discount:</div>
                    <div className="text-sm text-green-600">{(calculationResult.breakdown.customerDiscount * 100).toFixed(1)}%</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-4">
                    <div className="text-sm">Volume Discount:</div>
                    <div className="text-sm text-green-600">{(calculationResult.breakdown.volumeDiscount * 100).toFixed(1)}%</div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-sm font-medium mb-1">Aircraft Factor:</div>
                  <div className="grid grid-cols-2 gap-2 pl-4">
                    <div className="text-sm">Aircraft Adjustment:</div>
                    <div className="text-sm">{(calculationResult.breakdown.aircraftFactor * 100).toFixed(1)}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Tax:</div>
                  <div className="text-sm">{formatCurrency(calculationResult.taxAmount)}</div>
                </div>

                <div className="border-t pt-2 mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-base font-bold">Total:</div>
                    <div className="text-base font-bold">{formatCurrency(calculationResult.total)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Fee calculations are based on the selected fee structure and may include taxes and additional fees
      </CardFooter>
    </Card>
  )
}

export default FeeCalculator
