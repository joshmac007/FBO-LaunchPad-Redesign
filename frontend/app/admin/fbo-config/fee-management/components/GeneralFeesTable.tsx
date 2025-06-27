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
  getGeneralFeeCategory,
  createFeeRule,
  updateFeeRule,
  deleteFeeRule,
  FeeRule,
  CreateFeeRuleRequest,
  UpdateFeeRuleRequest,
} from "@/app/services/admin-fee-config-service"
import { FeeRuleDialog } from "./FeeRuleDialog"

interface GeneralFeesTableProps {
  fboId: number
  generalServiceRules: FeeRule[]
}

interface EditableRow extends Partial<FeeRule> {
  isEditing?: boolean
  isNew?: boolean
  tempId?: string
}

const columnHelper = createColumnHelper<EditableRow>()

export function GeneralFeesTable({ fboId, generalServiceRules }: GeneralFeesTableProps) {
  const [editingRows, setEditingRows] = useState<Set<string>>(new Set())
  const [newRows, setNewRows] = useState<EditableRow[]>([])
  const [editedValues, setEditedValues] = useState<Record<string, Partial<EditableRow>>>({})
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const queryClient = useQueryClient()

  // Fetch general fee category
  const { data: generalCategory } = useQuery({
    queryKey: ['general-fee-category', fboId],
    queryFn: () => getGeneralFeeCategory(fboId),
  })

  // Use the passed general service rules (already filtered by parent)
  const feeRules = generalServiceRules

  // Create fee rule mutation
  const createFeeRuleMutation = useMutation({
    mutationFn: (data: CreateFeeRuleRequest) => createFeeRule(fboId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['general-fee-rules', fboId, generalCategory?.id] })
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
      updateFeeRule(fboId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['general-fee-rules', fboId, generalCategory?.id] })
      toast.success("Service fee updated successfully")
    },
    onError: (error) => {
      toast.error("Failed to update service fee")
      console.error(error)
    },
  })

  // Delete fee rule mutation
  const deleteFeeRuleMutation = useMutation({
    mutationFn: (id: number) => deleteFeeRule(fboId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['general-fee-rules', fboId, generalCategory?.id] })
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
          applies_to_fee_category_id: generalCategory.id,
          amount: getCurrentValue(row, 'amount') as number,
          is_taxable: getCurrentValue(row, 'is_taxable') as boolean || false,
          calculation_basis: 'FIXED_PRICE',
          waiver_strategy: 'NONE',
          has_caa_override: false,
          is_primary_fee: false,
        }
        
        await createFeeRuleMutation.mutateAsync(createData)
        
        // Remove from new rows
        setNewRows(prev => prev.filter(r => r.tempId !== row.tempId))
      } else {
        // Update existing fee rule with edited values
        const updateData: UpdateFeeRuleRequest = {
          fee_name: getCurrentValue(row, 'fee_name') as string,
          fee_code: getCurrentValue(row, 'fee_code') as string,
          amount: getCurrentValue(row, 'amount') as number,
          is_taxable: getCurrentValue(row, 'is_taxable') as boolean,
        }
        
        await updateFeeRuleMutation.mutateAsync({ id: row.id!, data: updateData })
        
        // Clear edited values for this row
        setEditedValues(prev => {
          const newValues = { ...prev }
          delete newValues[rowId]
          return newValues
        })
      }
      
      // Stop editing
      setEditingRows(prev => {
        const newSet = new Set(prev)
        newSet.delete(rowId)
        return newSet
      })
      
    } catch (error) {
      // Error is handled by the mutation's onError
    }
  }

  // Delete row
  const deleteRow = async (row: EditableRow) => {
    if (row.isNew) {
      // Just remove from new rows
      setNewRows(prev => prev.filter(r => r.tempId !== row.tempId))
      setEditingRows(prev => {
        const newSet = new Set(prev)
        newSet.delete(row.tempId!)
        return newSet
      })
    } else {
      // Delete from server
      await deleteFeeRuleMutation.mutateAsync(row.id!)
    }
  }

  const columns = useMemo(() => [
    columnHelper.accessor('fee_name', {
      header: 'Service Name',
      cell: ({ row, getValue }) => {
        const isEditing = row.original.isEditing
        const rowId = row.original.isNew ? row.original.tempId! : row.original.id!.toString()
        
        if (isEditing) {
          return (
            <Input
              value={String(getCurrentValue(row.original, 'fee_name') || '')}
              onChange={(e) => updateRowData(rowId, 'fee_name', e.target.value)}
              placeholder="Enter service name"
              className="h-8"
            />
          )
        }
        return getValue() || ''
      },
    }),
    columnHelper.accessor('fee_code', {
      header: 'Fee Code',
      cell: ({ row, getValue }) => {
        const isEditing = row.original.isEditing
        const rowId = row.original.isNew ? row.original.tempId! : row.original.id!.toString()
        
        if (isEditing) {
          return (
            <Input
              value={String(getCurrentValue(row.original, 'fee_code') || '')}
              onChange={(e) => updateRowData(rowId, 'fee_code', e.target.value)}
              placeholder="Enter code"
              className="h-8"
            />
          )
        }
        return getValue() || ''
      },
    }),
    columnHelper.accessor('amount', {
      header: 'Amount',
      cell: ({ row, getValue }) => {
        const isEditing = row.original.isEditing
        const rowId = row.original.isNew ? row.original.tempId! : row.original.id!.toString()
        
        if (isEditing) {
          return (
            <Input
              type="number"
              value={String(getCurrentValue(row.original, 'amount') || '')}
              onChange={(e) => updateRowData(rowId, 'amount', parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="h-8"
            />
          )
        }
        return `$${getValue() || 0}`
      },
    }),
    columnHelper.accessor('is_taxable', {
      header: 'Taxable',
      cell: ({ row, getValue }) => {
        const isEditing = row.original.isEditing
        const rowId = row.original.isNew ? row.original.tempId! : row.original.id!.toString()
        
        if (isEditing) {
          return (
            <Checkbox
              checked={getCurrentValue(row.original, 'is_taxable') as boolean || false}
              onCheckedChange={(checked) => updateRowData(rowId, 'is_taxable', checked)}
            />
          )
        }
        return (
          <Checkbox
            checked={getValue() || false}
            disabled
          />
        )
      },
    }),
    columnHelper.display({
      id: 'actions',
      cell: ({ row }) => {
        const isEditing = row.original.isEditing
        const rowId = row.original.isNew ? row.original.tempId! : row.original.id!.toString()
        
        if (isEditing) {
          return (
            <div className="flex items-center gap-1">
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
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )
        }
        
        return (
          <div className="flex items-center gap-1">
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
  ], [createFeeRuleMutation.isPending, updateFeeRuleMutation.isPending, deleteFeeRuleMutation.isPending, editedValues])

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })


  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
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
            table.getRowModel().rows.map(row => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No service fees configured.
              </TableCell>
            </TableRow>
          )}
          <TableRow>
            <TableCell colSpan={columns.length} className="h-12">
              <Button
                variant="ghost"
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                disabled={!generalCategory}
              >
                <Plus className="h-4 w-4" />
                Add Service
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <FeeRuleDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        fboId={fboId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['general-fee-rules', fboId, generalCategory?.id] })
          toast.success("Service fee created successfully")
        }}
        defaultValues={{
          is_primary_fee: false, // Default to general fee for this table
          applies_to_fee_category_id: generalCategory?.id,
        }}
        availableCategories={generalCategory ? [generalCategory] : []}
      />
    </div>
  )
}