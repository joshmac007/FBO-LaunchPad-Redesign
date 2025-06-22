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
import { FeeRule, updateFeeRule } from "@/app/services/admin-fee-config-service"

const editCategoryDefaultsSchema = z.object({
  fees: z.record(z.string(), z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "Must be a valid number greater than or equal to 0"
  }))
})

type EditCategoryDefaultsForm = z.infer<typeof editCategoryDefaultsSchema>

interface EditCategoryDefaultsDialogProps {
  fboId: number
  categoryId: number
  categoryName: string
  categoryRules: FeeRule[]
  viewMode: 'standard' | 'caa'
}

export function EditCategoryDefaultsDialog({ 
  fboId, 
  categoryId, 
  categoryName, 
  categoryRules,
  viewMode 
}: EditCategoryDefaultsDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<EditCategoryDefaultsForm>({
    resolver: zodResolver(editCategoryDefaultsSchema),
    defaultValues: {
      fees: {}
    }
  })

  // Initialize form with current fee values
  useEffect(() => {
    if (open && categoryRules.length > 0) {
      const feeValues: Record<string, string> = {}
      categoryRules.forEach(rule => {
        const value = viewMode === 'caa'
          ? rule.caa_override_amount?.toString() ?? rule.amount.toString()
          : rule.amount.toString()
        feeValues[rule.id.toString()] = value
      })
      form.reset({ fees: feeValues })
    }
  }, [open, categoryRules, form, viewMode])

  const updateCategoryDefaultsMutation = useMutation({
    mutationFn: async (data: EditCategoryDefaultsForm) => {
      const updatePromises = Object.entries(data.fees).map(([ruleId, amountStr]) => {
        const ruleIdNum = parseInt(ruleId)
        const amountNum = Number(amountStr)

        const payload = viewMode === 'caa'
            ? { has_caa_override: true, caa_override_amount: amountNum }
            : { amount: amountNum };
        
        return updateFeeRule(fboId, ruleIdNum, payload)
      })
      
      return Promise.all(updatePromises)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consolidated-fee-schedule', fboId] })
      toast.success("Category defaults updated successfully")
      setOpen(false)
    },
    onError: (error) => {
      toast.error("Failed to update category defaults")
      console.error("Update category defaults error:", error)
    }
  })

  const onSubmit = (data: EditCategoryDefaultsForm) => {
    updateCategoryDefaultsMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Edit className="h-3 w-3" />
          Edit Category Defaults
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Category Defaults</DialogTitle>
          <DialogDescription>
            Update the default fee amounts for the "{categoryName}" category.
            These values will be inherited by all aircraft in this category unless overridden.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 max-h-96 overflow-y-auto">
              {categoryRules.map((rule) => (
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
                disabled={updateCategoryDefaultsMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateCategoryDefaultsMutation.isPending}
              >
                {updateCategoryDefaultsMutation.isPending ? "Updating..." : "Update Defaults"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 