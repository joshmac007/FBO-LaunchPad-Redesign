"use client"

import React, { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { useUserPreferences } from "@/app/contexts/user-preferences-context"
import { 
  createFeeRule, 
  updateFeeRule, 
  type FeeRule,
  type CreateFeeRuleRequest,
  type UpdateFeeRuleRequest
} from "@/app/services/admin-fee-config-service"
import { feeRuleSchema, type FeeRuleFormData } from "@/app/schemas/fee-rule.schema"

interface FeeRuleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feeRule?: FeeRule
  onSuccess?: () => void
}

export function FeeRuleFormDialog({ open, onOpenChange, feeRule, onSuccess }: FeeRuleFormDialogProps) {
  const queryClient = useQueryClient()
  const { preferences, updatePreferences } = useUserPreferences()
  const isEdit = !!feeRule

  const form = useForm<FeeRuleFormData>({
    resolver: zodResolver(feeRuleSchema),
    defaultValues: {
      fee_name: "",
      fee_code: "",
      applies_to_classification_id: 0,
      amount: 0,
      currency: "USD",
      is_taxable: false,
      is_manually_waivable: false,
      calculation_basis: "FIXED_PRICE",
      waiver_strategy: "NONE",
      has_caa_override: false,
      display_as_column: false,
    },
  })

  // Reset form with appropriate values when feeRule changes
  React.useEffect(() => {
    if (feeRule) {
      form.reset({
        fee_name: feeRule.fee_name,
        fee_code: feeRule.fee_code,
        amount: feeRule.amount,
        currency: feeRule.currency,
        is_taxable: feeRule.is_taxable,
        is_manually_waivable: feeRule.is_manually_waivable,
        calculation_basis: feeRule.calculation_basis,
        // Include waiver fields from existing data (managed in Fuel Waivers tab)
        waiver_strategy: feeRule.waiver_strategy || "NONE",
        simple_waiver_multiplier: feeRule.simple_waiver_multiplier,
        has_caa_override: feeRule.has_caa_override || false,
        caa_override_amount: feeRule.caa_override_amount,
        caa_waiver_strategy_override: feeRule.caa_waiver_strategy_override,
        caa_simple_waiver_multiplier_override: feeRule.caa_simple_waiver_multiplier_override,
        // Set display_as_column based on current user preferences
        display_as_column: preferences.fee_schedule_column_codes?.includes(feeRule.fee_code) || false,
      });
    } else {
      form.reset({
        fee_name: "",
        fee_code: "",
        amount: 0,
        currency: "USD",
        is_taxable: false,
        is_manually_waivable: false,
        calculation_basis: "FIXED_PRICE",
        // Default values for waiver fields (managed in Fuel Waivers tab)
        waiver_strategy: "NONE",
        simple_waiver_multiplier: undefined,
        has_caa_override: false,
        caa_override_amount: undefined,
        caa_waiver_strategy_override: undefined,
        caa_simple_waiver_multiplier_override: undefined,
        display_as_column: false,
      });
    }
  }, [feeRule, form, preferences.fee_schedule_column_codes])

  const createMutation = useMutation({
    mutationFn: ({ apiData, originalData }: { apiData: any, originalData: FeeRuleFormData }) => {
      return createFeeRule(apiData)
    },
    onSuccess: async (newFeeRule, { originalData }) => {
      queryClient.invalidateQueries({ queryKey: ['fee-rules'] })
      queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
      
      // Handle display_as_column preference
      if (originalData.display_as_column) {
        try {
          const currentCodes = preferences.fee_schedule_column_codes || []
          const newCodes = [...currentCodes, originalData.fee_code]
          await updatePreferences({ fee_schedule_column_codes: newCodes })
        } catch (error) {
          console.error('Failed to update column preferences:', error)
        }
      }
      
      onOpenChange(false)
      form.reset()
      toast.success("Fee type created successfully")
      onSuccess?.()
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create fee type")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, apiData, originalData }: { id: number; apiData: UpdateFeeRuleRequest; originalData: FeeRuleFormData }) => updateFeeRule(id, apiData),
    onSuccess: async (updatedFeeRule, { originalData }) => {
      queryClient.invalidateQueries({ queryKey: ['fee-rules'] })
      queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
      
      // Handle display_as_column preference for updates
      if (originalData.display_as_column !== undefined && originalData.fee_code) {
        try {
          const currentCodes = preferences.fee_schedule_column_codes || []
          const shouldDisplay = originalData.display_as_column
          const currentlyDisplayed = currentCodes.includes(originalData.fee_code)

          // Only update preferences if there's a change
          if (shouldDisplay !== currentlyDisplayed) {
            const newCodes = shouldDisplay 
              ? [...currentCodes, originalData.fee_code]
              : currentCodes.filter(code => code !== originalData.fee_code)
            
            await updatePreferences({ fee_schedule_column_codes: newCodes })
          }
        } catch (error) {
          console.error('Failed to update column preferences:', error)
        }
      }
      
      onOpenChange(false)
      toast.success("Fee type updated successfully")
      onSuccess?.()
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update fee type")
    },
  })

  const onSubmit = (data: FeeRuleFormData) => {
    // Extract display_as_column from data before sending to API
    const { display_as_column, ...apiData } = data
    
    if (isEdit && feeRule) {
      updateMutation.mutate({ 
        id: feeRule.id, 
        apiData: apiData as UpdateFeeRuleRequest, 
        originalData: data 
      })
    } else {
      createMutation.mutate({ 
        apiData: apiData as CreateFeeRuleRequest, 
        originalData: data 
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Fee Type" : "Create New Fee Type"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fee_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Ramp Fee" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fee_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., RAMP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        min="0"
                        placeholder="0.00" 
                        {...field} 
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="calculation_basis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How This Fee is Calculated</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FIXED_PRICE">Fixed Price (same amount every time)</SelectItem>
                        <SelectItem value="PER_UNIT_SERVICE">Per Unit/Service (multiply by quantity)</SelectItem>
                        <SelectItem value="NOT_APPLICABLE">Not Applicable</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="is_taxable"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Taxable</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_manually_waivable"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Enable Manual Waiver</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Allow CSRs to manually waive this fee on draft receipts
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="display_as_column"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Display as Primary Column</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        {isEdit 
                          ? "Toggle whether this fee appears as a column in the main fee schedule table"
                          : "Show this fee as a column in the main fee schedule table"
                        }
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : (isEdit ? "Update" : "Create")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}