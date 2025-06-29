"use client"

import { useMemo, useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, Plus, MoreHorizontal, Move } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditableFeeCell } from "./EditableFeeCell"
import { EditableMinFuelCell } from "./EditableMinFuelCell"
import { EditCategoryDefaultsDialog } from "./EditCategoryDefaultsDialog"
import { NewAircraftTableRow } from "./NewAircraftTableRow"
import { CreateClassificationDialog } from "./CreateClassificationDialog"
import { MoveAircraftDialog, AircraftToMove, ClassificationOption } from "./MoveAircraftDialog"
import {
  ConsolidatedFeeSchedule,
  FeeRule,
  upsertFeeRuleOverride,
  deleteFeeRuleOverride,
  updateMinFuelForAircraft,
  getConsolidatedFeeSchedule,
  deleteAircraftMapping,
} from "@/app/services/admin-fee-config-service"
import { getAircraftTypes } from "@/app/services/aircraft-service"
import React from "react"

interface AircraftRowData {
  aircraft_type_id: number
  aircraft_type_name: string
  aircraft_classification_id: number
  aircraft_classification_name: string
  min_fuel_gallons: number | null
  fees: Record<string, {
    fee_rule_id: number
    inherited_value: number
    override_value?: number
    caa_inherited_value?: number
    caa_override_value?: number
    is_override: boolean
    is_caa_override: boolean
  }>
}

interface FeeScheduleTableProps {
  fboId: number
  viewMode: 'standard' | 'caa'
  searchTerm: string
  primaryFeeRules: FeeRule[]
}

const columnHelper = createColumnHelper<AircraftRowData>()

export function FeeScheduleTable({
  fboId,
  viewMode,
  searchTerm,
  primaryFeeRules
}: FeeScheduleTableProps) {
  const queryClient = useQueryClient()
  const [addingToCategory, setAddingToCategory] = useState<number | null>(null)
  const [showCreateClassificationDialog, setShowCreateClassificationDialog] = useState(false)
  const [showMoveAircraftDialog, setShowMoveAircraftDialog] = useState(false)
  const [selectedAircraftToMove, setSelectedAircraftToMove] = useState<AircraftToMove | null>(null)

  // Fetch consolidated fee schedule data
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['consolidated-fee-schedule', fboId],
    queryFn: () => getConsolidatedFeeSchedule(fboId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Fetch global aircraft types
  const {
    data: aircraftTypes,
    isLoading: isLoadingAircraftTypes,
    error: aircraftTypesError
  } = useQuery({
    queryKey: ['aircraft-types'],
    queryFn: () => getAircraftTypes(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Transform and group data for table consumption
  const groupedData = useMemo(() => {
    if (!data || !data.categories || !aircraftTypes) {
      return {}
    }
    
    const aircraftData: AircraftRowData[] = []

    // Use aircraft types instead of mappings
    aircraftTypes.forEach((aircraftType) => {
      // Find the classification for this aircraft type
      const classification = data.categories.find(
        cat => cat.id === aircraftType.classification_id
      )
      
      if (!classification) {
        // Skip aircraft types without valid classifications
        return
      }

      const minFuelConfig = data.fbo_aircraft_config?.find(
        config => config.aircraft_type_id === aircraftType.id
      )

      // Get fee category rules for this aircraft's classification
      const categoryRules = data.rules.filter(
        rule => rule.applies_to_aircraft_classification_id === aircraftType.classification_id
      )

      const aircraftRow: AircraftRowData = {
        aircraft_type_id: aircraftType.id,
        aircraft_type_name: aircraftType.name,
        aircraft_classification_id: aircraftType.classification_id,
        aircraft_classification_name: classification.name,
        min_fuel_gallons: minFuelConfig?.base_min_fuel_gallons_for_waiver 
          ? parseFloat(minFuelConfig.base_min_fuel_gallons_for_waiver.toString()) 
          : aircraftType.base_min_fuel_gallons_for_waiver || null,
        fees: {}
      }

      // Build fees object for this aircraft
      categoryRules.forEach(rule => {
        const override = data.overrides?.find(
          o => o.aircraft_type_id === aircraftType.id && o.fee_rule_id === rule.id
        )

        const feeData = {
          fee_rule_id: rule.id,
          inherited_value: typeof rule.amount === 'string' ? parseFloat(rule.amount) : rule.amount,
          override_value: override?.override_amount ? (typeof override.override_amount === 'string' ? parseFloat(override.override_amount) : override.override_amount) : undefined,
          caa_inherited_value: rule.caa_override_amount ? (typeof rule.caa_override_amount === 'string' ? parseFloat(rule.caa_override_amount) : rule.caa_override_amount) : undefined,
          caa_override_value: override?.override_caa_amount ? (typeof override.override_caa_amount === 'string' ? parseFloat(override.override_caa_amount) : override.override_caa_amount) : undefined,
          is_override: !!override?.override_amount,
          is_caa_override: !!override?.override_caa_amount
        }
        
        aircraftRow.fees[rule.fee_code] = feeData
      })

      aircraftData.push(aircraftRow)
    })

    // Group by fee category name
    return aircraftData.reduce((acc, aircraft) => {
      const categoryName = aircraft.aircraft_classification_name
      if (!acc[categoryName]) {
        acc[categoryName] = []
      }
      acc[categoryName].push(aircraft)
      return acc
    }, {} as { [key: string]: AircraftRowData[] })
  }, [data, aircraftTypes])

  // Mutations for optimistic updates
  const upsertOverrideMutation = useMutation({
    mutationFn: ({ aircraftTypeId, feeRuleId, amount }: { aircraftTypeId: number; feeRuleId: number; amount: number }) => {
      const payload =
        viewMode === 'caa'
          ? { aircraft_type_id: aircraftTypeId, fee_rule_id: feeRuleId, override_caa_amount: amount }
          : { aircraft_type_id: aircraftTypeId, fee_rule_id: feeRuleId, override_amount: amount };
      return upsertFeeRuleOverride(fboId, payload);
    },
    onMutate: async (variables) => {
      // Optimistic update logic would go here
      await queryClient.cancelQueries({ queryKey: ['consolidated-fee-schedule', fboId] })
      // Return context for rollback
      return { variables }
    },
    onError: (_error, _variables, _context) => {
      // Rollback optimistic update
      queryClient.invalidateQueries({ queryKey: ['consolidated-fee-schedule', fboId] })
      toast.error("Failed to update fee override")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consolidated-fee-schedule', fboId] })
      toast.success("Fee override updated successfully")
    }
  })

  const deleteOverrideMutation = useMutation({
    mutationFn: (params: { aircraft_type_id: number; fee_rule_id: number }) =>
      deleteFeeRuleOverride(fboId, params),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['consolidated-fee-schedule', fboId] })
      return { variables }
    },
    onError: (error, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['consolidated-fee-schedule', fboId] })
      toast.error("Failed to remove fee override")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consolidated-fee-schedule', fboId] })
      toast.success("Fee override removed successfully")
    }
  })

  const updateMinFuelMutation = useMutation({
    mutationFn: ({ aircraftTypeId, minFuel }: { aircraftTypeId: number; minFuel: number }) =>
      updateMinFuelForAircraft(fboId, aircraftTypeId, { base_min_fuel_gallons_for_waiver: minFuel }),
    onMutate: async () => {
      // Optimistically update the UI
      await queryClient.cancelQueries({ queryKey: ["consolidated-fee-schedule", fboId] });
      const previousData = queryClient.getQueryData<ConsolidatedFeeSchedule>(["consolidated-fee-schedule", fboId]);

      // Logic to update the specific aircraft's min fuel in the cache
      // This is complex, so for now, we'll rely on the onSuccess invalidation.
      // A full optimistic update would require finding and updating the specific fbo_aircraft_configs entry.

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(["consolidated-fee-schedule", fboId], context.previousData);
      }
      toast.error("Failed to update Minimum Fuel. Your change has been reverted.");
    },
    onSuccess: () => {
      // Invalidate the query to refetch fresh data from the server
      queryClient.invalidateQueries({ queryKey: ["consolidated-fee-schedule", fboId] });
      toast.success("Minimum Fuel updated successfully.");
    },
  });

  const deleteAircraftMappingMutation = useMutation({
    mutationFn: (mappingId: number) => deleteAircraftMapping(fboId, mappingId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['consolidated-fee-schedule', fboId] })
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['consolidated-fee-schedule', fboId] })
      toast.error("Failed to remove aircraft from fee schedule")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consolidated-fee-schedule', fboId] })
      toast.success("Aircraft removed from fee schedule successfully")
    }
  });

  // Get unique fee codes for columns (from passed primary fee rules)
  const feeColumns = useMemo(() => {
    const feeCodesSet = new Set<string>()
    primaryFeeRules.forEach(rule => feeCodesSet.add(rule.fee_code))
    return Array.from(feeCodesSet).sort()
  }, [primaryFeeRules])

  // Define columns
  const columns = useMemo(() => {
    if (!data) return []
    
    const baseColumns = [
      columnHelper.accessor('aircraft_type_name', {
        header: 'Aircraft Type',
        cell: ({ getValue }) => (
          <span className="font-medium">{getValue()}</span>
        ),
      }),
      columnHelper.accessor('min_fuel_gallons', {
        header: 'Min Fuel',
        cell: ({ row }) => (
          <EditableMinFuelCell
            value={row.original.min_fuel_gallons}
            onSave={(newValue) => {
              updateMinFuelMutation.mutate({
                aircraftTypeId: row.original.aircraft_type_id,
                minFuel: newValue,
              });
            }}
          />
        ),
      }),
    ]

    const feeColumnDefinitions = feeColumns.map(feeCode => {
      // Find the corresponding fee rule to get the fee name
      const feeRule = primaryFeeRules.find(rule => rule.fee_code === feeCode)
      const headerName = feeRule ? feeRule.fee_name : feeCode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      
      return columnHelper.display({
        id: feeCode,
        header: headerName,
        cell: ({ row }) => {
          const feeData = row.original.fees[feeCode]
          if (!feeData) return <span className="text-muted-foreground">N/A</span>

          const isCAA = viewMode === 'caa'
          const currentValue = isCAA 
            ? (feeData.caa_override_value ?? feeData.caa_inherited_value ?? feeData.override_value ?? feeData.inherited_value)
            : (feeData.override_value ?? feeData.inherited_value)
          
          const isOverride = isCAA ? feeData.is_caa_override : feeData.is_override

          return (
            <EditableFeeCell
              value={currentValue}
              isOverride={isOverride}
              onSave={(newValue) => {
                upsertOverrideMutation.mutate({
                  aircraftTypeId: row.original.aircraft_type_id,
                  feeRuleId: feeData.fee_rule_id,
                  amount: newValue,
                })
              }}
              onRevert={() => {
                deleteOverrideMutation.mutate({
                  aircraft_type_id: row.original.aircraft_type_id,
                  fee_rule_id: feeData.fee_rule_id
                })
              }}
            />
          )
        },
      })
    })
    
    const actionColumn = columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const handleDeleteAircraft = () => {
          // Find the mapping ID for this aircraft
          const mapping = data?.mappings.find(
            m => m.aircraft_type_id === row.original.aircraft_type_id
          )
          
          if (!mapping) {
            toast.error("Could not find mapping for this aircraft")
            return
          }

          // Confirm deletion
          if (window.confirm(
            `Are you sure you want to remove "${row.original.aircraft_type_name}" from the fee schedule?`
          )) {
            deleteAircraftMappingMutation.mutate(mapping.id)
          }
        }

        const handleMoveAircraft = () => {
          const aircraftToMove: AircraftToMove = {
            aircraft_type_id: row.original.aircraft_type_id,
            aircraft_type_name: row.original.aircraft_type_name,
            current_classification_id: row.original.aircraft_classification_id,
            current_classification_name: row.original.aircraft_classification_name,
          }
          
          setSelectedAircraftToMove(aircraftToMove)
          setShowMoveAircraftDialog(true)
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleMoveAircraft}>
                <Move className="mr-2 h-4 w-4" />
                Move to Classification
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDeleteAircraft}
                disabled={deleteAircraftMappingMutation.isPending}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove from Schedule
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    })

    return [...baseColumns, ...feeColumnDefinitions, actionColumn]
  }, [data, feeColumns, viewMode, upsertOverrideMutation, deleteOverrideMutation, updateMinFuelMutation, deleteAircraftMappingMutation])

  const table = useReactTable({
    data: [],  // We'll handle rendering differently for grouped data
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  // Filter grouped data based on search term
  const filteredGroupedData = useMemo(() => {
    const filtered: { [key: string]: AircraftRowData[] } = {}
    
    Object.entries(groupedData).forEach(([categoryName, rows]) => {
      const filteredRows = rows.filter(row => 
        row.aircraft_type_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      
      if (filteredRows.length > 0 || !searchTerm) {
        filtered[categoryName] = filteredRows
      }
    })
    
    return filtered
  }, [groupedData, searchTerm])

  // Prepare available classifications for MoveAircraftDialog
  const availableClassifications: ClassificationOption[] = useMemo(() => {
    if (!data?.categories) return []
    
    return data.categories.map(category => ({
      id: category.id,
      name: category.name,
    }))
  }, [data?.categories])

  // Handler for MoveAircraftDialog success
  const handleMoveAircraftSuccess = () => {
    // The dialog already handles query invalidation, so we just need to close it
    setShowMoveAircraftDialog(false)
    setSelectedAircraftToMove(null)
  }

  // Loading state
  if (isLoading || isLoadingAircraftTypes) {
    return (
      <div className="border rounded-lg p-8">
        <div className="text-center space-y-2">
          <div className="text-muted-foreground">Loading fee schedule...</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error || aircraftTypesError) {
    return (
      <div className="border rounded-lg p-8">
        <div className="text-center space-y-4">
          <div className="text-destructive">Failed to load fee schedule</div>
          <Button onClick={() => refetch()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Handle empty state
  if (Object.keys(filteredGroupedData).length === 0) {
    return (
      <>
        <Card>
          <CardContent className="pt-6 text-center">
            <p>No fee classifications found.</p>
            <Button 
              className="mt-4"
              onClick={() => setShowCreateClassificationDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Classification
            </Button>
          </CardContent>
        </Card>
        
        <CreateClassificationDialog
          fboId={fboId}
          open={showCreateClassificationDialog}
          onOpenChange={setShowCreateClassificationDialog}
          onSuccess={(newCategoryId) => {
            // After creating a classification, invalidate queries to refresh the table
            queryClient.invalidateQueries({ queryKey: ['consolidated-fee-schedule', fboId] })
          }}
        />
      </>
    );
  }

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
          {Object.entries(filteredGroupedData).map(([categoryName, filteredRows]) => {
              const category = data!.categories.find(c => c.name === categoryName)
              // Get fee rules for this category, or fall back to global "Unclassified" rules
              let categoryRules: FeeRule[] = []
              if (category) {
                // First try to find rules specific to this classification
                categoryRules = data!.rules.filter(r => r.applies_to_aircraft_classification_id === category.id)
                
                // If no specific rules found, fall back to global "Unclassified" rules (classification ID 13)
                if (categoryRules.length === 0) {
                  const unclassifiedCategory = data!.categories.find(c => c.name === 'Unclassified')
                  if (unclassifiedCategory) {
                    categoryRules = data!.rules.filter(r => r.applies_to_aircraft_classification_id === unclassifiedCategory.id)
                  }
                }
              }

              return (
                <React.Fragment key={categoryName}>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableCell colSpan={columns.length} className="font-semibold">
                      <div className="flex justify-between items-center py-2">
                        <span>{categoryName}</span>
                        <div className="flex items-center gap-2">
                          {category && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setAddingToCategory(category.id)}
                              disabled={addingToCategory !== null}
                              className="h-8"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Aircraft
                            </Button>
                          )}
                          {category && (
                            <EditCategoryDefaultsDialog
                              fboId={fboId}
                              categoryId={category.id}
                              categoryName={category.name}
                              categoryRules={categoryRules}
                              viewMode={viewMode}
                            />
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* Render NewAircraftTableRow if adding to this category */}
                  {category && addingToCategory === category.id && (
                    <NewAircraftTableRow
                      fboId={fboId}
                      aircraftClassificationId={category.id}
                      aircraftClassificationName={category.name}
                      onSave={() => {
                        setAddingToCategory(null)
                        queryClient.invalidateQueries({ queryKey: ['consolidated-fee-schedule', fboId] })
                      }}
                      onCancel={() => setAddingToCategory(null)}
                    />
                  )}
                  {filteredRows.map((row, index) => (
                    <TableRow key={`${categoryName}-${row.aircraft_type_id || `empty-${index}`}`}>
                      {columns.map((column, columnIndex) => {
                        const columnId = column.id || `column-${columnIndex}`
                        let cellContent = null

                        // Handle different column types
                        if (column.cell && typeof column.cell === 'function') {
                          // For display columns and columns with custom cell renderers
                          const cellContext = {
                            getValue: () => {
                              // For accessor columns, use the exact accessor key
                              const accessorKey = (column as any).accessorKey
                              if (accessorKey) {
                                return (row as any)[accessorKey as keyof typeof row]
                              }
                              // For display columns, use the column id
                              return (row as any)[columnId as keyof typeof row]
                            },
                            row: { original: row },
                            column: { columnDef: column },
                            table: table,
                          }
                          cellContent = column.cell(cellContext as any)
                        } else {
                          // For accessor columns without custom cell renderer
                          const accessorKey = (column as any).accessorKey
                          const valueKey = accessorKey || columnId
                          cellContent = (row as any)[valueKey as keyof typeof row]
                        }

                        return (
                          <TableCell key={`${categoryName}-${row.aircraft_type_id || `empty-${index}`}-${columnId}`}>
                            {cellContent}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </React.Fragment>
              )
            })}
        </TableBody>
      </Table>

      {/* Move Aircraft Dialog */}
      <MoveAircraftDialog
        open={showMoveAircraftDialog}
        onOpenChange={setShowMoveAircraftDialog}
        aircraft={selectedAircraftToMove}
        availableClassifications={availableClassifications}
        fboId={fboId}
        onSuccess={handleMoveAircraftSuccess}
      />
    </div>
  )
} 