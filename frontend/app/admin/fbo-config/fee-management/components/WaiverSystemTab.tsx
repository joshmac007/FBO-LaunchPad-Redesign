"use client"

import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import {
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { GripVerticalIcon, TrashIcon, PlusIcon, EditIcon } from "lucide-react"
import { toast } from "sonner"
import { 
  getWaiverTiers, 
  getFeeRules,
  createWaiverTier, 
  updateWaiverTier, 
  deleteWaiverTier,
  reorderWaiverTiers,
  type WaiverTier,
  type FeeRule,
  type CreateWaiverTierRequest
} from "@/app/services/admin-fee-config-service"
import { waiverTierSchema, type WaiverTierFormData } from "@/app/schemas/waiver-tier.schema"

interface SortableWaiverTierProps {
  tier: WaiverTier
  feeRules: FeeRule[]
  onDelete: (tierId: number) => void
}

function SortableWaiverTier({ tier, feeRules, onDelete }: SortableWaiverTierProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tier.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getFeeNames = (codes: string[]) => {
    return codes.map(code => {
      const rule = feeRules.find(r => r.fee_code === code)
      return rule?.fee_name || code
    }).join(", ")
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center space-x-4 p-4 bg-card border rounded-lg"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVerticalIcon className="h-5 w-5 text-muted-foreground" />
      </button>
      
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <Badge variant="outline">PRIORITY {tier.tier_priority}</Badge>
          <span className="font-medium">{tier.name}</span>
          <span className="text-sm text-muted-foreground">
            (&gt;= {tier.fuel_uplift_multiplier}x min)
          </span>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          Waives: {getFeeNames(tier.fees_waived_codes)}
        </div>
      </div>
      
      <div className="flex space-x-2">
        <Button variant="outline" size="sm">
          <EditIcon className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              <TrashIcon className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Waiver Tier</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{tier.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(tier.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

export function WaiverSystemTab() {
  const queryClient = useQueryClient()
  const [tiers, setTiers] = useState<WaiverTier[]>([])

  // Fetch waiver tiers
  const { data: fetchedTiers = [], isLoading: tiersLoading } = useQuery<WaiverTier[]>({
    queryKey: ['waiver-tiers'],
    queryFn: () => getWaiverTiers(),
    onSuccess: (data) => {
      // Sort by tier_priority for display
      const sortedTiers = [...data].sort((a, b) => a.tier_priority - b.tier_priority)
      setTiers(sortedTiers)
    },
  })

  // Fetch fee rules for the dropdown
  const { data: feeRules = [] } = useQuery<FeeRule[]>({
    queryKey: ['fee-rules'],
    queryFn: () => getFeeRules(),
  })

  // Form for creating new tier
  const form = useForm<WaiverTierFormData>({
    resolver: zodResolver(waiverTierSchema),
    defaultValues: {
      name: "",
      fuel_uplift_multiplier: "",
      fees_waived_codes: [],
      is_caa_specific_tier: false,
    },
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createWaiverTier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiver-tiers'] })
      form.reset()
      toast.success("Waiver tier created successfully")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create waiver tier")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWaiverTier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiver-tiers'] })
      toast.success("Waiver tier deleted successfully")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete waiver tier")
    },
  })

  const reorderMutation = useMutation({
    mutationFn: reorderWaiverTiers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiver-tiers'] })
      toast.success("Waiver tiers reordered successfully")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reorder waiver tiers")
      // Revert the optimistic update
      setTiers(fetchedTiers)
    },
  })

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = tiers.findIndex(tier => tier.id === active.id)
      const newIndex = tiers.findIndex(tier => tier.id === over.id)

      const newTiers = arrayMove(tiers, oldIndex, newIndex)
      
      // Update local state optimistically
      setTiers(newTiers)

      // Create tier updates for the API
      const tierUpdates = newTiers.map((tier, index) => ({
        tier_id: tier.id,
        new_priority: index + 1
      }))

      reorderMutation.mutate(tierUpdates)
    }
  }

  const handleCreateTier = (data: WaiverTierFormData) => {
    const requestData: CreateWaiverTierRequest = {
      name: data.name,
      fuel_uplift_multiplier: data.fuel_uplift_multiplier,
      fees_waived_codes: data.fees_waived_codes,
      tier_priority: tiers.length + 1, // Add to end
      is_caa_specific_tier: data.is_caa_specific_tier,
    }
    createMutation.mutate(requestData)
  }

  const handleDeleteTier = (tierId: number) => {
    deleteMutation.mutate(tierId)
  }

  // Update local tiers when fetched data changes
  React.useEffect(() => {
    if (fetchedTiers.length > 0) {
      const sortedTiers = [...fetchedTiers].sort((a, b) => a.tier_priority - b.tier_priority)
      setTiers(sortedTiers)
    }
  }, [fetchedTiers])

  return (
    <div className="space-y-6 p-6">
      {/* Active Waiver Tiers */}
      <Card>
        <CardHeader>
          <CardTitle>Active Waiver Tiers</CardTitle>
          <CardDescription>
            Create tiers to automatically waive fees. Drag to reorder priority.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tiersLoading ? (
            <div className="text-center py-8">Loading waiver tiers...</div>
          ) : tiers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No waiver tiers found. Create your first tier below.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={tiers.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                  {tiers.map((tier) => (
                    <SortableWaiverTier
                      key={tier.id}
                      tier={tier}
                      feeRules={feeRules}
                      onDelete={handleDeleteTier}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Add New Tier */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Tier</CardTitle>
          <CardDescription>Create a new waiver tier with fuel uplift requirements</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateTier)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tier Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Major Uplift" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fuel_uplift_multiplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuel Uplift Multiplier</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 1.5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="fees_waived_codes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fees to Waive</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          {feeRules.map((rule) => (
                            <label key={rule.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={field.value.includes(rule.fee_code)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    field.onChange([...field.value, rule.fee_code])
                                  } else {
                                    field.onChange(field.value.filter(code => code !== rule.fee_code))
                                  }
                                }}
                              />
                              <span className="text-sm">{rule.fee_name} ({rule.fee_code})</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  {createMutation.isPending ? "Creating..." : "Add Tier"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}