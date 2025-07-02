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
import { EditClassificationDefaultsDialog } from "./EditClassificationDefaultsDialog"
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
  viewMode: 'standard' | 'caa'
  searchTerm: string
  primaryFeeRules: GlobalFeeRule[]
  globalData?: GlobalFeeSchedule
}

export function FeeScheduleTable({
  viewMode,
  searchTerm,
  primaryFeeRules,
  globalData
}: FeeScheduleTableProps) {
  const queryClient = useQueryClient()
  const { preferences } = useUserPreferences()
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
      // Add classification header row
      rows.push({
        id: `classification-${classification.id}`,
        type: 'classification',
        classification_id: classification.id,
        classification_name: classification.name,
        aircraft_count: classification.aircraft_types.length,
        aircraft_types: classification.aircraft_types
      })
      
      // Add aircraft rows under this classification (only if not collapsed)
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


  // Mutations for optimistic updates
  const upsertOverrideMutation = useMutation({
    mutationFn: ({ aircraftTypeId, feeRuleId, amount }: { aircraftTypeId: number; feeRuleId: number; amount: number }) => {
      const payload =
        viewMode === 'caa'
          ? { aircraft_type_id: aircraftTypeId, fee_rule_id: feeRuleId, override_caa_amount: amount }
          : { aircraft_type_id: aircraftTypeId, fee_rule_id: feeRuleId, override_amount: amount };
      return upsertFeeRuleOverride(payload);
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['global-fee-schedule'] })
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData<GlobalFeeSchedule>(['global-fee-schedule'])
      
      // Optimistically update the cache
      if (previousData) {
        const newData = { ...previousData }
        
        // Find and update the specific aircraft's fee
        newData.schedule = newData.schedule.map(classification => ({
          ...classification,
          aircraft_types: classification.aircraft_types.map(aircraft => {
            if (aircraft.id === variables.aircraftTypeId) {
              const updatedFees = { ...aircraft.fees }
              const feeKey = variables.feeRuleId.toString()
              
              if (updatedFees[feeKey]) {
                updatedFees[feeKey] = {
                  ...updatedFees[feeKey],
                  ...(viewMode === 'caa' ? {
                    final_caa_display_value: variables.amount,
                    is_caa_aircraft_override: true
                  } : {
                    final_display_value: variables.amount,
                    is_aircraft_override: true
                  })
                }
              }
              
              return { ...aircraft, fees: updatedFees }
            }
            return aircraft
          })
        }))
        
        queryClient.setQueryData(['global-fee-schedule'], newData)
      }
      
      return { previousData, variables }
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(['global-fee-schedule'], context.previousData)
      }
      toast.error("Failed to update fee override")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
      toast.success("Fee override updated successfully")
    }
  })

  const deleteOverrideMutation = useMutation({
    mutationFn: (params: { aircraft_type_id: number; fee_rule_id: number }) =>
      deleteFeeRuleOverride(params),
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['global-fee-schedule'] })
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData<GlobalFeeSchedule>(['global-fee-schedule'])
      
      // Optimistically update the cache
      if (previousData) {
        const newData = { ...previousData }
        
        // Find and revert the specific aircraft's fee to default
        newData.schedule = newData.schedule.map(classification => ({
          ...classification,
          aircraft_types: classification.aircraft_types.map(aircraft => {
            if (aircraft.id === variables.aircraft_type_id) {
              const updatedFees = { ...aircraft.fees }
              const feeKey = variables.fee_rule_id.toString()
              
              if (updatedFees[feeKey]) {
                updatedFees[feeKey] = {
                  ...updatedFees[feeKey],
                  ...(viewMode === 'caa' ? {
                    final_caa_display_value: updatedFees[feeKey].revert_to_caa_value,
                    is_caa_aircraft_override: false
                  } : {
                    final_display_value: updatedFees[feeKey].revert_to_value,
                    is_aircraft_override: false
                  })
                }
              }
              
              return { ...aircraft, fees: updatedFees }
            }
            return aircraft
          })
        }))
        
        queryClient.setQueryData(['global-fee-schedule'], newData)
      }
      
      return { previousData, variables }
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(['global-fee-schedule'], context.previousData)
      }
      toast.error("Failed to remove fee override")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
      toast.success("Fee override removed successfully")
    }
  })

  const updateMinFuelMutation = useMutation({
    mutationFn: ({ aircraftTypeId, minFuel }: { aircraftTypeId: number; minFuel: number }) =>
      updateMinFuelForAircraft(aircraftTypeId, { base_min_fuel_gallons_for_waiver: minFuel }),
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["global-fee-schedule"] });
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData<GlobalFeeSchedule>(["global-fee-schedule"]);

      // Optimistically update the cache
      if (previousData) {
        const newData = { ...previousData }
        
        // Find and update the specific aircraft's min fuel
        newData.schedule = newData.schedule.map(classification => ({
          ...classification,
          aircraft_types: classification.aircraft_types.map(aircraft => {
            if (aircraft.id === variables.aircraftTypeId) {
              return {
                ...aircraft,
                base_min_fuel_gallons_for_waiver: variables.minFuel
              }
            }
            return aircraft
          })
        }))
        
        queryClient.setQueryData(["global-fee-schedule"], newData)
      }

      return { previousData, variables };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(["global-fee-schedule"], context.previousData);
      }
      toast.error("Failed to update Minimum Fuel. Your change has been reverted.");
    },
    onSuccess: () => {
      // Invalidate the query to refetch fresh data from the server
      queryClient.invalidateQueries({ queryKey: ["global-fee-schedule"] });
      toast.success("Minimum Fuel updated successfully.");
    },
  });

  // Column helper
  const columnHelper = createColumnHelper<TableRowData>()

  // Create columns for react-table
  const columns = useMemo(() => [
    // Expander column
    columnHelper.display({
      id: 'expander',
      header: () => null,
      cell: ({ row }) => {
        const rowData = row.original;
        
        // Classification rows have their own collapse/expand logic
        if (rowData.type === 'classification') {
          return (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleClassificationCollapse(rowData.classification_id)}
              className="h-8 w-8"
              aria-label="Toggle classification"
            >
              {collapsedClassifications[rowData.classification_id] ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronUp className="h-4 w-4" />
              }
            </Button>
          );
        }
        
        // Aircraft rows don't have expanders anymore
        if (rowData.type === 'aircraft') {
          return null;
        }
        
        return null;
      },
    }),
    // Aircraft Type / Classification Name column
    columnHelper.display({
      id: 'name',
      header: 'Aircraft Type',
      cell: ({ row }) => {
        const rowData = row.original;
        
        if (rowData.type === 'classification') {
          return (
            <div className="font-semibold">
              {rowData.classification_name}
              <span className="text-sm text-muted-foreground font-normal ml-2">
                ({rowData.aircraft_count} aircraft)
              </span>
            </div>
          );
        }
        
        if (rowData.type === 'aircraft') {
          return <span>{rowData.aircraft_type_name}</span>;
        }
        
        return null;
      },
    }),
    // Min Fuel column
    columnHelper.display({
      id: 'min_fuel',
      header: 'Min Fuel',
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
        header: () => (
          <>
            {rule.fee_name}
            {viewMode === 'caa' && rule.has_caa_override && ' (CAA)'}
          </>
        ),
        cell: ({ row }) => {
          const rowData = row.original;
          
          // Classification rows span multiple columns - return empty
          if (rowData.type === 'classification') {
            return null;
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
                />
              );
            }

            const displayValue = viewMode === 'caa' 
              ? feeDetail.final_caa_display_value 
              : feeDetail.final_display_value;
            const isOverride = viewMode === 'caa'
              ? feeDetail.is_caa_aircraft_override
              : feeDetail.is_aircraft_override;

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
      header: 'Actions',
      cell: ({ row }) => {
        const rowData = row.original;
        
        // Classification rows have edit defaults and add aircraft buttons
        if (rowData.type === 'classification') {
          return (
            <div className="flex items-center gap-1 justify-end">
              <EditClassificationDefaultsDialog
                classificationId={rowData.classification_id}
                classificationName={rowData.classification_name}
                classificationRules={primaryFeeRules}
                currentOverrides={data?.overrides || []}
                viewMode={viewMode}
                iconOnly={true}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  setAddingToCategory(rowData.classification_id)
                }}
                disabled={addingToCategory !== null}
                className="h-7"
                title="Add Aircraft"
              >
                <Plus className="h-3.5 w-3.5" />
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
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
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
  ], [primaryFeeRules, viewMode, updateMinFuelMutation, upsertOverrideMutation, deleteOverrideMutation, collapsedClassifications, data?.overrides, addingToCategory])

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

  // Delete aircraft mutation with optimistic updates
  const deleteAircraftMutation = useMutation({
    mutationFn: (aircraftTypeId: number) => deleteAircraftType(aircraftTypeId),
    onMutate: async (aircraftTypeId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['global-fee-schedule'] })
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['global-fee-schedule'])
      
      // Optimistically remove the aircraft from the cache
      if (previousData) {
        const newData = { ...(previousData as GlobalFeeSchedule) }
        
        newData.schedule = newData.schedule.map(classification => ({
          ...classification,
          aircraft_types: classification.aircraft_types.filter(
            aircraft => aircraft.id !== aircraftTypeId
          )
        }))
        
        queryClient.setQueryData(['global-fee-schedule'], newData)
      }
      
      // Close dialog and show success immediately
      setShowDeleteDialog(false)
      setSelectedAircraftToDelete(null)
      setIsDeletingAircraft(false)
      toast.success("Aircraft deleted successfully!")
      
      return { previousData, aircraftTypeId }
    },
    onError: (error: any, aircraftTypeId, context) => {
      // Rollback optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(['global-fee-schedule'], context.previousData)
      }
      
      // Show error state
      console.error("Failed to delete aircraft:", error)
      setDeleteError(error.message || "An unknown error occurred. Please try again.")
      setDeleteDialogView('error')
      setShowDeleteDialog(true)
      setIsDeletingAircraft(false)
      
      // Override the success toast with error
      toast.error("Failed to delete aircraft. Changes have been reverted.")
    },
    onSuccess: () => {
      // Invalidate to get fresh data from server
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

  // Loading state
  if (isLoading) {
    return (
      <div className="border rounded-lg p-6">
        <div className="text-center space-y-1.5">
          <div className="text-muted-foreground">Loading fee schedule...</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="border rounded-lg p-6">
        <div className="text-center space-y-3">
          <div className="text-destructive">Failed to load fee schedule</div>
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
      <Table 
        className="fee-schedule-table w-full table-fixed"
        data-view-mode={preferences.highlight_overrides ? 'highlight' : 'uniform'}
        style={{
          tableLayout: 'fixed',
          width: '100%'
        }}>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => {
                                 // Define column-specific classes with consistent width styles
                 let headerClassName = ''
                 let headerStyle = {}
                 if (header.id.startsWith('fee_')) {
                   headerClassName = 'hidden md:table-cell text-center px-2 py-2'
                   headerStyle = { width: '12%' }
                 } else if (header.id === 'expander') {
                   headerClassName = 'px-2 py-2'
                   headerStyle = { width: '8%' }
                 } else if (header.id === 'name') {
                   headerClassName = 'px-3 py-2'
                   headerStyle = { width: '30%' }
                 } else if (header.id === 'min_fuel') {
                   headerClassName = 'text-center px-2 py-2'
                   headerStyle = { width: '12%' }
                 } else if (header.id === 'actions') {
                   headerClassName = 'text-right px-3 py-2'
                   headerStyle = { width: '14%' }
                 }
                
                return (
                  <TableHead key={header.id} className={headerClassName} style={headerStyle}>
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
                  // Define column-specific classes with matching width styles
                  let cellClassName = ''
                  let cellStyle = {}
                  if (cell.column.id.startsWith('fee_')) {
                    cellClassName = 'hidden md:table-cell text-center px-2 py-2'
                    cellStyle = { width: '12%' }
                  } else if (cell.column.id === 'expander') {
                    cellClassName = 'px-2 py-2'
                    cellStyle = { width: '8%' }
                  } else if (cell.column.id === 'name') {
                    cellClassName = 'px-3 py-2'
                    cellStyle = { width: '30%' }
                  } else if (cell.column.id === 'min_fuel') {
                    cellClassName = 'text-center px-2 py-2'
                    cellStyle = { width: '12%' }
                  } else if (cell.column.id === 'actions') {
                    cellClassName = 'text-right px-3 py-2'
                    cellStyle = { width: '14%' }
                  }
                  
                  // Check if this is a fee column and if it has override data
                  const isFeeColumn = cell.column.id.startsWith('fee_')
                  const isOverride = isFeeColumn && row.original.type === 'aircraft' 
                    ? (() => {
                        const rowData = row.original as AircraftRowData
                        const feeRuleId = cell.column.id.replace('fee_', '')
                        const feeDetail = rowData.fees?.[feeRuleId]
                        return viewMode === 'caa' 
                          ? feeDetail?.is_caa_aircraft_override 
                          : feeDetail?.is_aircraft_override
                      })()
                    : false

                  return (
                    <TableCell 
                      key={cell.id} 
                      className={cn(
                        cellClassName,
                        preferences.fee_schedule_view_size === 'compact' && 'h-10 px-2 py-1 text-xs'
                      )}
                      style={cellStyle}
                      data-is-override={isOverride}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  )
                })}
              </TableRow>

              {/* Add Aircraft Row - show after classification rows when adding */}
              {row.original.type === 'classification' && 
               addingToCategory === row.original.classification_id && (
                <TableRow className="animate-in fade-in duration-300">
                  <TableCell colSpan={row.getVisibleCells().length}>
                    <NewAircraftTableRow
                      key={`new-aircraft-${row.original.classification_id}`}
                      categoryId={row.original.classification_id}
                      feeColumns={primaryFeeRules.map(rule => rule.fee_code)}
                      primaryFeeRules={primaryFeeRules.filter(r => r.applies_to_classification_id === row.original.classification_id)}
                      onSuccess={() => {
                        setAddingToCategory(null)
                        queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
                      }}
                      onCancel={() => setAddingToCategory(null)}
                    />
                  </TableCell>
                </TableRow>
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
        viewMode={viewMode}
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