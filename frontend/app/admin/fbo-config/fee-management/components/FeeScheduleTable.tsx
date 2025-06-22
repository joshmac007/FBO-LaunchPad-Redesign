"use client"

import { useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit } from "lucide-react"
import { EditableFeeCell } from "./EditableFeeCell"
import { EditableMinFuelCell } from "./EditableMinFuelCell"
import {
  ConsolidatedFeeSchedule,
  FeeRule,
  AircraftMapping,
  FeeRuleOverride,
  FBOAircraftTypeConfig,
  upsertFeeRuleOverride,
  deleteFeeRuleOverride,
} from "@/app/services/admin-fee-config-service"

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
  data: ConsolidatedFeeSchedule
  fboId: number
  viewMode: 'standard' | 'caa'
  groupBy: 'classification' | 'manufacturer' | 'none'
  searchTerm: string
}

const columnHelper = createColumnHelper<AircraftRowData>()

export function FeeScheduleTable({
  data,
  fboId,
  viewMode,
  groupBy,
  searchTerm
}: FeeScheduleTableProps) {
  const queryClient = useQueryClient()

  // Transform data for table consumption
  const tableData = useMemo(() => {
    const aircraftData: AircraftRowData[] = []

    data.mappings.forEach((mapping) => {
      const minFuelConfig = data.fbo_aircraft_configs.find(
        config => config.aircraft_type_id === mapping.aircraft_type_id
      )

      const fees: Record<string, any> = {}
      
      // Get all fee rules for this aircraft's category
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

    return aircraftData
  }, [data])

  // Mutations for optimistic updates
  const upsertOverrideMutation = useMutation({
    mutationFn: (params: { aircraft_type_id: number; fee_rule_id: number; override_amount?: number; override_caa_amount?: number }) =>
      upsertFeeRuleOverride(fboId, params),
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

  // Get unique fee codes for columns
  const feeColumns = useMemo(() => {
    const feeCodesSet = new Set<string>()
    data.rules.forEach(rule => feeCodesSet.add(rule.fee_code))
    return Array.from(feeCodesSet).sort()
  }, [data.rules])

  // Define columns
  const columns = useMemo(() => [
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
      cell: ({ getValue, row }) => (
        <EditableMinFuelCell
          value={getValue()}
          onSave={(newValue) => {
            // Handle min fuel update - would need separate mutation
            console.log('Update min fuel:', row.original.aircraft_type_id, newValue)
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
                const params = {
                  aircraft_type_id: row.original.aircraft_type_id,
                  fee_rule_id: feeData.fee_rule_id,
                  ...(isCAA 
                    ? { override_caa_amount: newValue }
                    : { override_amount: newValue }
                  )
                }
                upsertOverrideMutation.mutate(params)
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
  ], [feeColumns, viewMode, upsertOverrideMutation, deleteOverrideMutation])

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="font-semibold">
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
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No aircraft configured.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
} 