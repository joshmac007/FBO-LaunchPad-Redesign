"use client"

import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, Plus, MoreHorizontal, Move, AlertCircle, Loader2, ChevronDown, ChevronUp, Eye } from "lucide-react"
import { useUserPreferences } from "@/app/contexts/user-preferences-context"
import { cn } from "@/lib/utils"
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuCheckboxItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EditableFeeCell } from "./EditableFeeCell"
import { EditableMinFuelCell } from "./EditableMinFuelCell"
import { NewAircraftTableRow } from "./NewAircraftTableRow"
import { CreateClassificationDialog } from "./CreateClassificationDialog"
import { MoveAircraftDialog } from "./MoveAircraftDialog"
import { ViewAircraftDetailsDialog } from "./ViewAircraftDetailsDialog"
import {
  GlobalFeeSchedule,
  GlobalFeeRule,
  upsertFeeRuleOverride,
  deleteFeeRuleOverride,
  updateMinFuelForAircraft,
} from "@/app/services/admin-fee-config-service"
import { deleteAircraftType } from "@/app/services/aircraft-service"
import React from "react"

// Row data types for react-table
export interface ClassificationRowData {
  id: string;
  type: 'classification';
  classification_id: number;
  classification_name: string;
  aircraft_count: number;
  aircraft_types: any[];
}

export interface AircraftRowData {
  id: string;
  type: 'aircraft';
  aircraft_type_id: number;
  aircraft_type_name: string;
  classification_id: number;
  classification_name: string;
  base_min_fuel_gallons_for_waiver: string | number;
  fees: Record<string, any>;
}

export type TableRowData = ClassificationRowData | AircraftRowData;

interface FeeScheduleTableProps {
  searchTerm: string
  primaryFeeRules: GlobalFeeRule[]
  globalData?: GlobalFeeSchedule
  showClassificationDefaults?: boolean
}

export function FeeScheduleTable({
  searchTerm,
  primaryFeeRules,
  globalData,
  showClassificationDefaults = true
}: FeeScheduleTableProps) {
  const queryClient = useQueryClient()
  const { preferences, updatePreferences } = useUserPreferences()
  const [addingToCategory, setAddingToCategory] = useState<number | null>(null)
  const [showCreateClassificationDialog, setShowCreateClassificationDialog] = useState(false)
  const [showMoveAircraftDialog, setShowMoveAircraftDialog] = useState(false)
  const [selectedAircraftToMove, setSelectedAircraftToMove] = useState<{
    aircraft_type_id: number;
    aircraft_type_name: string;
    classification_id: number;
  } | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedAircraftToDelete, setSelectedAircraftToDelete] = useState<{
    aircraft_type_id: number;
    aircraft_type_name: string;
  } | null>(null)
  const [deleteDialogView, setDeleteDialogView] = useState<'confirm' | 'error'>('confirm')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeletingAircraft, setIsDeletingAircraft] = useState(false)
  const [collapsedClassifications, setCollapsedClassifications] = useState<Record<number, boolean>>({})
  const [showViewAircraftDialog, setShowViewAircraftDialog] = useState(false)
  const [selectedAircraftToView, setSelectedAircraftToView] = useState<AircraftRowData | null>(null)

  // Use the global data passed from parent
  const data = globalData
  const isLoading = !globalData
  const error = null

  // Filter and search classifications and their aircraft types
  const filteredSchedule = useMemo(() => {
    if (!data?.schedule) return []
    
    return data.schedule.map(classification => ({
      ...classification,
      aircraft_types: classification.aircraft_types.filter(aircraft =>
        searchTerm === '' || 
        aircraft.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        classification.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(classification => 
      classification.aircraft_types.length > 0 || searchTerm === ''
    )
  }, [data?.schedule, searchTerm])

  // Create mixed data structure with classifications and aircraft for react-table
  const tableData = useMemo(() => {
    const rows: TableRowData[] = []
    
    filteredSchedule.forEach(classification => {
      // Always add classification header row
      rows.push({
        id: `classification-${classification.id}`,
        type: 'classification',
        classification_id: classification.id,
        classification_name: classification.name,
        aircraft_count: classification.aircraft_types.length,
        aircraft_types: classification.aircraft_types
      })
      
      // Add aircraft rows under this classification if not collapsed
      if (!collapsedClassifications[classification.id]) {
        classification.aircraft_types.forEach(aircraft => {
          rows.push({
            id: `aircraft-${aircraft.id}`,
            type: 'aircraft',
            aircraft_type_id: aircraft.id,
            aircraft_type_name: aircraft.name,
            classification_id: classification.id,
            classification_name: classification.name,
            base_min_fuel_gallons_for_waiver: aircraft.base_min_fuel_gallons_for_waiver,
            fees: aircraft.fees || {}
          })
        })
      }
    })
    
    return rows
  }, [filteredSchedule, collapsedClassifications])


  // Mutations with simple invalidation strategy
  const upsertOverrideMutation = useMutation({
    mutationFn: ({ aircraftTypeId, feeRuleId, amount }: { aircraftTypeId: number; feeRuleId: number; amount: number }) => {
      const payload = { aircraft_type_id: aircraftTypeId, fee_rule_id: feeRuleId, override_amount: amount };
      return upsertFeeRuleOverride(payload);
    },
    onError: (error) => {
      toast.error("Failed to update fee override")
    },
    onSuccess: () => {
      // Simple invalidation - no brittle cache manipulation
      queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
      toast.success("Fee override updated successfully")
    }
  })

  // Classification-level fee override mutation
  const upsertClassificationOverrideMutation = useMutation({
    mutationFn: ({ classificationId, feeRuleId, amount }: { classificationId: number; feeRuleId: number; amount: number }) => {
      const payload = { classification_id: classificationId, fee_rule_id: feeRuleId, override_amount: amount };
      return upsertFeeRuleOverride(payload);
    },
    onError: (error) => {
      toast.error("Failed to update classification fee override")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
      toast.success("Classification fee override updated successfully")
    }
  })

  const deleteOverrideMutation = useMutation({
    mutationFn: (params: { aircraft_type_id: number; fee_rule_id: number }) =>
      deleteFeeRuleOverride(params),
    onError: (error) => {
      toast.error("Failed to remove fee override")
    },
    onSuccess: () => {
      // Simple invalidation - no brittle cache manipulation
      queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
      toast.success("Fee override removed successfully")
    }
  })

  const updateMinFuelMutation = useMutation({
    mutationFn: ({ aircraftTypeId, minFuel }: { aircraftTypeId: number; minFuel: number }) =>
      updateMinFuelForAircraft(aircraftTypeId, { base_min_fuel_gallons_for_waiver: minFuel }),
    onError: (err) => {
      toast.error("Failed to update Minimum Fuel");
    },
    onSuccess: () => {
      // Simple invalidation - no brittle cache manipulation
      queryClient.invalidateQueries({ queryKey: ["global-fee-schedule"] });
      toast.success("Minimum Fuel updated successfully");
    },
  });

  // Column helper
  const columnHelper = createColumnHelper<TableRowData>()

  // Create columns for react-table
  const columns = useMemo(() => [
    // Aircraft Type / Classification Name column
    columnHelper.display({
      id: 'name',
      header: 'AIRCRAFT TYPE',
      cell: ({ row }) => {
        const rowData = row.original;
        
        if (rowData.type === 'classification') {
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleClassificationCollapse(rowData.classification_id)}
                className="h-6 w-6 p-0"
                aria-label="Toggle classification"
              >
                {collapsedClassifications[rowData.classification_id] ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronUp className="h-4 w-4" />
                }
              </Button>
              <span className="font-semibold">
                {rowData.classification_name}
                <span className="text-sm text-muted-foreground font-normal ml-2">
                  ({rowData.aircraft_count})
                </span>
              </span>
            </div>
          );
        }
        
        if (rowData.type === 'aircraft') {
          return <span className="ml-8">{rowData.aircraft_type_name}</span>;
        }
        
        return null;
      },
    }),
    // Min Fuel column
    columnHelper.display({
      id: 'min_fuel',
      header: 'MIN FUEL',
      cell: ({ row }) => {
        const rowData = row.original;
        
        if (rowData.type === 'classification') {
          return null;
        }
        
        if (rowData.type === 'aircraft') {
          return (
            <EditableMinFuelCell 
              value={Number(rowData.base_min_fuel_gallons_for_waiver)}
              onSave={(newValue) => updateMinFuelMutation.mutate({ 
                aircraftTypeId: rowData.aircraft_type_id, 
                minFuel: newValue 
              })}
            />
          );
        }
        
        return null;
      },
    }),
    // Dynamic fee columns
    ...primaryFeeRules.map(rule => 
      columnHelper.display({
        id: `fee_${rule.id}`,
        header: () => rule.fee_name.toUpperCase(),
        cell: ({ row }) => {
          const rowData = row.original;
          
          // Classification rows - only show values if showClassificationDefaults is true
          if (rowData.type === 'classification') {
            if (!showClassificationDefaults) {
              return null;
            }
            
            // Find the classification-level override for this fee rule
            const classificationOverride = data?.overrides?.find(override => 
              override.classification_id === rowData.classification_id && 
              override.fee_rule_id === rule.id
            );
            
            // Use override value if exists, otherwise use the global rule amount
            const displayValue = classificationOverride?.override_amount ?? rule.amount;
            
            return (
              <EditableFeeCell
                value={displayValue}
                isAircraftOverride={false}
                isClassificationDefault={true}
                onSave={(newValue) => {
                  upsertClassificationOverrideMutation.mutate({
                    classificationId: rowData.classification_id,
                    feeRuleId: rule.id,
                    amount: newValue
                  });
                }}
                highlightOverrides={preferences.highlight_overrides}
              />
            );
          }
          
          if (rowData.type === 'aircraft') {
            const feeDetail = rowData.fees?.[rule.id.toString()];
            
            if (!feeDetail) {
              console.warn(`Missing fee detail for aircraft ${rowData.aircraft_type_name}, rule ${rule.id}`);
              return (
                <EditableFeeCell
                  value={Number(rule.amount)}
                  isAircraftOverride={false}
                  onSave={(newValue) => {
                    upsertOverrideMutation.mutate({
                      aircraftTypeId: rowData.aircraft_type_id,
                      feeRuleId: rule.id,
                      amount: newValue
                    });
                  }}
                  highlightOverrides={preferences.highlight_overrides}
                />
              );
            }

            const displayValue = feeDetail.final_display_value;
            const isOverride = feeDetail.is_aircraft_override;

            return (
              <EditableFeeCell
                value={displayValue}
                isAircraftOverride={isOverride}
                onSave={(newValue) => {
                  upsertOverrideMutation.mutate({
                    aircraftTypeId: rowData.aircraft_type_id,
                    feeRuleId: rule.id,
                    amount: newValue
                  });
                }}
                onRevert={isOverride ? () => {
                  deleteOverrideMutation.mutate({
                    aircraft_type_id: rowData.aircraft_type_id,
                    fee_rule_id: rule.id
                  });
                } : undefined}
                highlightOverrides={preferences.highlight_overrides}
              />
            );
          }
          
          return null;
        },
      })
    ),
    // Actions column
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const rowData = row.original;
        
        // Classification rows have add button
        if (rowData.type === 'classification') {
          return (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation()
                  setAddingToCategory(rowData.classification_id)
                }}
                disabled={addingToCategory !== null}
                className="h-8 w-8 p-0"
                title="Add Aircraft"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          );
        }
        
        // Aircraft rows have actions dropdown
        if (rowData.type === 'aircraft') {
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedAircraftToView(rowData)
                      setShowViewAircraftDialog(true)
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedAircraftToMove({
                        aircraft_type_id: rowData.aircraft_type_id,
                        aircraft_type_name: rowData.aircraft_type_name,
                        classification_id: rowData.classification_id
                      })
                      setShowMoveAircraftDialog(true)
                    }}
                  >
                    <Move className="mr-2 h-4 w-4" />
                    Move to Category
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedAircraftToDelete({
                        aircraft_type_id: rowData.aircraft_type_id,
                        aircraft_type_name: rowData.aircraft_type_name
                      })
                      setDeleteDialogView('confirm')
                      setDeleteError(null)
                      setShowDeleteDialog(true)
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        }
        
        return null;
      },
    }),
  ], [primaryFeeRules, updateMinFuelMutation, upsertOverrideMutation, upsertClassificationOverrideMutation, deleteOverrideMutation, collapsedClassifications, data?.overrides, addingToCategory])

  // Configure the table
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })


  // Handler for MoveAircraftDialog success
  const handleMoveAircraftSuccess = () => {
    // The dialog already handles query invalidation, so we just need to close it
    setShowMoveAircraftDialog(false)
    setSelectedAircraftToMove(null)
  }

  // Delete aircraft mutation with simple invalidation
  const deleteAircraftMutation = useMutation({
    mutationFn: (aircraftTypeId: number) => deleteAircraftType(aircraftTypeId),
    onMutate: async () => {
      // Close dialog and set loading state
      setIsDeletingAircraft(true)
    },
    onError: (error: any) => {
      // Show error state
      console.error("Failed to delete aircraft:", error)
      setDeleteError(error.message || "An unknown error occurred. Please try again.")
      setDeleteDialogView('error')
      setShowDeleteDialog(true)
      setIsDeletingAircraft(false)
      toast.error("Failed to delete aircraft")
    },
    onSuccess: () => {
      // Close dialog and show success
      setShowDeleteDialog(false)
      setSelectedAircraftToDelete(null)
      setIsDeletingAircraft(false)
      toast.success("Aircraft deleted successfully!")
      
      // Simple invalidation - no brittle cache manipulation
      queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
    }
  })

  // Delete handler functions
  const handleConfirmDelete = async () => {
    if (!selectedAircraftToDelete) {
      setDeleteError("No aircraft selected for deletion.")
      setDeleteDialogView('error')
      return
    }
    setDeleteError(null)
    setIsDeletingAircraft(true)

    // Use optimistic mutation
    deleteAircraftMutation.mutate(selectedAircraftToDelete.aircraft_type_id)
  }

  const resetDeleteState = () => {
    setSelectedAircraftToDelete(null)
    setDeleteError(null)
    setDeleteDialogView('confirm')
    setIsDeletingAircraft(false)
  }

  // Toggle classification collapse/expand
  const toggleClassificationCollapse = (classificationId: number) => {
    setCollapsedClassifications(prev => ({
      ...prev,
      [classificationId]: !prev[classificationId]
    }))
  }

  // Context menu handler for column toggle
  const handleContextMenuColumnToggle = async (feeCode: string, isChecked: boolean) => {
    try {
      // If no existing preferences, start with all rule codes (since they're all shown by default)
      const currentCodes = preferences.fee_schedule_column_codes || 
        (globalData?.fee_rules?.map(rule => rule.fee_code) ?? [])
      
      const newCodes = isChecked 
        ? [...currentCodes, feeCode]
        : currentCodes.filter(code => code !== feeCode)
      
      await updatePreferences({ fee_schedule_column_codes: newCodes })
    } catch (error) {
      console.error('Failed to update column visibility:', error)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="border rounded-lg p-6">
        <div className="text-center space-y-1.5">
          <div className="text-muted-foreground">Loading your pricing schedule...</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="border rounded-lg p-6">
        <div className="text-center space-y-3">
          <div className="text-destructive">Couldn't load your pricing schedule</div>
          <Button onClick={() => window.location.reload()} variant="outline" className="h-7">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Handle empty state
  if (tableData.length === 0) {
    return (
      <>
        <Card>
          <CardContent className="pt-5 text-center">
            <p>No fee classifications found.</p>
            <Button 
              className="mt-3 h-7"
              onClick={() => setShowCreateClassificationDialog(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create Your First Classification
            </Button>
          </CardContent>
        </Card>
        
        <CreateClassificationDialog
          open={showCreateClassificationDialog}
          onOpenChange={setShowCreateClassificationDialog}
          onSuccess={(newCategoryId) => {
            // After creating a classification, invalidate queries to refresh the table
            queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
          }}
        />
      </>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table className="w-full">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => {
                    let headerClass = "font-medium text-muted-foreground uppercase text-sm"
                    let paddingClass = ""
                    
                    // Adjust padding for different columns
                    if (header.id === 'name') {
                      paddingClass = "px-2 py-3"
                    } else if (header.id === 'actions') {
                      paddingClass = "px-2 py-3 text-right"
                    } else {
                      paddingClass = "px-2 py-3"
                    }
                    
                    // All columns left aligned except actions
                    if (header.id === 'actions') {
                      headerClass += " text-right"
                    } else {
                      headerClass += " text-left"
                    }
                    
                    return (
                      <TableHead key={header.id} className={`${headerClass} ${paddingClass}`}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())
                        }
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
          </ContextMenuTrigger>
          <ContextMenuContent>
            {globalData?.fee_rules?.map((rule) => (
              <ContextMenuCheckboxItem
                key={rule.id}
                checked={preferences.fee_schedule_column_codes?.includes(rule.fee_code) ?? true}
                onCheckedChange={(checked) => handleContextMenuColumnToggle(rule.fee_code, checked)}
              >
                {rule.fee_name}
              </ContextMenuCheckboxItem>
            ))}
          </ContextMenuContent>
        </ContextMenu>
        <TableBody>
          {table.getRowModel().rows.map(row => (
            <React.Fragment key={row.id}>
              {/* Main row - either classification or aircraft */}
              <TableRow className={
                row.original.type === 'classification' 
                  ? 'bg-muted/50 hover:bg-muted/70' 
                  : ''
              }>
                {row.getVisibleCells().map(cell => {
                  let cellClass = ""
                  let paddingClass = ""
                  
                  // Adjust padding for different columns to match headers
                  if (cell.column.id === 'name') {
                    paddingClass = "px-2 py-3"
                  } else if (cell.column.id === 'actions') {
                    paddingClass = "px-2 py-3 text-right"
                  } else {
                    paddingClass = "px-2 py-3"
                  }
                  
                  // All columns left aligned except actions
                  if (cell.column.id === 'actions') {
                    cellClass = "text-right"
                  } else {
                    cellClass = "text-left"
                  }
                  
                  return (
                    <TableCell key={cell.id} className={`${cellClass} ${paddingClass}`}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  )
                })}
              </TableRow>

              {/* Add Aircraft Row - show after classification rows when adding */}
              {row.original.type === 'classification' && 
               addingToCategory === row.original.classification_id && (
                <NewAircraftTableRow
                  key={`new-aircraft-${row.original.classification_id}`}
                  categoryId={row.original.classification_id}
                  feeColumns={primaryFeeRules.map(rule => rule.fee_code)}
                  primaryFeeRules={primaryFeeRules}
                  onSuccess={() => {
                    setAddingToCategory(null)
                    queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
                  }}
                  onCancel={() => setAddingToCategory(null)}
                />
              )}

            </React.Fragment>
          ))}
        </TableBody>
      </Table>

      {/* View Aircraft Details Dialog */}
      <ViewAircraftDetailsDialog
        aircraft={selectedAircraftToView}
        open={showViewAircraftDialog}
        onOpenChange={setShowViewAircraftDialog}
        feeRules={primaryFeeRules}
      />

      {/* Move Aircraft Dialog */}
      <MoveAircraftDialog
        open={showMoveAircraftDialog}
        onOpenChange={setShowMoveAircraftDialog}
        aircraft={selectedAircraftToMove}
        classifications={data?.schedule ?? []}
        onSuccess={handleMoveAircraftSuccess}
      />

      {/* Delete Aircraft Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open)
        if (!open) resetDeleteState()
      }}>
        <AlertDialogContent>
          {deleteDialogView === 'confirm' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  aircraft type <strong>{selectedAircraftToDelete?.aircraft_type_name}</strong> from the fee schedule.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button
                    onClick={async (e) => {
                      e.preventDefault()
                      await handleConfirmDelete()
                    }}
                    disabled={isDeletingAircraft}
                  >
                    {isDeletingAircraft ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting...</>
                    ) : 'Delete'}
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}

          {deleteDialogView === 'error' && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Cannot Delete Aircraft</AlertDialogTitle>
                <AlertDialogDescription>
                  This aircraft type cannot be deleted because it may be associated with existing data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 my-4 rounded" role="alert">
                <div className="flex">
                  <div className="py-1"><AlertCircle className="h-5 w-5 text-red-500 mr-3"/></div>
                  <div>
                    <p className="font-bold">Error</p>
                    <p className="text-sm">{deleteError}</p>
                  </div>
                </div>
              </div>
              <AlertDialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Close</Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 