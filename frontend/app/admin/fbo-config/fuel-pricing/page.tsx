"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
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
import { getFuelPrices, setFuelPrices, FuelPricesResponse } from "@/app/services/admin-fee-config-service"
import { Toaster } from "sonner"

// Form schema for price inputs
const FuelPriceFormSchema = z.object({
  JET_A: z.string().min(1, "Price is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0, 
    "Must be a positive number"
  ),
  AVGAS_100LL: z.string().min(1, "Price is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0, 
    "Must be a positive number"
  ),
  SAF_JET_A: z.string().min(1, "Price is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0, 
    "Must be a positive number"
  )
})

type FuelPriceFormData = z.infer<typeof FuelPriceFormSchema>

export default function FuelPricingPage() {
  const fboId = 1 // TODO: Get this from context/params
  const queryClient = useQueryClient()

  // Fetch current fuel prices
  const { 
    data: fuelPricesData, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['fuel-prices', fboId],
    queryFn: () => getFuelPrices(fboId),
  })

  // Convert price data to form-friendly format
  const getPriceByFuelType = (fuelType: string): string => {
    if (!fuelPricesData?.fuel_prices) return ""
    const priceEntry = fuelPricesData.fuel_prices.find(p => p.fuel_type === fuelType)
    return priceEntry?.price ? priceEntry.price.toString() : ""
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset
  } = useForm<FuelPriceFormData>({
    resolver: zodResolver(FuelPriceFormSchema),
    values: {
      JET_A: getPriceByFuelType("JET_A"),
      AVGAS_100LL: getPriceByFuelType("AVGAS_100LL"),
      SAF_JET_A: getPriceByFuelType("SAF_JET_A")
    }
  })

  // Save prices mutation
  const savePricesMutation = useMutation({
    mutationFn: (formData: FuelPriceFormData) => {
      const prices = [
        { fuel_type: "JET_A", price: Number(formData.JET_A) },
        { fuel_type: "AVGAS_100LL", price: Number(formData.AVGAS_100LL) },
        { fuel_type: "SAF_JET_A", price: Number(formData.SAF_JET_A) }
      ]
      return setFuelPrices(fboId, { fuel_prices: prices })
    },
    onSuccess: () => {
      toast.success("Fuel prices saved successfully")
      queryClient.invalidateQueries({ queryKey: ['fuel-prices', fboId] })
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
      <div className="container mx-auto py-8 space-y-8">
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
      <div className="container mx-auto py-8 space-y-8">
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
    <div className="container mx-auto py-8 space-y-8">
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
          </CardTitle>
          <CardDescription>
            Set the current fuel prices per gallon. All prices are in USD.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Jet A Price */}
            <div className="space-y-2">
              <Label htmlFor="JET_A">Jet A (per gallon)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  id="JET_A"
                  type="text"
                  placeholder="0.00"
                  className="pl-8"
                  {...register("JET_A")}
                />
              </div>
              {errors.JET_A && (
                <p className="text-sm text-destructive">{errors.JET_A.message}</p>
              )}
            </div>

            {/* Avgas 100LL Price */}
            <div className="space-y-2">
              <Label htmlFor="AVGAS_100LL">Avgas 100LL (per gallon)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  id="AVGAS_100LL"
                  type="text"
                  placeholder="0.00"
                  className="pl-8"
                  {...register("AVGAS_100LL")}
                />
              </div>
              {errors.AVGAS_100LL && (
                <p className="text-sm text-destructive">{errors.AVGAS_100LL.message}</p>
              )}
            </div>

            {/* SAF Jet A Price */}
            <div className="space-y-2">
              <Label htmlFor="SAF_JET_A">SAF Jet A (per gallon)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  id="SAF_JET_A"
                  type="text"
                  placeholder="0.00"
                  className="pl-8"
                  {...register("SAF_JET_A")}
                />
              </div>
              {errors.SAF_JET_A && (
                <p className="text-sm text-destructive">{errors.SAF_JET_A.message}</p>
              )}
            </div>

            {/* Save Button */}
            <Button 
              type="submit" 
              disabled={!isDirty || savePricesMutation.isPending}
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