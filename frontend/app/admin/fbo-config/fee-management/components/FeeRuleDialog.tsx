"use client"

import React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  FeeRule,
  CreateFeeRuleRequest,
  UpdateFeeRuleRequest,
} from "@/app/services/admin-fee-config-service"
import { getAuthHeaders } from "@/app/services/api-config"
import { useUserPreferences } from "@/app/contexts/user-preferences-context"

const feeRuleSchema = z.object({
  fee_name: z.string().min(1, "Fee name is required"),
  fee_code: z.string().min(1, "Fee code is required"),
  amount: z.string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Must be a valid number greater than or equal to 0"
    }),
  is_taxable: z.boolean(),
  is_manually_waivable: z.boolean(),
  calculation_basis: z.enum(['FIXED_PRICE', 'PER_UNIT_SERVICE', 'NOT_APPLICABLE']),
  waiver_strategy: z.enum(['NONE', 'SIMPLE_MULTIPLIER', 'TIERED_MULTIPLIER']),
  simple_waiver_multiplier: z.string().optional(),
  has_caa_override: z.boolean(),
  caa_override_amount: z.string().optional(),
  caa_waiver_strategy_override: z.enum(['NONE', 'SIMPLE_MULTIPLIER', 'TIERED_MULTIPLIER']).optional(),
  caa_simple_waiver_multiplier_override: z.string().optional(),
  display_as_column: z.boolean().optional(),
})

type FeeRuleFormData = z.infer<typeof feeRuleSchema>

interface FeeRuleDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (data: FeeRuleFormData) => void
  initialData?: FeeRule | null
  defaultValues?: Partial<FeeRuleFormData>
}

export function FeeRuleDialog({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
  defaultValues = {},
}: FeeRuleDialogProps) {
  const isEditing = !!initialData
  const { preferences, updatePreferences } = useUserPreferences()

  const form = useForm<FeeRuleFormData>({
    resolver: zodResolver(feeRuleSchema),
    defaultValues: {
      fee_name: initialData?.fee_name || "",
      fee_code: initialData?.fee_code || "",
      amount: initialData?.amount?.toString() || defaultValues.amount?.toString() || "",
      is_taxable: initialData?.is_taxable ?? defaultValues.is_taxable ?? true,
      is_manually_waivable: initialData?.is_manually_waivable ?? defaultValues.is_manually_waivable ?? false,
      calculation_basis: initialData?.calculation_basis || defaultValues.calculation_basis || 'FIXED_PRICE',
      waiver_strategy: initialData?.waiver_strategy || defaultValues.waiver_strategy || 'NONE',
      simple_waiver_multiplier: initialData?.simple_waiver_multiplier?.toString() || defaultValues.simple_waiver_multiplier?.toString() || "",
      has_caa_override: initialData?.has_caa_override ?? defaultValues.has_caa_override ?? false,
      caa_override_amount: initialData?.caa_override_amount?.toString() || defaultValues.caa_override_amount?.toString() || "",
      caa_waiver_strategy_override: initialData?.caa_waiver_strategy_override || defaultValues.caa_waiver_strategy_override || undefined,
      caa_simple_waiver_multiplier_override: initialData?.caa_simple_waiver_multiplier_override?.toString() || defaultValues.caa_simple_waiver_multiplier_override?.toString() || "",
      display_as_column: isEditing && initialData 
        ? preferences.fee_schedule_column_codes?.includes(initialData.fee_code) ?? false
        : defaultValues.display_as_column ?? false,
    },
  })

  React.useEffect(() => {
    if (isOpen) {
      if (!isEditing) {
        // Reset form when opening in create mode
        form.reset({
          fee_name: "",
          fee_code: "",
          amount: defaultValues.amount?.toString() || "",
          is_taxable: defaultValues.is_taxable ?? true,
          is_manually_waivable: defaultValues.is_manually_waivable ?? false,
          calculation_basis: defaultValues.calculation_basis || 'FIXED_PRICE',
          waiver_strategy: defaultValues.waiver_strategy || 'NONE',
          simple_waiver_multiplier: defaultValues.simple_waiver_multiplier?.toString() || "",
          has_caa_override: defaultValues.has_caa_override ?? false,
          caa_override_amount: defaultValues.caa_override_amount?.toString() || "",
          caa_waiver_strategy_override: defaultValues.caa_waiver_strategy_override || undefined,
          caa_simple_waiver_multiplier_override: defaultValues.caa_simple_waiver_multiplier_override?.toString() || "",
          display_as_column: defaultValues.display_as_column ?? false,
        })
      } else if (initialData) {
        // Reset form with data when opening in edit mode, including current column state
        form.reset({
          fee_name: initialData.fee_name,
          fee_code: initialData.fee_code,
          amount: initialData.amount?.toString() || "",
          is_taxable: initialData.is_taxable,
          is_manually_waivable: initialData.is_manually_waivable,
          calculation_basis: initialData.calculation_basis,
          waiver_strategy: initialData.waiver_strategy || 'NONE',
          simple_waiver_multiplier: initialData.simple_waiver_multiplier?.toString() || "",
          has_caa_override: initialData.has_caa_override ?? false,
          caa_override_amount: initialData.caa_override_amount?.toString() || "",
          caa_waiver_strategy_override: initialData.caa_waiver_strategy_override || undefined,
          caa_simple_waiver_multiplier_override: initialData.caa_simple_waiver_multiplier_override?.toString() || "",
          display_as_column: preferences.fee_schedule_column_codes?.includes(initialData.fee_code) ?? false,
        })
      }
    }
  }, [isOpen, isEditing, defaultValues, form, initialData, preferences.fee_schedule_column_codes])

  const onSubmit = async (data: FeeRuleFormData) => {
    try {
      // Extract display_as_column from data before sending to API
      const { display_as_column, ...apiData } = data
      
      const submitData = {
        ...apiData,
        amount: parseFloat(data.amount),
        simple_waiver_multiplier: data.simple_waiver_multiplier ? parseFloat(data.simple_waiver_multiplier) : undefined,
        caa_override_amount: data.caa_override_amount ? parseFloat(data.caa_override_amount) : undefined,
        caa_simple_waiver_multiplier_override: data.caa_simple_waiver_multiplier_override ? parseFloat(data.caa_simple_waiver_multiplier_override) : undefined,
      }

      if (isEditing && initialData) {
        // Update existing fee rule
        const updateData: UpdateFeeRuleRequest = submitData
        const response = await fetch(`/api/admin/fee-rules/${initialData.id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updateData),
        })

        if (!response.ok) {
          throw new Error('Failed to update fee rule')
        }
      } else {
        // Create new fee rule
        const createData: CreateFeeRuleRequest = submitData
        const response = await fetch(`/api/admin/fee-rules`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(createData),
        })

        if (!response.ok) {
          throw new Error('Failed to create fee rule')
        }
      }

      // Handle column preferences for both create and edit modes
      await handleColumnPreferences(data, initialData)
      
      onSuccess(data)
      onClose()
    } catch (error) {
      console.error('Error saving fee rule:', error)
      // Error handling could be enhanced with toast notifications
    }
  }

  const handleColumnPreferences = async (data: FeeRuleFormData, existingData?: FeeRule | null) => {
    try {
      const currentCodes = preferences.fee_schedule_column_codes || []
      const feeCode = data.fee_code
      const shouldDisplay = data.display_as_column
      const currentlyDisplayed = currentCodes.includes(feeCode)

      // Only update preferences if there's a change
      if (shouldDisplay !== currentlyDisplayed) {
        const newCodes = shouldDisplay 
          ? [...currentCodes, feeCode]
          : currentCodes.filter(code => code !== feeCode)
        
        await updatePreferences({ fee_schedule_column_codes: newCodes })
      }
    } catch (error) {
      console.error('Failed to update column preferences:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Fee Rule' : 'Create New Fee Rule'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fee_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fee Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter fee name" {...field} />
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
                        <Input placeholder="Enter fee code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Settings</h3>
              
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="is_taxable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Taxable</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          This fee is subject to taxes
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_manually_waivable"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable Manual Waiver</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Allow CSRs to manually waive this fee on draft receipts
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="display_as_column"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          {isEditing ? "Display as a primary column in the fee schedule" : "Display as a primary column in the fee schedule"}
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          {isEditing 
                            ? "Toggle whether this fee appears as a column in the main fee schedule table"
                            : "This fee will be shown as a column in the main fee schedule table"
                          }
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Advanced Options - Collapsed by default */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Advanced Options</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="calculation_basis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calculation Basis</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="FIXED_PRICE">Fixed Price</SelectItem>
                          <SelectItem value="PER_UNIT_SERVICE">Per Unit Service</SelectItem>
                          <SelectItem value="NOT_APPLICABLE">Not Applicable</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="waiver_strategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Waiver Strategy</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NONE">None</SelectItem>
                          <SelectItem value="SIMPLE_MULTIPLIER">Simple Multiplier</SelectItem>
                          <SelectItem value="TIERED_MULTIPLIER">Tiered Multiplier</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {isEditing ? 'Update Fee Rule' : 'Create Fee Rule'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}