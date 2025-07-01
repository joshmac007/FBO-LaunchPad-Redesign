"use client"

import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Trash2, Plus, MoreHorizontal, Move, AlertCircle, ArrowRight, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  GlobalFeeSchedule,
  GlobalAircraftClassification,
  GlobalFeeRule,
  GlobalFeeRuleOverride,
  upsertFeeRuleOverride,
  deleteFeeRuleOverride,
  updateMinFuelForAircraft,
} from "@/app/services/admin-fee-config-service"
import { deleteAircraftType } from "@/app/services/aircraft-service"
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedAircraftToDelete, setSelectedAircraftToDelete] = useState<{
    aircraft_type_id: number;
    aircraft_type_name: string;
  } | null>(null)
  const [deleteDialogView, setDeleteDialogView] = useState<'confirm' | 'error'>('confirm')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeletingAircraft, setIsDeletingAircraft] = useState(false)
  const [collapsedClassifications, setCollapsedClassifications] = useState<Record<number, boolean>>({})

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

  // Helper function to find override for specific classification and fee rule
  // Note: This function is no longer needed with the enhanced backend data structure
  // that provides complete fee details directly on each aircraft

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
      deleteFeeRuleOverride(params),
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
      updateMinFuelForAircraft(aircraftTypeId, { base_min_fuel_gallons_for_waiver: minFuel }),
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

  // Delete handler functions
  const handleConfirmDelete = async () => {
    if (!selectedAircraftToDelete) {
      setDeleteError("No aircraft selected for deletion.")
      setDeleteDialogView('error')
      return
    }
    setDeleteError(null)
    setIsDeletingAircraft(true)

    try {
      await deleteAircraftType(selectedAircraftToDelete.aircraft_type_id)
      toast.success("Aircraft deleted successfully!")
      queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
      setShowDeleteDialog(false)
      setSelectedAircraftToDelete(null)
    } catch (error: any) {
      console.error("Failed to delete aircraft:", error)
      setDeleteError(error.message || "An unknown error occurred. Please try again.")
      setDeleteDialogView('error')
    } finally {
      setIsDeletingAircraft(false)
    }
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
              <TableRow 
                className="bg-muted/50 hover:bg-muted/70 cursor-pointer"
                onClick={() => toggleClassificationCollapse(classification.id)}
              >
                <TableCell 
                  colSpan={2} 
                  className="font-semibold"
                >
                  <div className="flex items-center gap-2">
                    {collapsedClassifications[classification.id] ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                    ) : (
                      <ChevronUp className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                    )}
                    {classification.name}
                    <span className="text-sm text-muted-foreground font-normal ml-2">
                      ({classification.aircraft_types.length} aircraft)
                    </span>
                  </div>
                </TableCell>
                <TableCell colSpan={primaryFeeRules.length + 1} className="text-right">
                  <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                    <EditClassificationDefaultsDialog
                      classificationId={classification.id}
                      classificationName={classification.name}
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
                        setAddingToCategory(classification.id)
                      }}
                      disabled={addingToCategory !== null}
                      className="h-8"
                      title="Add Aircraft"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>

              {/* Add Aircraft Row - only show when not collapsed */}
              {!collapsedClassifications[classification.id] && addingToCategory === classification.id && (
                <tr className="animate-in fade-in duration-300">
                  <td colSpan={primaryFeeRules.length + 3}>
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
                  </td>
                </tr>
              )}

              {/* Aircraft Rows within this group - only show when not collapsed with staggered animation */}
              {!collapsedClassifications[classification.id] && classification.aircraft_types.map((aircraft, index) => (
                <TableRow 
                  key={aircraft.id}
                  className="animate-in fade-in slide-in-from-top-2 duration-300"
                  style={{
                    animationDelay: `${index * 75}ms`
                  }}
                >
                  <TableCell>{aircraft.name}</TableCell>
                  <TableCell>
                    <EditableMinFuelCell 
                      value={Number(aircraft.base_min_fuel_gallons_for_waiver)}
                      onSave={(newValue) => updateMinFuelMutation.mutate({ aircraftTypeId: aircraft.id, minFuel: newValue })}
                    />
                  </TableCell>
                  
                  {/* Dynamically render fee columns */}
                  {primaryFeeRules.map((rule) => {
                    // Use the enhanced fee details from the backend
                    const feeDetail = aircraft.fees?.[rule.id.toString()];
                    
                    if (!feeDetail) {
                      // This should not happen with the new backend, but provide minimal fallback
                      console.warn(`Missing fee detail for aircraft ${aircraft.name}, rule ${rule.id}`);
                      return (
                        <TableCell key={rule.id}>
                          <EditableFeeCell
                            value={Number(rule.amount)}
                            isAircraftOverride={false}
                            onSave={(newValue) => {
                              upsertOverrideMutation.mutate({
                                aircraftTypeId: aircraft.id,
                                feeRuleId: rule.id,
                                amount: newValue
                              });
                            }}
                          />
                        </TableCell>
                      );
                    }

                    // Use the enhanced backend data structure
                    const displayValue = viewMode === 'caa' 
                      ? feeDetail.final_caa_display_value 
                      : feeDetail.final_display_value;
                    const isOverride = viewMode === 'caa'
                      ? feeDetail.is_caa_aircraft_override
                      : feeDetail.is_aircraft_override;

                    return (
                      <TableCell key={rule.id}>
                        <EditableFeeCell
                          value={displayValue}
                          isAircraftOverride={isOverride}
                          onSave={(newValue) => {
                            upsertOverrideMutation.mutate({
                              aircraftTypeId: aircraft.id,
                              feeRuleId: rule.id,
                              amount: newValue
                            });
                          }}
                          onRevert={isOverride ? () => {
                            deleteOverrideMutation.mutate({
                              aircraft_type_id: aircraft.id,
                              fee_rule_id: rule.id
                            });
                          } : undefined}
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
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedAircraftToDelete({
                              aircraft_type_id: aircraft.id,
                              aircraft_type_name: aircraft.name
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