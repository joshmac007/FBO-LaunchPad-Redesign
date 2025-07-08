"use client"

import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { PlusIcon, PencilIcon, TrashIcon } from "lucide-react"
import { toast } from "sonner"
import { 
  getFeeRules, 
  createFeeRule, 
  updateFeeRule, 
  deleteFeeRule,
  type FeeRule,
  type CreateFeeRuleRequest,
  type UpdateFeeRuleRequest
} from "@/app/services/admin-fee-config-service"
import { feeRuleSchema, type FeeRuleFormData } from "@/app/schemas/fee-rule.schema"

interface FeeRuleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feeRule?: FeeRule
}

function FeeRuleFormDialog({ open, onOpenChange, feeRule }: FeeRuleFormDialogProps) {
  const queryClient = useQueryClient()
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
      is_potentially_waivable_by_fuel_uplift: false,
      calculation_basis: "FIXED_PRICE",
      waiver_strategy: "NONE",
      has_caa_override: false,
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
        is_potentially_waivable_by_fuel_uplift: feeRule.is_potentially_waivable_by_fuel_uplift,
        calculation_basis: feeRule.calculation_basis,
        // Include waiver fields from existing data (managed in Fuel Waivers tab)
        waiver_strategy: feeRule.waiver_strategy || "NONE",
        simple_waiver_multiplier: feeRule.simple_waiver_multiplier,
        has_caa_override: feeRule.has_caa_override || false,
        caa_override_amount: feeRule.caa_override_amount,
        caa_waiver_strategy_override: feeRule.caa_waiver_strategy_override,
        caa_simple_waiver_multiplier_override: feeRule.caa_simple_waiver_multiplier_override,
      });
    } else {
      form.reset({
        fee_name: "",
        fee_code: "",
        amount: 0,
        currency: "USD",
        is_taxable: false,
        is_potentially_waivable_by_fuel_uplift: false,
        calculation_basis: "FIXED_PRICE",
        // Default values for waiver fields (managed in Fuel Waivers tab)
        waiver_strategy: "NONE",
        simple_waiver_multiplier: undefined,
        has_caa_override: false,
        caa_override_amount: undefined,
        caa_waiver_strategy_override: undefined,
        caa_simple_waiver_multiplier_override: undefined,
      });
    }
  }, [feeRule, form])

  const createMutation = useMutation({
    mutationFn: createFeeRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-rules'] })
      onOpenChange(false)
      form.reset()
      toast.success("Fee type created successfully")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create fee type")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateFeeRuleRequest }) => updateFeeRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-rules'] })
      onOpenChange(false)
      toast.success("Fee type updated successfully")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update fee type")
    },
  })

  const onSubmit = (data: FeeRuleFormData) => {
    if (isEdit && feeRule) {
      updateMutation.mutate({ id: feeRule.id, data: data as UpdateFeeRuleRequest })
    } else {
      createMutation.mutate(data as CreateFeeRuleRequest)
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
                name="is_potentially_waivable_by_fuel_uplift"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel>Can Be Waived with Fuel Purchase</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Allow this fee to be waived when customers buy enough fuel
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

export function FeeLibraryTab() {
  const queryClient = useQueryClient()
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingFeeRule, setEditingFeeRule] = useState<FeeRule | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<number | null>(null)

  // Fetch fee rules
  const { data: feeRules = [], isLoading: feeRulesLoading } = useQuery<FeeRule[]>({
    queryKey: ['fee-rules'],
    queryFn: () => getFeeRules(),
  })


  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteFeeRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-rules'] })
      setDeleteDialogOpen(null) // Close the dialog
      toast.success("Fee type deleted successfully")
    },
    onError: (error: any) => {
      setDeleteDialogOpen(null) // Close the dialog on error too
      toast.error(error.message || "Failed to delete fee type")
    },
  })

  const handleCreateNew = () => {
    setEditingFeeRule(undefined)
    setFormDialogOpen(true)
  }

  const handleEdit = (feeRule: FeeRule) => {
    setEditingFeeRule(feeRule)
    setFormDialogOpen(true)
  }

  const handleDelete = (feeRuleId: number) => {
    if (deleteMutation.isPending) {
      return // Prevent multiple deletion attempts
    }
    deleteMutation.mutate(feeRuleId)
  }


  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Fee Types</CardTitle>
              <CardDescription>Manage global fee definitions. Classification-specific and aircraft-specific fees are set in the Fee Schedule.</CardDescription>
            </div>
            <Button onClick={handleCreateNew}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Fee
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {feeRulesLoading ? (
            <div className="text-center py-8">Loading fee types...</div>
          ) : feeRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No fee types found. Create your first fee type to get started (like ramp fees, handling fees, overnight fees, etc.).
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fee Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Default Amount</TableHead>
                  <TableHead>Can Be Waived?</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">
                      {rule.fee_name}
                    </TableCell>
                    <TableCell>{rule.fee_code}</TableCell>
                    <TableCell>${rule.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      {rule.is_potentially_waivable_by_fuel_uplift ? (
                        <Badge variant="outline">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(rule)}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Button>
                        <AlertDialog open={deleteDialogOpen === rule.id} onOpenChange={(open) => setDeleteDialogOpen(open ? rule.id : null)}>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Fee Type</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{rule.fee_name}"? This will remove this fee type from your system and cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(rule.id)}
                                disabled={deleteMutation.isPending}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {deleteMutation.isPending ? "Deleting..." : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FeeRuleFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        feeRule={editingFeeRule}
      />
    </div>
  )
}