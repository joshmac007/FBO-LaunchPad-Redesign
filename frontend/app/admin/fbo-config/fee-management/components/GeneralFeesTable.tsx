"use client"

import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Check, X, Edit, Trash2 } from "lucide-react"
import {
  getGeneralAircraftClassification,
  createFeeRule,
  updateFeeRule,
  deleteFeeRule,
  FeeRule,
  CreateFeeRuleRequest,
  UpdateFeeRuleRequest,
} from "@/app/services/admin-fee-config-service"
import { FeeRuleDialog } from "./FeeRuleDialog"

interface GeneralFeesTableProps {
  generalServiceRules: FeeRule[]
}

interface EditableRow extends Partial<FeeRule> {
  isEditing?: boolean
  isNew?: boolean
  tempId?: string
}

const columnHelper = createColumnHelper<EditableRow>()

export function GeneralFeesTable({ generalServiceRules }: GeneralFeesTableProps) {
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set())
  const [newRows, setNewRows] = useState<EditableRow[]>([])
  const [editedValues, setEditedValues] = useState<Record<string, Partial<EditableRow>>>({})
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const queryClient = useQueryClient()

  // Fetch general fee category
  const { data: generalCategory } = useQuery({
    queryKey: ['general-fee-category'],
    queryFn: () => getGeneralAircraftClassification(),
  })

  // Use the passed general service rules (already filtered by parent)
  const feeRules = generalServiceRules

  // Create fee rule mutation
  const createFeeRuleMutation = useMutation({
    mutationFn: (data: CreateFeeRuleRequest) => createFeeRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['general-fee-rules', generalCategory?.id] })
      toast.success("Service fee created successfully")
    },
    onError: (error) => {
      toast.error("Failed to create service fee")
      console.error(error)
    },
  })

  // Update fee rule mutation
  const updateFeeRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateFeeRuleRequest }) => 
      updateFeeRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['general-fee-rules', generalCategory?.id] })
      toast.success("Service fee updated successfully")
    },
    onError: (error) => {
      toast.error("Failed to update service fee")
      console.error(error)
    },
  })

  // Delete fee rule mutation
  const deleteFeeRuleMutation = useMutation({
    mutationFn: (id: number) => deleteFeeRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['general-fee-rules', generalCategory?.id] })
      toast.success("Service fee deleted successfully")
    },
    onError: (error) => {
      toast.error("Failed to delete service fee")
      console.error(error)
    },
  })

  // Combine existing rules with new rows
  const tableData = useMemo(() => {
    const existingRules: EditableRow[] = feeRules.map(rule => ({
      ...rule,
      isEditing: editingRows.has(rule.id.toString()),
      isNew: false,
    }))
    return [...existingRules, ...newRows]
  }, [feeRules, editingRows, newRows])

  // Add new row
  const addNewRow = () => {
    const tempId = `new-${Date.now()}`
    const newRow: EditableRow = {
      tempId,
      fee_name: "",
      fee_code: "",
      amount: 0,
      is_taxable: true,
      isEditing: true,
      isNew: true,
    }
    setNewRows(prev => [...prev, newRow])
    setEditingRows(prev => new Set([...prev, tempId]))
  }

  // Start editing existing row
  const startEditing = (id: string) => {
    setEditingRows(prev => new Set([...prev, id]))
  }

  // Cancel editing
  const cancelEditing = (id: string) => {
    setEditingRows(prev => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
    
    // If it's a new row, remove it
    if (id.startsWith('new-')) {
      setNewRows(prev => prev.filter(row => row.tempId !== id))
    } else {
      // Clear any edited values for existing rows
      setEditedValues(prev => {
        const newValues = { ...prev }
        delete newValues[id]
        return newValues
      })
    }
  }

  // Update row data
  const updateRowData = (rowId: string, field: keyof EditableRow, value: any) => {
    if (rowId.startsWith('new-')) {
      setNewRows(prev => prev.map(row => 
        row.tempId === rowId 
          ? { ...row, [field]: value }
          : row
      ))
    } else {
      // For existing rows, track the edited values
      setEditedValues(prev => ({
        ...prev,
        [rowId]: {
          ...prev[rowId],
          [field]: value
        }
      }))
    }
  }

  // Get current value for a field (either edited value or original)
  const getCurrentValue = (row: EditableRow, field: keyof EditableRow) => {
    const rowId = row.isNew ? row.tempId! : row.id!.toString()
    if (row.isNew) {
      return row[field]
    } else {
      const editedValue = editedValues[rowId]?.[field]
      return editedValue !== undefined ? editedValue : row[field]
    }
  }

  // Save row
  const saveRow = async (row: EditableRow) => {
    if (!generalCategory) return

    const rowId = row.isNew ? row.tempId! : row.id!.toString()
    
    try {
      if (row.isNew) {
        // Create new fee rule
        const createData: CreateFeeRuleRequest = {
          fee_name: getCurrentValue(row, 'fee_name') as string,
          fee_code: getCurrentValue(row, 'fee_code') as string,
          applies_to_aircraft_classification_id: generalCategory.id,
          amount: getCurrentValue(row, 'amount') as number,
          is_taxable: getCurrentValue(row, 'is_taxable') as boolean || false,
          calculation_basis: 'FIXED_PRICE',
          waiver_strategy: 'NONE',
          has_caa_override: false,
          is_primary_fee: false,
        }
        
        await createFeeRuleMutation.mutateAsync(createData)
        
        // Remove from new rows and stop editing
        setNewRows(prev => prev.filter(r => r.tempId !== rowId))
        setEditingRows(prev => {
          const newSet = new Set(prev)
          newSet.delete(rowId)
          return newSet
        })
      } else {
        // Update existing fee rule
        const editedData = editedValues[rowId] || {}
        const updateData: UpdateFeeRuleRequest = {}
        
        // Only include fields that were actually edited
        if ('fee_name' in editedData) updateData.fee_name = editedData.fee_name as string
        if ('fee_code' in editedData) updateData.fee_code = editedData.fee_code as string
        if ('amount' in editedData) updateData.amount = editedData.amount as number
        if ('is_taxable' in editedData) updateData.is_taxable = editedData.is_taxable as boolean
        
        await updateFeeRuleMutation.mutateAsync({ id: row.id!, data: updateData })
        
        // Clear edited values and stop editing
        setEditedValues(prev => {
          const newValues = { ...prev }
          delete newValues[rowId]
          return newValues
        })
        setEditingRows(prev => {
          const newSet = new Set(prev)
          newSet.delete(rowId)
          return newSet
        })
      }
    } catch (error) {
      console.error('Error saving row:', error)
    }
  }

  // Delete row
  const deleteRow = async (row: EditableRow) => {
    if (!row.id) return
    
    try {
      await deleteFeeRuleMutation.mutateAsync(row.id)
    } catch (error) {
      console.error('Error deleting row:', error)
    }
  }

  const handleCreateDialogSuccess = () => {
    setShowCreateDialog(false)
    queryClient.invalidateQueries({ queryKey: ['general-fee-rules', generalCategory?.id] })
  }

  // Define columns
  const columns = useMemo(() => [
    columnHelper.accessor('fee_name', {
      header: 'Fee Name',
      cell: ({ row }) => {
        const isEditing = row.original.isEditing
        const rowId = row.original.isNew ? row.original.tempId! : row.original.id!.toString()
        const currentValue = getCurrentValue(row.original, 'fee_name') as string
        
        if (isEditing) {
          return (
            <Input
              value={currentValue || ''}
              onChange={(e) => updateRowData(rowId, 'fee_name', e.target.value)}
              placeholder="Enter fee name"
              className="w-full"
            />
          )
        }
        return <span>{currentValue || ''}</span>
      },
    }),
    columnHelper.accessor('fee_code', {
      header: 'Fee Code',
      cell: ({ row }) => {
        const isEditing = row.original.isEditing
        const rowId = row.original.isNew ? row.original.tempId! : row.original.id!.toString()
        const currentValue = getCurrentValue(row.original, 'fee_code') as string
        
        if (isEditing) {
          return (
            <Input
              value={currentValue || ''}
              onChange={(e) => updateRowData(rowId, 'fee_code', e.target.value)}
              placeholder="Enter fee code"
              className="w-full"
            />
          )
        }
        return <span>{currentValue || ''}</span>
      },
    }),
    columnHelper.accessor('amount', {
      header: 'Amount',
      cell: ({ row }) => {
        const isEditing = row.original.isEditing
        const rowId = row.original.isNew ? row.original.tempId! : row.original.id!.toString()
        const currentValue = getCurrentValue(row.original, 'amount') as number
        
        if (isEditing) {
          return (
            <Input
              type="number"
              value={currentValue?.toString() || ''}
              onChange={(e) => updateRowData(rowId, 'amount', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full"
            />
          )
        }
        return <span>${currentValue?.toFixed(2) || '0.00'}</span>
      },
    }),
    columnHelper.accessor('is_taxable', {
      header: 'Taxable',
      cell: ({ row }) => {
        const isEditing = row.original.isEditing
        const rowId = row.original.isNew ? row.original.tempId! : row.original.id!.toString()
        const currentValue = getCurrentValue(row.original, 'is_taxable') as boolean
        
        if (isEditing) {
          return (
            <Checkbox
              checked={currentValue || false}
              onCheckedChange={(checked) => updateRowData(rowId, 'is_taxable', checked)}
            />
          )
        }
        return (
          <Checkbox
            checked={currentValue || false}
            disabled
          />
        )
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const isEditing = row.original.isEditing
        const rowId = row.original.isNew ? row.original.tempId! : row.original.id!.toString()
        
        if (isEditing) {
          return (
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => saveRow(row.original)}
                disabled={createFeeRuleMutation.isPending || updateFeeRuleMutation.isPending}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => cancelEditing(rowId)}
                disabled={createFeeRuleMutation.isPending || updateFeeRuleMutation.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }
        
        return (
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => startEditing(rowId)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteRow(row.original)}
              disabled={deleteFeeRuleMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    }),
  ], [getCurrentValue, updateRowData, saveRow, cancelEditing, startEditing, deleteRow, createFeeRuleMutation.isPending, updateFeeRuleMutation.isPending, deleteFeeRuleMutation.isPending])

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">General Service Fees</h3>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            onClick={addNewRow}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Row</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Fee Rule</span>
          </Button>
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No general service fees found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Fee Rule Dialog */}
      <FeeRuleDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleCreateDialogSuccess}
        availableCategories={generalCategory ? [{ id: generalCategory.id, name: generalCategory.name }] : []}
        defaultValues={{
          applies_to_aircraft_classification_id: generalCategory?.id || 0,
          calculation_basis: 'FIXED_PRICE',
          waiver_strategy: 'NONE',
          has_caa_override: false,
          is_primary_fee: false,
        }}
      />
    </div>
  )
}