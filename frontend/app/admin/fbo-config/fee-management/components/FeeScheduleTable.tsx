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
import { Trash2, Plus } from "lucide-react"
import { EditableFeeCell } from "./EditableFeeCell"
import { EditableMinFuelCell } from "./EditableMinFuelCell"
import { EditCategoryDefaultsDialog } from "./EditCategoryDefaultsDialog"
import { NewAircraftTableRow } from "./NewAircraftTableRow"
import { CreateClassificationDialog } from "./CreateClassificationDialog"
import {
  ConsolidatedFeeSchedule,
  upsertFeeRuleOverride,
  deleteFeeRuleOverride,
  updateMinFuelForAircraft,
  getConsolidatedFeeSchedule,
} from "@/app/services/admin-fee-config-service"
import React from "react"

interface AircraftRowData {
  aircraft_type_id: number
  aircraft_type_name: string
  fee_category_id: number
  fee_category_name: string
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
}

const columnHelper = createColumnHelper<AircraftRowData>()

export function FeeScheduleTable({
  fboId,
  viewMode,
  searchTerm
}: FeeScheduleTableProps) {
  const queryClient = useQueryClient()
  const [addingToCategory, setAddingToCategory] = useState<number | null>(null)
  const [showCreateClassificationDialog, setShowCreateClassificationDialog] = useState(false)

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

  // Transform and group data for table consumption
  const groupedData = useMemo(() => {
    if (!data) return []
    
    const aircraftData: AircraftRowData[] = []

    data.mappings.forEach((mapping) => {
      const minFuelConfig = data.fbo_aircraft_configs.find(
        config => config.aircraft_type_id === mapping.aircraft_type_id
      )

      const fees: Record<string, {
        fee_rule_id: number
        inherited_value: number
        override_value?: number
        caa_inherited_value?: number
        caa_override_value?: number
        is_override: boolean
        is_caa_override: boolean
      }> = {}
      
      const categoryRules = data.rules.filter(
        rule => rule.applies_to_fee_category_id === mapping.fee_category_id
      )

      categoryRules.forEach((rule) => {
        const override = data.overrides.find(
          o => o.aircraft_type_id === mapping.aircraft_type_id && o.fee_rule_id === rule.id
        )

        fees[rule.fee_code] = {
          fee_rule_id: rule.id,
          inherited_value: rule.amount,
          override_value: override?.override_amount,
          caa_inherited_value: rule.caa_override_amount,
          caa_override_value: override?.override_caa_amount,
          is_override: override?.override_amount !== undefined,
          is_caa_override: override?.override_caa_amount !== undefined,
        }
      })

      aircraftData.push({
        aircraft_type_id: mapping.aircraft_type_id,
        aircraft_type_name: mapping.aircraft_type_name,
        fee_category_id: mapping.fee_category_id,
        fee_category_name: mapping.fee_category_name,
        min_fuel_gallons: minFuelConfig?.base_min_fuel_gallons_for_waiver || null,
        fees
      })
    })
    
    // Group the data by classification (fee category)
    // Start with all categories, even if they have no aircraft
    const groups: { [key: string]: AircraftRowData[] } = {}
    
    // Initialize groups for all categories
    data.categories.forEach(category => {
      groups[category.name] = []
    })
    
    // Add aircraft data to their respective groups
    aircraftData.forEach(row => {
      const key = row.fee_category_name
      if (groups[key]) {
        groups[key].push(row)
      }
    })
    
    return groups
  }, [data])

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
    onError: (error, variables, context) => {
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
    onMutate: async ({ aircraftTypeId, minFuel }) => {
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

  // Get unique fee codes for columns
  const feeColumns = useMemo(() => {
    if (!data || !data.rules) return []
    const feeCodesSet = new Set<string>()
    data.rules.forEach(rule => feeCodesSet.add(rule.fee_code))
    return Array.from(feeCodesSet).sort()
  }, [data])

  // Define columns
  const columns = useMemo(() => {
    if (!data) return []
    
    return [
    columnHelper.accessor('aircraft_type_name', {
      header: 'Aircraft Type',
      cell: ({ getValue, row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{getValue()}</span>
          <Badge variant="outline" className="text-xs w-fit">
            {row.original.fee_category_name}
          </Badge>
        </div>
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
    ...feeColumns.map(feeCode => 
      columnHelper.display({
        id: feeCode,
        header: feeCode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
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
    ),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => {
            // Handle delete aircraft
            console.log('Delete aircraft:', row.original.aircraft_type_id)
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    }),
  ]}, [data, feeColumns, viewMode, upsertOverrideMutation, deleteOverrideMutation, updateMinFuelMutation])

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

  // Loading state
  if (isLoading) {
    return (
      <div className="border rounded-lg p-8">
        <div className="text-center space-y-2">
          <div className="text-muted-foreground">Loading fee schedule...</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
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
              const categoryRules = category ? data!.rules.filter(r => r.applies_to_fee_category_id === category.id) : []

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
                      feeCategoryId={category.id}
                      feeCategoryName={category.name}
                      onSave={() => {
                        setAddingToCategory(null)
                        queryClient.invalidateQueries({ queryKey: ['consolidated-fee-schedule', fboId] })
                      }}
                      onCancel={() => setAddingToCategory(null)}
                    />
                  )}
                  {filteredRows.map((row, index) => (
                    <TableRow key={`${categoryName}-${index}`}>
                      {columns.map((column) => (
                        <TableCell key={`${categoryName}-${index}-${column.id}`}>
                          {column.id && typeof column.cell === 'function' 
                            ? column.cell({ row: { original: row }, getValue: () => (row as any)[column.id as keyof typeof row] } as any)
                            : (row as any)[column.id as keyof typeof row]
                          }
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </React.Fragment>
              )
            })}
        </TableBody>
      </Table>
    </div>
  )
} 