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
  getAircraftClassifications,
  createFeeRule, 
  updateFeeRule, 
  deleteFeeRule,
  type FeeRule,
  type AircraftClassification,
  type CreateFeeRuleRequest,
  type UpdateFeeRuleRequest
} from "@/app/services/admin-fee-config-service"
import { feeRuleSchema, type FeeRuleFormData } from "@/app/schemas/fee-rule.schema"

interface FeeRuleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feeRule?: FeeRule
  classifications: AircraftClassification[]
}

function FeeRuleFormDialog({ open, onOpenChange, feeRule, classifications }: FeeRuleFormDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!feeRule

  const form = useForm<FeeRuleFormData>({
    resolver: zodResolver(feeRuleSchema),
    defaultValues: feeRule ? {
      fee_name: feeRule.fee_name,
      fee_code: feeRule.fee_code,
      applies_to_aircraft_classification_id: feeRule.applies_to_aircraft_classification_id,
      amount: feeRule.amount,
      currency: feeRule.currency,
      is_taxable: feeRule.is_taxable,
      is_potentially_waivable_by_fuel_uplift: feeRule.is_potentially_waivable_by_fuel_uplift,
      calculation_basis: feeRule.calculation_basis,
      waiver_strategy: feeRule.waiver_strategy,
      simple_waiver_multiplier: feeRule.simple_waiver_multiplier,
      has_caa_override: feeRule.has_caa_override,
      caa_override_amount: feeRule.caa_override_amount,
      caa_waiver_strategy_override: feeRule.caa_waiver_strategy_override,
      caa_simple_waiver_multiplier_override: feeRule.caa_simple_waiver_multiplier_override,
      is_primary_fee: feeRule.is_primary_fee,
    } : {
      fee_name: "",
      fee_code: "",
      applies_to_aircraft_classification_id: 0,
      amount: 0,
      currency: "USD",
      is_taxable: false,
      is_potentially_waivable_by_fuel_uplift: false,
      calculation_basis: "FIXED_PRICE",
      waiver_strategy: "NONE",
      has_caa_override: false,
      is_primary_fee: false,
    },
  })

  const createMutation = useMutation({
    mutationFn: createFeeRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-rules'] })
      onOpenChange(false)
      form.reset()
      toast.success("Fee rule created successfully")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create fee rule")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateFeeRuleRequest }) => updateFeeRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-rules'] })
      onOpenChange(false)
      toast.success("Fee rule updated successfully")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update fee rule")
    },
  })

  const onSubmit = (data: FeeRuleFormData) => {
    if (isEdit && feeRule) {
      updateMutation.mutate({ id: feeRule.id, data })
    } else {
      createMutation.mutate(data as CreateFeeRuleRequest)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Fee Rule" : "Create New Fee Rule"}</DialogTitle>
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

            <FormField
              control={form.control}
              name="applies_to_aircraft_classification_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aircraft Classification</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select classification" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classifications.map((classification) => (
                        <SelectItem key={classification.id} value={classification.id.toString()}>
                          {classification.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    <FormLabel>Potentially Waivable by Fuel Uplift</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_primary_fee"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Primary Fee</FormLabel>
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

  // Fetch aircraft classifications
  const { data: classifications = [] } = useQuery<AircraftClassification[]>({
    queryKey: ['aircraft-classifications'],
    queryFn: () => getAircraftClassifications(),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteFeeRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-rules'] })
      setDeleteDialogOpen(null) // Close the dialog
      toast.success("Fee rule deleted successfully")
    },
    onError: (error: any) => {
      setDeleteDialogOpen(null) // Close the dialog on error too
      toast.error(error.message || "Failed to delete fee rule")
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

  const getClassificationName = (classificationId: number) => {
    const classification = classifications.find(c => c.id === classificationId)
    return classification?.name || "Unknown"
  }

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Fee Library</CardTitle>
              <CardDescription>Define all possible fees and their default properties</CardDescription>
            </div>
            <Button onClick={handleCreateNew}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add New Fee Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {feeRulesLoading ? (
            <div className="text-center py-8">Loading fee rules...</div>
          ) : feeRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No fee rules found. Create your first fee rule to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fee Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Classification</TableHead>
                  <TableHead>Default Amount</TableHead>
                  <TableHead>Waivable?</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">
                      {rule.fee_name}
                      {rule.is_primary_fee && (
                        <Badge variant="secondary" className="ml-2">Primary</Badge>
                      )}
                    </TableCell>
                    <TableCell>{rule.fee_code}</TableCell>
                    <TableCell>{getClassificationName(rule.applies_to_aircraft_classification_id)}</TableCell>
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
                              <AlertDialogTitle>Delete Fee Rule</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{rule.fee_name}"? This action cannot be undone.
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
        classifications={classifications}
      />
    </div>
  )
}