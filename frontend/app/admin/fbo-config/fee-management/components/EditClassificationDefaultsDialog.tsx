"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Input } from "@/components/ui/input"
import { Edit } from "lucide-react"
import { GlobalFeeRule, updateFeeRule, createFeeRule } from "@/app/services/admin-fee-config-service"

const editClassificationDefaultsSchema = z.object({
  fees: z.record(z.string(), z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Must be a valid number greater than or equal to 0"
  }))
})

type EditClassificationDefaultsForm = z.infer<typeof editClassificationDefaultsSchema>

interface EditClassificationDefaultsDialogProps {
  classificationId: number
  classificationName: string
  classificationRules: GlobalFeeRule[]
  viewMode: 'standard' | 'caa'
}

export function EditClassificationDefaultsDialog({ 
  classificationId, 
  classificationName, 
  classificationRules,
  viewMode 
}: EditClassificationDefaultsDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<EditClassificationDefaultsForm>({
    resolver: zodResolver(editClassificationDefaultsSchema),
    defaultValues: {
      fees: {}
    }
  })

  // Get rules specific to this classification, or use all rules as templates
  const classificationSpecificRules = classificationRules.filter(r => r.applies_to_classification_id === classificationId)
  const rulesToShow = classificationSpecificRules.length > 0 ? classificationSpecificRules : classificationRules

  // Initialize form with current fee values
  useEffect(() => {
    if (open && rulesToShow.length > 0) {
      const feeValues: Record<string, string> = {}
      rulesToShow.forEach(rule => {
        const value = viewMode === 'caa'
          ? rule.caa_override_amount?.toString() ?? rule.amount.toString()
          : rule.amount.toString()
        feeValues[rule.id.toString()] = value
      })
      form.reset({ fees: feeValues })
    }
  }, [open, rulesToShow, form, viewMode])

  const updateClassificationDefaultsMutation = useMutation({
    mutationFn: async (data: EditClassificationDefaultsForm) => {
      const updatePromises = Object.entries(data.fees).map(([ruleId, amountStr]) => {
        const ruleIdNum = parseInt(ruleId)
        const amountNum = Number(amountStr)
        const templateRule = rulesToShow.find(r => r.id === ruleIdNum)
        
        if (!templateRule) {
          throw new Error(`Rule with ID ${ruleIdNum} not found`)
        }

        // Check if this rule already exists for this classification
        const existsForClassification = templateRule.applies_to_classification_id === classificationId
        
        if (existsForClassification) {
          // Update existing rule
          const payload = viewMode === 'caa'
              ? { has_caa_override: true, caa_override_amount: amountNum }
              : { amount: amountNum };
          
          return updateFeeRule(ruleIdNum, payload)
        } else {
          // Create new classification-specific rule based on template
          const payload = {
            fee_name: templateRule.fee_name,
            fee_code: templateRule.fee_code,
            applies_to_aircraft_classification_id: classificationId,
            amount: amountNum,
            currency: templateRule.currency,
            is_taxable: templateRule.is_taxable,
            is_potentially_waivable_by_fuel_uplift: templateRule.is_potentially_waivable_by_fuel_uplift,
            calculation_basis: templateRule.calculation_basis,
            waiver_strategy: templateRule.waiver_strategy,
            simple_waiver_multiplier: templateRule.simple_waiver_multiplier,
            has_caa_override: viewMode === 'caa' ? true : templateRule.has_caa_override,
            caa_override_amount: viewMode === 'caa' ? amountNum : templateRule.caa_override_amount,
            caa_waiver_strategy_override: templateRule.caa_waiver_strategy_override,
            caa_simple_waiver_multiplier_override: templateRule.caa_simple_waiver_multiplier_override,
            is_primary_fee: templateRule.is_primary_fee,
          }
          
          return createFeeRule(payload)
        }
      })
      
      return Promise.all(updatePromises)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
      toast.success("Classification defaults updated successfully")
      setOpen(false)
    },
    onError: (error) => {
      toast.error("Failed to update classification defaults")
      console.error("Update classification defaults error:", error)
    }
  })

  const onSubmit = (data: EditClassificationDefaultsForm) => {
    updateClassificationDefaultsMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Edit className="h-3 w-3" />
          Edit Class Defaults
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Class Defaults</DialogTitle>
          <DialogDescription>
            {classificationSpecificRules.length > 0 
              ? `Update the default fee amounts for the "${classificationName}" classification. These values will be inherited by all aircraft in this classification unless overridden.`
              : `Set classification-specific default fee amounts for the "${classificationName}" classification. This will create new fee rules specific to this classification based on the global defaults.`
            }
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 max-h-96 overflow-y-auto">
              {rulesToShow.map((rule) => (
                <FormField
                  key={rule.id}
                  control={form.control}
                  name={`fees.${rule.id}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{rule.fee_name}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="0.00" 
                            className="pl-8"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={updateClassificationDefaultsMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateClassificationDefaultsMutation.isPending}
              >
                {updateClassificationDefaultsMutation.isPending ? "Updating..." : "Update Defaults"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 