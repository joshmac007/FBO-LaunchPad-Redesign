"use client"

import { useState, useEffect } from "react"
import { Search, Loader2, AlertCircle, Info, Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getAircraftByTailNumber, createCSRAircraft, type Aircraft, getAircraftTypes, type AircraftType } from "../services/aircraft-service"
import { getFuelTypes, type FuelType } from "../services/admin-fee-config-service"

interface AircraftLookupProps {
  onAircraftFound?: (aircraft: Aircraft) => void
  onAircraftNotFound?: (tailNumber: string) => void
  initialTailNumber?: string
  className?: string
}

interface AircraftCreationData {
  tail_number: string
  aircraft_type: string
  fuel_type: string
}


export default function AircraftLookup({
  onAircraftFound,
  onAircraftNotFound,
  initialTailNumber = "",
  className = "",
}: AircraftLookupProps) {
  const [tailNumber, setTailNumber] = useState(initialTailNumber)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lookupResult, setLookupResult] = useState<Aircraft | null>(null)
  const [lookupAttempted, setLookupAttempted] = useState(false)
  
  // Aircraft creation state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [aircraftCreationData, setAircraftCreationData] = useState<AircraftCreationData>({
    tail_number: "",
    aircraft_type: "",
    fuel_type: ""
  })
  const [customAircraftType, setCustomAircraftType] = useState("")
  const [customFuelType, setCustomFuelType] = useState("")
  
  // Aircraft types state
  const [aircraftTypes, setAircraftTypes] = useState<AircraftType[]>([])
  const [isLoadingTypes, setIsLoadingTypes] = useState(false)
  
  // Fuel types state
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([])
  const [isLoadingFuelTypes, setIsLoadingFuelTypes] = useState(false)

  // Fetch aircraft types when dialog opens
  useEffect(() => {
    if (showCreateDialog && aircraftTypes.length === 0) {
      setIsLoadingTypes(true)
      getAircraftTypes()
        .then((types) => {
          setAircraftTypes(types)
        })
        .catch((error) => {
          console.error("Failed to fetch aircraft types:", error)
          // Show error but don't prevent dialog from opening
        })
        .finally(() => {
          setIsLoadingTypes(false)
        })
    }
  }, [showCreateDialog, aircraftTypes.length])

  // Fetch fuel types when dialog opens
  useEffect(() => {
    if (showCreateDialog && fuelTypes.length === 0) {
      setIsLoadingFuelTypes(true)
      getFuelTypes()
        .then((response) => {
          setFuelTypes(response.fuel_types)
        })
        .catch((error) => {
          console.error("Failed to fetch fuel types:", error)
          // Show error but don't prevent dialog from opening
        })
        .finally(() => {
          setIsLoadingFuelTypes(false)
        })
    }
  }, [showCreateDialog, fuelTypes.length])

  // Remove automatic lookup - only trigger on button click or Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleLookup()
    }
  }

  const handleLookup = async () => {
    if (!tailNumber.trim()) {
      setError("Please enter a tail number")
      return
    }

    setError(null)
    setIsLoading(true)
    setLookupAttempted(true)

    try {
      const result = await getAircraftByTailNumber(tailNumber.trim())
      setLookupResult(result)

      if (result && onAircraftFound) {
        onAircraftFound(result)
      } else if (!result) {
        // Aircraft not found - don't set error immediately, let user choose to create
        setLookupResult(null)
        if (onAircraftNotFound) {
          onAircraftNotFound(tailNumber.trim())
        }
      }
    } catch (err) {
      console.error("Aircraft lookup error:", err)
      setError("Failed to find aircraft. Please verify the tail number or try again.")
      setLookupResult(null)
      if (onAircraftNotFound) {
        onAircraftNotFound(tailNumber.trim())
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAircraft = () => {
    setShowCreateDialog(true)
    setAircraftCreationData({
      tail_number: tailNumber.trim(),
      aircraft_type: "",
      fuel_type: ""
    })
    setCustomAircraftType("")
    setCustomFuelType("")
    setCreateError(null)
  }

  const handleCreateSubmit = async () => {
    setCreateError(null)
    setIsCreating(true)

    try {
      // Validate required fields
      if (!aircraftCreationData.tail_number) {
        throw new Error("Tail number is required")
      }
      if (!aircraftCreationData.aircraft_type) {
        throw new Error("Aircraft type is required")
      }
      if (!aircraftCreationData.fuel_type) {
        throw new Error("Fuel type is required")
      }

      // Use custom values if "Other" was selected
      const finalData = {
        tail_number: aircraftCreationData.tail_number,
        aircraft_type: aircraftCreationData.aircraft_type === "Other" 
          ? customAircraftType 
          : aircraftCreationData.aircraft_type,
        fuel_type: aircraftCreationData.fuel_type === "Other" 
          ? customFuelType 
          : aircraftCreationData.fuel_type,
      }

      const newAircraft = await createCSRAircraft(finalData)
      
      // Success - close dialog and update lookup result
      setShowCreateDialog(false)
      setLookupResult(newAircraft)
      
      if (onAircraftFound) {
        onAircraftFound(newAircraft)
      }
      
      setError(null) // Clear any previous errors
    } catch (err) {
      console.error("Aircraft creation error:", err)
      setCreateError(err instanceof Error ? err.message : "Failed to create aircraft")
    } finally {
      setIsCreating(false)
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
                  setLookupResult(null) // Clear previous results when typing
                  setError(null) // Clear any previous errors when typing
                  setLookupAttempted(false) // Reset lookup attempted state when typing
                }}
                className="pl-10"
                disabled={isLoading}
                onKeyDown={handleKeyPress}
              />
              {isLoading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-blue-500" />}
            </div>
            <Button onClick={handleLookup} disabled={isLoading || !tailNumber.trim()}>
              {isLoading ? "Searching..." : "Lookup"}
            </Button>
          </div>
          
          {/* Aircraft not found message with create option */}
          {!isLoading && tailNumber.trim() && !lookupResult && !error && lookupAttempted && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-amber-800">Aircraft Not Found</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Aircraft with tail number "{tailNumber.trim()}" was not found in the system.
                  </p>
                  <Button 
                    onClick={handleCreateAircraft}
                    size="sm" 
                    className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create New Aircraft
                  </Button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-500 flex items-center gap-1 mt-1">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        {lookupResult && (
          <Card className="bg-green-50 border border-green-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div className="flex">
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-600 border-green-200"
                  >
                    Active
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Tail Number</div>
                    <div className="font-medium">{lookupResult.tailNumber}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Aircraft Type</div>
                    <div>{lookupResult.aircraftType}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Customer</div>
                    <div className="font-medium">{lookupResult.customerId ? `Customer ID: ${lookupResult.customerId}` : 'Not assigned'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Fuel Type</div>
                    <div>{lookupResult.fuelType}</div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2 text-xs text-gray-500 flex items-center gap-1">
              <Info className="h-3 w-3" />
              Last updated: {new Date(lookupResult.updatedAt).toLocaleDateString()}
            </CardFooter>
          </Card>
        )}

        {/* Aircraft Creation Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Aircraft</DialogTitle>
              <DialogDescription>
                Add a new aircraft to the system with basic information.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-tail-number">Tail Number</Label>
                <Input
                  id="create-tail-number"
                  value={aircraftCreationData.tail_number}
                  onChange={(e) => setAircraftCreationData(prev => ({
                    ...prev,
                    tail_number: e.target.value
                  }))}
                  placeholder="e.g., N12345"
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aircraft-type">Aircraft Type</Label>
                <Select
                  value={aircraftCreationData.aircraft_type}
                  onValueChange={(value) => setAircraftCreationData(prev => ({
                    ...prev,
                    aircraft_type: value
                  }))}
                  disabled={isCreating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select aircraft type" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingTypes ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading aircraft types...
                      </div>
                    ) : (
                      <>
                        {aircraftTypes.map((type) => (
                          <SelectItem key={type.id} value={type.name}>
                            {type.name}
                          </SelectItem>
                        ))}
                        <SelectItem key="other" value="Other">
                          Other
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                
                {aircraftCreationData.aircraft_type === "Other" && (
                  <Input
                    placeholder="Enter custom aircraft type"
                    value={customAircraftType}
                    onChange={(e) => setCustomAircraftType(e.target.value)}
                    disabled={isCreating}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fuel-type">Fuel Type</Label>
                <Select
                  value={aircraftCreationData.fuel_type}
                  onValueChange={(value) => setAircraftCreationData(prev => ({
                    ...prev,
                    fuel_type: value
                  }))}
                  disabled={isCreating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingFuelTypes ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading fuel types...
                      </div>
                    ) : (
                      <>
                        {fuelTypes.map((fuelType) => (
                          <SelectItem key={fuelType.id} value={fuelType.name}>
                            {fuelType.name}
                          </SelectItem>
                        ))}
                        <SelectItem key="other" value="Other">
                          Other
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                
                {aircraftCreationData.fuel_type === "Other" && (
                  <Input
                    placeholder="Enter custom fuel type"
                    value={customFuelType}
                    onChange={(e) => setCustomFuelType(e.target.value)}
                    disabled={isCreating}
                  />
                )}
              </div>

              {createError && (
                <div className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {createError}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSubmit}
                disabled={isCreating || !aircraftCreationData.tail_number || !aircraftCreationData.aircraft_type || !aircraftCreationData.fuel_type}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Aircraft
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
