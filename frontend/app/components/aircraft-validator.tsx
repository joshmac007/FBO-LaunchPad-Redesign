"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { validateAircraft, type AircraftValidationResult } from "../services/aircraft-service"
import { AlertCircle, CheckCircle, Clock, Search, Shield } from "lucide-react"
import { usePermissions } from "../contexts/permission-context"

interface AircraftValidatorProps {
  tailNumber?: string
  onValidationComplete?: (result: AircraftValidationResult) => void
  className?: string
}

const AircraftValidator: React.FC<AircraftValidatorProps> = ({
  tailNumber: initialTailNumber = "",
  onValidationComplete,
  className,
}) => {
  const [tailNumber, setTailNumber] = useState(initialTailNumber)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<AircraftValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { can } = usePermissions()

  const handleValidate = async () => {
    if (!tailNumber.trim()) {
      setError("Please enter a tail number")
      return
    }

    setError(null)
    setIsValidating(true)

    try {
      const result = await validateAircraft(tailNumber.trim())
      setValidationResult(result)

      if (onValidationComplete) {
        onValidationComplete(result)
      }
    } catch (err) {
      console.error("Validation error:", err)
      setError("Failed to validate aircraft. Please try again.")
      setValidationResult(null)
    } finally {
      setIsValidating(false)
    }
  }

  // Check if user has permission to validate aircraft
  const hasValidationPermission = can("validate_aircraft")

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Aircraft Validation
        </CardTitle>
        <CardDescription>Verify aircraft registration and ownership information</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tailNumber">Aircraft Tail Number</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="tailNumber"
                  placeholder="Enter tail number (e.g., N12345)"
                  value={tailNumber}
                  onChange={(e) => setTailNumber(e.target.value)}
                  className="pl-10"
                  disabled={isValidating}
                />
              </div>
              <Button
                onClick={handleValidate}
                disabled={isValidating || !hasValidationPermission}
                title={!hasValidationPermission ? "You don't have permission to validate aircraft" : undefined}
              >
                {isValidating ? (
                  <>
                    <span className="mr-2">Validating</span>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  </>
                ) : (
                  "Validate"
                )}
              </Button>
            </div>
            {!hasValidationPermission && (
              <p className="text-xs text-amber-500 mt-1">You don't have permission to validate aircraft</p>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          {validationResult && (
            <div
              className={`border rounded-md p-4 ${
                validationResult.isValid ? "bg-green-500/10 border-green-500/50" : "bg-amber-500/10 border-amber-500/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                {validationResult.isValid ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                )}
                <h3 className="font-medium">
                  {validationResult.isValid ? "Aircraft Validated Successfully" : "Validation Issues Detected"}
                </h3>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Tail Number:</div>
                  <div className="text-sm">{validationResult.tailNumber}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Registration Status:</div>
                  <div className="text-sm">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                        validationResult.registrationStatus === "valid"
                          ? "bg-green-500/20 text-green-600"
                          : validationResult.registrationStatus === "expired"
                            ? "bg-red-500/20 text-red-600"
                            : validationResult.registrationStatus === "pending"
                              ? "bg-blue-500/20 text-blue-600"
                              : "bg-gray-500/20 text-gray-600"
                      }`}
                    >
                      {validationResult.registrationStatus.charAt(0).toUpperCase() +
                        validationResult.registrationStatus.slice(1)}
                    </span>
                  </div>
                </div>
                {validationResult.registrationExpiry && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm font-medium">Registration Expiry:</div>
                    <div className="text-sm">{new Date(validationResult.registrationExpiry).toLocaleDateString()}</div>
                  </div>
                )}
                {validationResult.owner && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm font-medium">Owner:</div>
                      <div className="text-sm">{validationResult.owner.name}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm font-medium">Address:</div>
                      <div className="text-sm">{validationResult.owner.address}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm font-medium">Contact:</div>
                      <div className="text-sm">{validationResult.owner.contactInfo}</div>
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Validation Source:</div>
                  <div className="text-sm">{validationResult.validationSource}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Validated At:</div>
                  <div className="text-sm flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {new Date(validationResult.validatedAt).toLocaleString()}
                  </div>
                </div>

                {validationResult.errors && validationResult.errors.length > 0 && (
                  <div className="mt-3 bg-red-500/10 border border-red-500/50 rounded-md p-2">
                    <p className="text-sm font-medium text-red-600 mb-1">Errors:</p>
                    <ul className="list-disc list-inside text-sm text-red-600">
                      {validationResult.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validationResult.warnings && validationResult.warnings.length > 0 && (
                  <div className="mt-3 bg-amber-500/10 border border-amber-500/50 rounded-md p-2">
                    <p className="text-sm font-medium text-amber-600 mb-1">Warnings:</p>
                    <ul className="list-disc list-inside text-sm text-amber-600">
                      {validationResult.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Aircraft validation data is sourced from official registration databases
      </CardFooter>
    </Card>
  )
}

export default AircraftValidator
