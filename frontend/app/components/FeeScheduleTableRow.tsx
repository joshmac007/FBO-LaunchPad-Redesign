"use client"

import React, { memo } from "react"
import { TableCell, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Trash2, Edit } from "lucide-react"
import { EditableFeeCell } from "@/app/admin/fbo-config/fee-management/components/EditableFeeCell"
import { EditableMinFuelCell } from "@/app/admin/fbo-config/fee-management/components/EditableMinFuelCell"

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

interface FeeScheduleTableRowProps {
  row: AircraftRowData
  feeColumns: Array<{ id: string; header: string }>
  fboId: number
  viewMode: 'standard' | 'caa'
  onUpdateMinFuel: (aircraftTypeId: number, minFuel: number | null) => void
  onUpdateFee: (aircraftTypeId: number, feeRuleId: number, amount: number, isCaa?: boolean) => void
  onDeleteOverride: (aircraftTypeId: number, feeRuleId: number, isCaa?: boolean) => void
}

/**
 * Memoized fee schedule table row component for better performance
 * Prevents re-renders when row data hasn't changed
 */
const FeeScheduleTableRow = memo(({
  row,
  feeColumns,
  fboId,
  viewMode,
  onUpdateMinFuel,
  onUpdateFee,
  onDeleteOverride,
}: FeeScheduleTableRowProps) => {
  return (
    <TableRow>
      <TableCell className="font-medium">
        {row.aircraft_type_name}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {row.fee_category_name}
      </TableCell>
      <TableCell>
        <EditableMinFuelCell
          aircraftTypeId={row.aircraft_type_id}
          initialValue={row.min_fuel_gallons}
          onSave={onUpdateMinFuel}
        />
      </TableCell>
      {feeColumns.map((column) => {
        const feeData = row.fees[column.id]
        if (!feeData) {
          return <TableCell key={column.id}>-</TableCell>
        }

        return (
          <TableCell key={column.id}>
            <EditableFeeCell
              aircraftTypeId={row.aircraft_type_id}
              feeRuleId={feeData.fee_rule_id}
              inheritedValue={viewMode === 'caa' ? feeData.caa_inherited_value || feeData.inherited_value : feeData.inherited_value}
              overrideValue={viewMode === 'caa' ? feeData.caa_override_value : feeData.override_value}
              isOverride={viewMode === 'caa' ? feeData.is_caa_override : feeData.is_override}
              viewMode={viewMode}
              onSave={(amount) => onUpdateFee(row.aircraft_type_id, feeData.fee_rule_id, amount, viewMode === 'caa')}
              onDelete={() => onDeleteOverride(row.aircraft_type_id, feeData.fee_rule_id, viewMode === 'caa')}
            />
          </TableCell>
        )
      })}
    </TableRow>
  )
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  // Only re-render if the row data or critical props have changed
  const prevRow = prevProps.row
  const nextRow = nextProps.row
  
  // Check if row core data changed
  if (
    prevRow.aircraft_type_id !== nextRow.aircraft_type_id ||
    prevRow.aircraft_type_name !== nextRow.aircraft_type_name ||
    prevRow.fee_category_id !== nextRow.fee_category_id ||
    prevRow.fee_category_name !== nextRow.fee_category_name ||
    prevRow.min_fuel_gallons !== nextRow.min_fuel_gallons ||
    prevProps.viewMode !== nextProps.viewMode ||
    prevProps.fboId !== nextProps.fboId
  ) {
    return false // Re-render
  }
  
  // Deep compare fee data
  const prevFees = prevRow.fees
  const nextFees = nextRow.fees
  
  // Check if fees object structure changed
  const prevFeeKeys = Object.keys(prevFees)
  const nextFeeKeys = Object.keys(nextFees)
  
  if (prevFeeKeys.length !== nextFeeKeys.length) {
    return false // Re-render
  }
  
  // Check each fee entry
  for (const key of prevFeeKeys) {
    const prevFee = prevFees[key]
    const nextFee = nextFees[key]
    
    if (
      !nextFee ||
      prevFee.fee_rule_id !== nextFee.fee_rule_id ||
      prevFee.inherited_value !== nextFee.inherited_value ||
      prevFee.override_value !== nextFee.override_value ||
      prevFee.caa_inherited_value !== nextFee.caa_inherited_value ||
      prevFee.caa_override_value !== nextFee.caa_override_value ||
      prevFee.is_override !== nextFee.is_override ||
      prevFee.is_caa_override !== nextFee.is_caa_override
    ) {
      return false // Re-render
    }
  }
  
  // Check callback functions (should be stable with useCallback)
  if (
    prevProps.onUpdateMinFuel !== nextProps.onUpdateMinFuel ||
    prevProps.onUpdateFee !== nextProps.onUpdateFee ||
    prevProps.onDeleteOverride !== nextProps.onDeleteOverride
  ) {
    return false // Re-render
  }
  
  return true // Don't re-render
})

FeeScheduleTableRow.displayName = "FeeScheduleTableRow"

export { FeeScheduleTableRow }