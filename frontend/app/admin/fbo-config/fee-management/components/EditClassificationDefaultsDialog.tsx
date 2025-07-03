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
import { GlobalFeeRule, GlobalFeeRuleOverride, upsertFeeRuleOverride } from "@/app/services/admin-fee-config-service"

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
  currentOverrides?: GlobalFeeRuleOverride[]
  viewMode: 'standard' | 'caa'
  iconOnly?: boolean
}

export function EditClassificationDefaultsDialog({ 
  classificationId, 
  classificationName, 
  classificationRules,
  currentOverrides = [],
  viewMode,
  iconOnly = false
}: EditClassificationDefaultsDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<EditClassificationDefaultsForm>({
    resolver: zodResolver(editClassificationDefaultsSchema),
    defaultValues: {
      fees: {}
    }
  })

  // Helper function to find override for a specific fee rule
  const findOverride = (feeRuleId: number) => {
    return currentOverrides.find(o => o.classification_id === classificationId && o.fee_rule_id === feeRuleId)
  }

  // Initialize form with current fee values (from overrides or base rules)
  useEffect(() => {
    if (open && classificationRules.length > 0) {
      const feeValues: Record<string, string> = {}
      classificationRules.forEach(rule => {
        const override = findOverride(rule.id)
        const value = viewMode === 'caa'
          ? (override?.override_caa_amount?.toString() ?? rule.caa_override_amount?.toString() ?? rule.amount.toString())
          : (override?.override_amount?.toString() ?? rule.amount.toString())
        feeValues[rule.id.toString()] = value
      })
      form.reset({ fees: feeValues })
    }
  }, [open, classificationRules, currentOverrides, form, viewMode, classificationId])

  const updateClassificationDefaultsMutation = useMutation({
    mutationFn: async (data: EditClassificationDefaultsForm) => {
      const updatePromises = Object.entries(data.fees).map(([ruleId, amountStr]) => {
        const ruleIdNum = parseInt(ruleId)
        const amountNum = Number(amountStr)
        const baseRule = classificationRules.find(r => r.id === ruleIdNum)
        
        if (!baseRule) {
          throw new Error(`Rule with ID ${ruleIdNum} not found`)
        }

        // Create or update an override for this classification and fee rule
        const payload = viewMode === 'caa'
          ? { 
              classification_id: classificationId,
              fee_rule_id: ruleIdNum,
              override_caa_amount: amountNum
            }
          : { 
              classification_id: classificationId,
              fee_rule_id: ruleIdNum,
              override_amount: amountNum
            };
        
        return upsertFeeRuleOverride(payload)
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
        <Button 
          variant="outline" 
          size="sm" 
          className={iconOnly ? "h-8" : "flex items-center gap-2"}
          title={iconOnly ? "Edit Class Defaults" : undefined}
        >
          <Edit className="h-3 w-3" />
          {!iconOnly && "Edit Class Defaults"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Class Defaults</DialogTitle>
          <DialogDescription>
            Update the default fee amounts for the "{classificationName}" classification. These values will override the base fee amounts for all aircraft in this classification.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 max-h-96 overflow-y-auto">
              {classificationRules.map((rule) => (
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
                            step="1"
                            placeholder="0" 
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