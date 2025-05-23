"use client"

import { useState, useEffect } from "react"
import { Search, Loader2, AlertCircle, Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getAircraftByTailNumber, type Aircraft, type AircraftLookupResult } from "../services/aircraft-service"

interface AircraftLookupProps {
  onAircraftFound?: (aircraft: Aircraft) => void
  initialTailNumber?: string
  className?: string
}

export default function AircraftLookup({
  onAircraftFound,
  initialTailNumber = "",
  className = "",
}: AircraftLookupProps) {
  const [tailNumber, setTailNumber] = useState(initialTailNumber)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lookupResult, setLookupResult] = useState<AircraftLookupResult | null>(null)
  const [lookupTriggered, setLookupTriggered] = useState(false)

  // Debounce the tail number input
  useEffect(() => {
    if (!tailNumber || tailNumber.length < 3 || !lookupTriggered) return

    const timer = setTimeout(() => {
      handleLookup()
    }, 800)

    return () => clearTimeout(timer)
  }, [tailNumber, lookupTriggered])

  const handleLookup = async () => {
    if (!tailNumber.trim()) {
      setError("Please enter a tail number")
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const result = await getAircraftByTailNumber(tailNumber.trim())
      setLookupResult(result)

      if (onAircraftFound) {
        onAircraftFound(result.aircraft)
      }
    } catch (err) {
      console.error("Aircraft lookup error:", err)
      setError("Failed to find aircraft. Please verify the tail number or enter details manually.")
      setLookupResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tailNumber">Aircraft Tail Number</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="tailNumber"
                placeholder="Enter tail number (e.g., N12345)"
                value={tailNumber}
                onChange={(e) => {
                  setTailNumber(e.target.value)
                  setLookupTriggered(true)
                }}
                className="pl-10"
                disabled={isLoading}
              />
              {isLoading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-blue-500" />}
            </div>
            <Button onClick={handleLookup} disabled={isLoading || !tailNumber.trim()}>
              {isLoading ? "Searching..." : "Lookup"}
            </Button>
          </div>
          {error && (
            <div className="text-sm text-red-500 flex items-center gap-1 mt-1">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        {lookupResult && (
          <Card className="bg-white border border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Aircraft Details
                    {lookupResult.isNew && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                        New
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Information retrieved from FAA registry</CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className={
                    lookupResult.aircraft.status === "active"
                      ? "bg-green-50 text-green-600 border-green-200"
                      : lookupResult.aircraft.status === "maintenance"
                        ? "bg-amber-50 text-amber-600 border-amber-200"
                        : "bg-red-50 text-red-600 border-red-200"
                  }
                >
                  {lookupResult.aircraft.status.charAt(0).toUpperCase() + lookupResult.aircraft.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Tail Number</div>
                    <div className="font-medium">{lookupResult.aircraft.tailNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Aircraft Type</div>
                    <div>{lookupResult.aircraft.type}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Model</div>
                    <div>{lookupResult.aircraft.model}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Home Base</div>
                    <div>{lookupResult.aircraft.homeBase}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Owner</div>
                    <div className="font-medium">{lookupResult.aircraft.owner}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Max Takeoff Weight (MTOW)</div>
                    <div>{lookupResult.aircraft.mtow?.toLocaleString() || "N/A"} lbs</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Fuel Capacity</div>
                    <div>{lookupResult.aircraft.fuelCapacity} gallons</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Preferred Fuel Type</div>
                    <div>{lookupResult.aircraft.preferredFuelType}</div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2 text-xs text-gray-500 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Last updated:{" "}
              {lookupResult.aircraft.lastFaaSyncAt
                ? new Date(lookupResult.aircraft.lastFaaSyncAt).toLocaleDateString()
                : "Unknown"}
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}
