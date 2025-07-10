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
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl">{aircraft.aircraft_type_name}</DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{aircraft.classification_name}</span>
            <span>•</span>
            <span>{aircraft.base_min_fuel_gallons_for_waiver} gal min fuel</span>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Fee Schedule */}
          <div className="space-y-3">
            {feeRules.map(rule => {
              const feeDetail = aircraft.fees?.[rule.id.toString()];
              
              if (!feeDetail) {
                return (
                  <div key={rule.id} className="flex items-center justify-between py-3 border-b">
                    <div>
                      <h4 className="font-semibold text-lg">{rule.fee_name}</h4>
                      <p className="text-sm text-muted-foreground">Default rate</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">${rule.amount}</p>
                    </div>
                  </div>
                );
              }

              const displayValue = feeDetail.final_display_value;
              const isOverride = feeDetail.is_aircraft_override;

              return (
                <div key={rule.id} className="py-3 border-b last:border-b-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-lg">{rule.fee_name}</h4>
                        {isOverride && (
                          <Badge variant="secondary" className="text-xs font-medium">
                            OVERRIDE
                          </Badge>
                        )}
                      </div>
                      
                      {/* Show inheritance chain for overrides */}
                      {isOverride && (
                        <div className="text-sm text-muted-foreground mb-2">
                          <span>Default: ${feeDetail.classification_default}</span>
                          <span className="mx-2">→</span>
                          <span className="font-medium">Override: ${displayValue}</span>
                        </div>
                      )}
                      
                      {/* Important properties only */}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        {rule.waiver_strategy && rule.waiver_strategy !== 'NONE' && (
                          <span className="flex items-center gap-1">
                            ✓ Auto waiver ({rule.waiver_strategy})
                          </span>
                        )}
                        {rule.is_manually_waivable && (
                          <span className="flex items-center gap-1">
                            ✓ Manual waiver
                          </span>
                        )}
                        {rule.is_taxable && (
                          <span className="flex items-center gap-1">
                            ⚡ Taxable
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right ml-6">
                      <p className="text-2xl font-bold">${displayValue}</p>
                      {isOverride && (
                        <p className="text-xs text-muted-foreground">
                          saves ${(feeDetail.classification_default - displayValue).toFixed(0)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};