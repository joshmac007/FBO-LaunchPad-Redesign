"use client"

import { useState, useMemo, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { z, type ZodType } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Save, DollarSign, AlertCircle } from "lucide-react"
import { getFuelPrices, setFuelPrices, getFuelTypes, FuelPricesResponse, FuelTypesResponse, FuelType, FuelPrice } from "@/app/services/admin-fee-config-service"
import { Toaster } from "sonner"
import { FuelTypeManagementDialog } from "./components/FuelTypeManagementDialog"
import { queryKeys } from "@/constants/query-keys"

// Dynamic form schema generator for price inputs
const createFuelPriceFormSchema = (fuelTypes: FuelType[]) => {
  const schemaFields: Record<string, ZodType> = {}
  
  fuelTypes.forEach(fuelType => {
    schemaFields[`fuel_${fuelType.id}`] = z.string().min(1, "Price is required").refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0, // Allow zero as a valid price
      "Price must be a non-negative number"
    )
  })
  
  return z.object(schemaFields)
}

type FuelPriceFormData = Record<string, string>

export default function FuelPricingPage() {
  const queryClient = useQueryClient()

  // Fetch fuel types
  const { 
    data: fuelTypesData, 
    isLoading: fuelTypesLoading, 
    isError: fuelTypesError 
  } = useQuery<FuelTypesResponse, Error>({
    queryKey: queryKeys.fuel.types(),
    queryFn: () => getFuelTypes(),
  })

  // Fetch current fuel prices
  const { 
    data: fuelPricesData, 
    isLoading: fuelPricesLoading, 
    isError: fuelPricesError, 
    error,
    refetch 
  } = useQuery<FuelPricesResponse, Error>({
    queryKey: queryKeys.fuel.prices(),
    queryFn: () => getFuelPrices(),
  })

  const isLoading = fuelTypesLoading || fuelPricesLoading
  const isError = fuelTypesError || fuelPricesError
  const fuelTypes = fuelTypesData?.fuel_types || []

  // Convert price data to form-friendly format
  const getPriceByFuelTypeId = (fuelTypeId: number): string => {
    if (!fuelPricesData?.fuel_prices) return "0.00";
    const priceEntry = fuelPricesData.fuel_prices?.find((p: FuelPrice) => p.fuel_type_id === fuelTypeId);
    // When a price is null (has never been set), it was defaulting to an empty string "",
    // which caused the Zod schema validation to fail on form initialization.
    // Defaulting to "0.00" ensures the initial value is valid.
    return priceEntry?.price != null ? priceEntry.price.toString() : "0.00";
  }

  // Create form default values
  const getFormDefaultValues = (): FuelPriceFormData => {
    const values: FuelPriceFormData = {}
    fuelTypes.forEach(fuelType => {
      values[`fuel_${fuelType.id}`] = getPriceByFuelTypeId(fuelType.id)
    })
    return values
  }

  // Memoize the schema to prevent re-creation on every render
  const formSchema = useMemo(() => {
    return fuelTypes.length > 0 ? createFuelPriceFormSchema(fuelTypes) : z.object({});
  }, [fuelTypes]);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset
  } = useForm<FuelPriceFormData>({
    resolver: zodResolver(formSchema)
    // Default values are now set asynchronously via useEffect below
  })

  // When data is loaded, reset the form with the default values.
  // This is the recommended pattern for async default values with react-hook-form.
  useEffect(() => {
    if (fuelTypes.length > 0 && fuelPricesData) {
      reset(getFormDefaultValues());
    }
  }, [fuelTypes, fuelPricesData, reset]);

  // Save prices mutation
  const savePricesMutation = useMutation({
    mutationFn: (formData: FuelPriceFormData) => {
      const prices = fuelTypes.map(fuelType => ({
        fuel_type_id: fuelType.id,
        price: Number(formData[`fuel_${fuelType.id}`])
      }))
      return setFuelPrices({ fuel_prices: prices })
    },
    onSuccess: () => {
      toast.success("Fuel prices saved successfully")
      queryClient.invalidateQueries({ queryKey: queryKeys.fuel.prices() })
    },
    onError: (error: Error) => {
      toast.error(`Failed to save prices: ${error.message}`)
    }
  })

  const onSubmit = (data: FuelPriceFormData) => {
    savePricesMutation.mutate(data)
  }

  const handleRetry = () => {
    refetch()
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Fuel Pricing</h1>
            <p className="text-muted-foreground">Manage fuel prices for Austin (AUS)</p>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Fuel Pricing</h1>
            <p className="text-muted-foreground">Manage fuel prices for Austin (AUS)</p>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Could not load fuel prices: {error?.message || "Unknown error"}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={handleRetry}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fuel Pricing</h1>
          <p className="text-muted-foreground">Manage fuel prices for Austin (AUS)</p>
        </div>
      </div>

      {/* Fuel Prices Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Current Fuel Prices
            <div className="ml-auto">
              <FuelTypeManagementDialog />
            </div>
          </CardTitle>
          <CardDescription>
            Set the current fuel prices per gallon. All prices are in USD.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Dynamic fuel type price inputs */}
            {fuelTypes.map(fuelType => {
              const fieldName = `fuel_${fuelType.id}`
              return (
                <div key={fuelType.id} className="space-y-2">
                  <Label htmlFor={fieldName}>
                    {fuelType.name} (per gallon)
                    {fuelType.description && (
                      <span className="text-sm text-muted-foreground ml-2">
                        - {fuelType.description}
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input
                      id={fieldName}
                      type="text"
                      placeholder="0.00"
                      className="pl-8"
                      {...register(fieldName)}
                    />
                  </div>
                  {errors[fieldName] && (
                    <p className="text-sm text-destructive">{errors[fieldName]?.message}</p>
                  )}
                </div>
              )
            })}

            {fuelTypes.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No active fuel types found. Please contact system administrator.
                </AlertDescription>
              </Alert>
            )}

            {/* Save Button */}
            <Button 
              type="submit" 
              disabled={!isDirty || savePricesMutation.isPending || fuelTypes.length === 0}
              className="w-full sm:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {savePricesMutation.isPending ? "Saving..." : "Save Prices"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  )
}