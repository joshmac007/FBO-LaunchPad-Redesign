"use client"

import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
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
import { EditClassificationDefaultsDialog } from "./EditClassificationDefaultsDialog"
import { NewAircraftTableRow } from "./NewAircraftTableRow"
import { CreateClassificationDialog } from "./CreateClassificationDialog"
import { MoveAircraftDialog } from "./MoveAircraftDialog"
import {
  GlobalFeeSchedule,
  GlobalAircraftClassification,
  GlobalFeeRule,
  GlobalFeeRuleOverride,
  upsertFeeRuleOverride,
  deleteFeeRuleOverride,
  updateMinFuelForAircraft,
} from "@/app/services/admin-fee-config-service"
import React from "react"

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
  const [addingToCategory, setAddingToCategory] = useState<number | null>(null)
  const [showCreateClassificationDialog, setShowCreateClassificationDialog] = useState(false)
  const [showMoveAircraftDialog, setShowMoveAircraftDialog] = useState(false)
  const [selectedAircraftToMove, setSelectedAircraftToMove] = useState<{
    aircraft_type_id: number;
    aircraft_type_name: string;
    classification_id: number;
  } | null>(null)

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

  // Helper function to find override for specific aircraft and fee rule
  const findOverride = (aircraftTypeId: number, feeRuleId: number) => {
    return data?.overrides?.find(o => 
      o.aircraft_type_id === aircraftTypeId && o.fee_rule_id === feeRuleId
    )
  }

  // Mutations for optimistic updates
  const upsertOverrideMutation = useMutation({
    mutationFn: ({ aircraftTypeId, feeRuleId, amount }: { aircraftTypeId: number; feeRuleId: number; amount: number }) => {
      const payload =
        viewMode === 'caa'
          ? { aircraft_type_id: aircraftTypeId, fee_rule_id: feeRuleId, override_caa_amount: amount }
          : { aircraft_type_id: aircraftTypeId, fee_rule_id: feeRuleId, override_amount: amount };
      // TODO: Remove fboId when backend is fully global - using 1 for single-FBO system
      return upsertFeeRuleOverride(1, payload);
    },
    onMutate: async (variables) => {
      // Optimistic update logic would go here
      await queryClient.cancelQueries({ queryKey: ['global-fee-schedule'] })
      // Return context for rollback
      return { variables }
    },
    onError: (_error, _variables, _context) => {
      // Rollback optimistic update
      queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
      toast.error("Failed to update fee override")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
      toast.success("Fee override updated successfully")
    }
  })

  const deleteOverrideMutation = useMutation({
    mutationFn: (params: { aircraft_type_id: number; fee_rule_id: number }) =>
      // TODO: Remove fboId when backend is fully global - using 1 for single-FBO system
      deleteFeeRuleOverride(1, params),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['global-fee-schedule'] })
      return { variables }
    },
    onError: (error, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
      toast.error("Failed to remove fee override")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
      toast.success("Fee override removed successfully")
    }
  })

  const updateMinFuelMutation = useMutation({
    mutationFn: ({ aircraftTypeId, minFuel }: { aircraftTypeId: number; minFuel: number }) =>
      // TODO: Remove fboId when backend is fully global - using 1 for single-FBO system
      updateMinFuelForAircraft(1, aircraftTypeId, { base_min_fuel_gallons_for_waiver: minFuel }),
    onMutate: async () => {
      // Optimistically update the UI
      await queryClient.cancelQueries({ queryKey: ["global-fee-schedule"] });
      const previousData = queryClient.getQueryData<GlobalFeeSchedule>(["global-fee-schedule"]);

      // Logic to update the specific aircraft's min fuel in the cache
      // This is complex, so for now, we'll rely on the onSuccess invalidation.

      return { previousData };
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

  // Handler for MoveAircraftDialog success
  const handleMoveAircraftSuccess = () => {
    // The dialog already handles query invalidation, so we just need to close it
    setShowMoveAircraftDialog(false)
    setSelectedAircraftToMove(null)
  }

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
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Handle empty state
  if (filteredSchedule.length === 0) {
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Aircraft Type</TableHead>
            <TableHead>Min Fuel</TableHead>
            {primaryFeeRules.map(rule => (
              <TableHead key={rule.id}>
                {rule.fee_name}
                {viewMode === 'caa' && rule.has_caa_override && ' (CAA)'}
              </TableHead>
            ))}
            <TableHead className="w-[50px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSchedule.map((classification) => (
            <React.Fragment key={classification.id}>
              {/* Group Header Row */}
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableCell colSpan={2} className="font-semibold">
                  {classification.name}
                </TableCell>
                <TableCell colSpan={primaryFeeRules.length + 1} className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <EditClassificationDefaultsDialog
                      classificationId={classification.id}
                      classificationName={classification.name}
                      classificationRules={primaryFeeRules}
                      viewMode={viewMode}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAddingToCategory(classification.id)}
                      disabled={addingToCategory !== null}
                      className="h-8"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Aircraft
                    </Button>
                  </div>
                </TableCell>
              </TableRow>

              {/* Add Aircraft Row */}
              {addingToCategory === classification.id && (
                <NewAircraftTableRow
                  key={`new-aircraft-${classification.id}`}
                  categoryId={classification.id}
                  feeColumns={primaryFeeRules.map(rule => rule.fee_code)}
                  primaryFeeRules={primaryFeeRules.filter(r => r.applies_to_classification_id === classification.id)}
                  onSuccess={() => {
                    setAddingToCategory(null)
                    queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
                  }}
                  onCancel={() => setAddingToCategory(null)}
                />
              )}

              {/* Aircraft Rows within this group */}
              {classification.aircraft_types.map((aircraft) => (
                <TableRow key={aircraft.id}>
                  <TableCell>{aircraft.name}</TableCell>
                  <TableCell>
                    <EditableMinFuelCell 
                      value={Number(aircraft.base_min_fuel_gallons_for_waiver)}
                      onSave={(newValue) => updateMinFuelMutation.mutate({ aircraftTypeId: aircraft.id, minFuel: newValue })}
                    />
                  </TableCell>
                  
                  {/* Dynamically render fee columns */}
                  {primaryFeeRules.map((rule) => {
                    const override = findOverride(aircraft.id, rule.id);
                    const isOverridden = !!override;
                    // The default is the rule's base amount. The value is the override amount if it exists.
                    const value = viewMode === 'caa' 
                      ? (override?.override_caa_amount ?? rule.caa_override_amount ?? rule.amount)
                      : (override?.override_amount ?? rule.amount);

                    return (
                      <TableCell key={rule.id}>
                        <EditableFeeCell
                          value={Number(value)}
                          isOverride={isOverridden}
                          onSave={(newValue) => {
                            upsertOverrideMutation.mutate({
                              aircraftTypeId: aircraft.id,
                              feeRuleId: rule.id,
                              amount: newValue
                            });
                          }}
                          onRevert={() => {
                            deleteOverrideMutation.mutate({
                              aircraft_type_id: aircraft.id,
                              fee_rule_id: rule.id
                            });
                          }}
                        />
                      </TableCell>
                    );
                  })}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedAircraftToMove({
                              aircraft_type_id: aircraft.id,
                              aircraft_type_name: aircraft.name,
                              classification_id: aircraft.classification_id
                            })
                            setShowMoveAircraftDialog(true)
                          }}
                        >
                          <Move className="mr-2 h-4 w-4" />
                          Move to Category
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>

      {/* Move Aircraft Dialog */}
      <MoveAircraftDialog
        open={showMoveAircraftDialog}
        onOpenChange={setShowMoveAircraftDialog}
        aircraft={selectedAircraftToMove}
        classifications={data?.schedule ?? []}
        onSuccess={handleMoveAircraftSuccess}
      />
    </div>
  )
} 