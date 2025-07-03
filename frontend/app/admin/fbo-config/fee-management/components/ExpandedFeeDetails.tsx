import React from 'react';
import { type Row } from '@tanstack/react-table';
import { TableRowData } from './FeeScheduleTable';
import { GlobalFeeRule } from '@/app/services/admin-fee-config-service';

interface ExpandedFeeDetailsProps {
  row: Row<TableRowData>;
  feeColumns: GlobalFeeRule[];
  viewMode: 'standard' | 'caa';
}

export const ExpandedFeeDetails: React.FC<ExpandedFeeDetailsProps> = ({ 
  row, 
  feeColumns, 
  viewMode 
}) => {
  // Ensure we're dealing with an aircraft row
  if (row.original.type !== 'aircraft') {
    return null;
  }

  const aircraftData = row.original;

  return (
    <div className="p-4 bg-muted/50">
      <h4 className="font-semibold mb-2">Additional Fees for {aircraftData.aircraft_type_name}</h4>
      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2">
        {feeColumns.map(rule => {
          const feeInfo = aircraftData.fees[rule.id.toString()];
          if (!feeInfo) return null;
          
          const displayValue = viewMode === 'caa' 
            ? feeInfo.final_caa_display_value 
            : feeInfo.final_display_value;
          
          return (
            <li key={rule.id} className="flex flex-col">
              <span className="text-sm text-muted-foreground">
                {rule.fee_name}
                {viewMode === 'caa' && rule.has_caa_override && ' (CAA)'}
              </span>
              <span className="font-medium">${displayValue.toFixed(2)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};