"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { getAircraftConfigurations } from "@/app/services/admin-fee-config-service"

const copyFeesSchema = z.object({
  source_aircraft_id: z.string().min(1, "Please select an aircraft to copy from"),
})

type CopyFeesForm = z.infer<typeof copyFeesSchema>

interface CopyAircraftFeesDialogProps {
  fboId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (aircraftConfig: {
    fee_category_id: string
    min_fuel_gallons: string
    fee_overrides: Array<{
      fee_rule_id: number
      fee_name: string
      override_amount?: number
      override_caa_amount?: number
    }>
  }) => void
}

export function CopyAircraftFeesDialog({
  fboId,
  open,
  onOpenChange,
  onSuccess,
}: CopyAircraftFeesDialogProps) {
  const form = useForm<CopyFeesForm>({
    resolver: zodResolver(copyFeesSchema),
    defaultValues: {
      source_aircraft_id: "",
    }
  })

  // Fetch aircraft configurations
  const { data: aircraftConfigs = [], isLoading } = useQuery({
    queryKey: ['aircraft-configurations', fboId],
    queryFn: () => getAircraftConfigurations(fboId),
    enabled: open, // Only fetch when dialog is open
  })

  const onSubmit = (data: CopyFeesForm) => {
    const selectedAircraft = aircraftConfigs.find(
      config => config.id.toString() === data.source_aircraft_id
    )
    
    if (!selectedAircraft) {
      toast.error("Selected aircraft configuration not found")
      return
    }

    // Map the selected aircraft's configuration to the expected format
    const configToApply = {
      fee_category_id: selectedAircraft.fee_category_id.toString(),
      min_fuel_gallons: selectedAircraft.min_fuel_gallons.toString(),
      fee_overrides: selectedAircraft.fee_overrides || []
    }

    onSuccess(configToApply)
    onOpenChange(false)
    form.reset()
    toast.success(`Copied fees from ${selectedAircraft.aircraft_type_name}`)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset()
    }
    onOpenChange(newOpen)
  }

  const aircraftOptions = aircraftConfigs.map(config => ({
    value: config.id.toString(),
    label: `${config.aircraft_type_name} (${config.fee_category_name})`
  }))

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Copy Fees from Another Aircraft</DialogTitle>
          <DialogDescription>
            Select an aircraft to copy its fee configuration and minimum fuel requirements.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="source_aircraft_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aircraft to Copy From*</FormLabel>
                  <FormControl>
                    <Combobox
                      options={aircraftOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select aircraft..."
                      searchPlaceholder="Search aircraft..."
                      emptyText={isLoading ? "Loading aircraft..." : "No aircraft found."}
                      allowCustom={false}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                Copy Fees
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}