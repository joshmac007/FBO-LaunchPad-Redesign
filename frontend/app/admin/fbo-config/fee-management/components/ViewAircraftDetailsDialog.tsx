import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AircraftRowData } from './FeeScheduleTable';
import { GlobalFeeRule } from '@/app/services/admin-fee-config-service';

interface ViewAircraftDetailsDialogProps {
  aircraft: AircraftRowData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feeRules: GlobalFeeRule[];
}

export const ViewAircraftDetailsDialog: React.FC<ViewAircraftDetailsDialogProps> = ({
  aircraft,
  open,
  onOpenChange,
  feeRules,
}) => {
  if (!aircraft) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aircraft Details - {aircraft.aircraft_type_name}</DialogTitle>
          <DialogDescription>
            Complete fee schedule and configuration details for this aircraft type
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Aircraft Type</label>
                <p className="text-base">{aircraft.aircraft_type_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Classification</label>
                <p className="text-base">{aircraft.classification_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Minimum Fuel for Waiver</label>
                <p className="text-base">{aircraft.base_min_fuel_gallons_for_waiver} gallons</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Aircraft ID</label>
                <p className="text-base">#{aircraft.aircraft_type_id}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Fee Schedule */}
          <div>
            <h3 className="text-lg font-semibold mb-3">
              Fee Schedule
            </h3>
            <div className="space-y-3">
              {feeRules.map(rule => {
                const feeDetail = aircraft.fees?.[rule.id.toString()];
                
                if (!feeDetail) {
                  return (
                    <div key={rule.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{rule.fee_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Code: {rule.fee_code}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">${rule.amount.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">Default rate</p>
                        </div>
                      </div>
                    </div>
                  );
                }

                const displayValue = feeDetail.final_display_value;
                const isOverride = feeDetail.is_aircraft_override;
                const revertValue = feeDetail.revert_to_value;

                return (
                  <div key={rule.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{rule.fee_name}</h4>
                          {isOverride && (
                            <Badge variant="outline" className="text-xs">
                              Aircraft Override
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Code: {rule.fee_code}
                        </p>
                        
                        {/* Fee Details */}
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Classification Default:</span>
                            <span>${feeDetail.classification_default.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Global Default:</span>
                            <span>${feeDetail.global_default.toFixed(2)}</span>
                          </div>
                          {isOverride && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Would revert to:</span>
                              <span>${revertValue.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <p className="text-lg font-semibold">${displayValue.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          {isOverride ? 'Override rate' : 'Standard rate'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Additional fee properties */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Taxable:</span>
                          <span>{rule.is_taxable ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Waivable:</span>
                          <span>{rule.is_potentially_waivable_by_fuel_uplift ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Basis:</span>
                          <span>{rule.calculation_basis.replace('_', ' ')}</span>
                        </div>
                      </div>
                      
                      {rule.waiver_strategy !== 'NONE' && (
                        <div className="mt-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Waiver Strategy:</span>
                            <span>{rule.waiver_strategy.replace('_', ' ')}</span>
                          </div>
                          {rule.simple_waiver_multiplier && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Waiver Multiplier:</span>
                              <span>{rule.simple_waiver_multiplier}x</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};