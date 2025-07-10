"use client"

import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { PlusIcon, PencilIcon, TrashIcon } from "lucide-react"
import { toast } from "sonner"
import { useUserPreferences } from "@/app/contexts/user-preferences-context"
import { OptimisticEditableCell } from "@/components/ui/optimistic-editable-cell"
import { TableCellErrorBoundary } from "@/components/ui/optimistic-error-boundary"
import { useDebouncedFeeRuleFieldUpdate } from "@/app/hooks/use-debounced-fee-rule-mutations"
import { 
  feeNameEditSchema,
  feeCodeEditSchema,
  feeAmountEditSchema
} from "@/app/schemas/fee-rule-inline-edit.schema"
import { 
  getFeeRules, 
  deleteFeeRule,
  type FeeRule
} from "@/app/services/admin-fee-config-service"
import { FeeRuleFormDialog } from "./FeeRuleFormDialog"


export function FeeLibraryTab() {
  const queryClient = useQueryClient()
  const { preferences, updatePreferences } = useUserPreferences()
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingFeeRule, setEditingFeeRule] = useState<FeeRule | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<number | null>(null)

  // Fetch fee rules
  const { data: feeRules = [], isLoading: feeRulesLoading } = useQuery<FeeRule[]>({
    queryKey: ['fee-rules'],
    queryFn: () => getFeeRules(),
  })

  // Ensure a stable ordering (by creation ID) so toggling switches does not reorder rows
  const sortedFeeRules = useMemo(() => {
    return [...feeRules].sort((a, b) => a.id - b.id)
  }, [feeRules])

  // Debounced optimistic field update hook  
  const { debouncedUpdateField, isPending } = useDebouncedFeeRuleFieldUpdate(300)


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

  const handleColumnToggle = async (feeCode: string, isChecked: boolean) => {
    try {
      const currentCodes = preferences.fee_schedule_column_codes || []
      const newCodes = isChecked 
        ? [...currentCodes, feeCode]
        : currentCodes.filter(code => code !== feeCode)
      
      await updatePreferences({ fee_schedule_column_codes: newCodes })
      toast.success(`Column ${isChecked ? 'enabled' : 'disabled'} successfully`)
    } catch (error) {
      toast.error('Failed to update column visibility')
    }
  }

  // Inline editing handlers with debouncing
  const handleUpdateFeeName = async (feeRuleId: number, newValue: string | number) => {
    debouncedUpdateField(feeRuleId, 'fee_name', newValue as string)
  }

  const handleUpdateFeeCode = async (feeRuleId: number, newValue: string | number) => {
    debouncedUpdateField(feeRuleId, 'fee_code', newValue as string)
  }

  const handleUpdateAmount = async (feeRuleId: number, newValue: string | number) => {
    debouncedUpdateField(feeRuleId, 'amount', Number(newValue))
  }

  const handleUpdateWaivable = async (feeRuleId: number, isWaivable: boolean) => {
    // Don't debounce boolean toggles - they should be immediate
    debouncedUpdateField(feeRuleId, 'is_manually_waivable', isWaivable)
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
                  <TableHead>Enable Manual Waiver</TableHead>
                  <TableHead>Displayed as Column</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedFeeRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">
                      <TableCellErrorBoundary>
                        <OptimisticEditableCell
                          value={rule.fee_name}
                          type="text"
                          onSave={(newValue) => handleUpdateFeeName(rule.id, newValue)}
                          isPending={isPending}
                          validation={feeNameEditSchema}
                          placeholder="Enter fee name"
                        />
                      </TableCellErrorBoundary>
                    </TableCell>
                    <TableCell>
                      <TableCellErrorBoundary>
                        <OptimisticEditableCell
                          value={rule.fee_code}
                          type="text"
                          onSave={(newValue) => handleUpdateFeeCode(rule.id, newValue)}
                          isPending={isPending}
                          validation={feeCodeEditSchema}
                          placeholder="ENTER_CODE"
                        />
                      </TableCellErrorBoundary>
                    </TableCell>
                    <TableCell>
                      <TableCellErrorBoundary>
                        <OptimisticEditableCell
                          value={rule.amount}
                          type="currency"
                          onSave={(newValue) => handleUpdateAmount(rule.id, newValue)}
                          isPending={isPending}
                          validation={feeAmountEditSchema}
                          prefix="$"
                          placeholder="0.00"
                        />
                      </TableCellErrorBoundary>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={rule.is_manually_waivable}
                          onCheckedChange={(checked) => handleUpdateWaivable(rule.id, checked)}
                          disabled={isPending}
                        />
                        <span className="text-sm text-muted-foreground">
                          {rule.is_manually_waivable ? "Yes" : "No"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={preferences.fee_schedule_column_codes?.includes(rule.fee_code) || false}
                          onCheckedChange={(checked) => handleColumnToggle(rule.fee_code, checked as boolean)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {preferences.fee_schedule_column_codes?.includes(rule.fee_code) ? "Visible" : "Hidden"}
                        </span>
                      </div>
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