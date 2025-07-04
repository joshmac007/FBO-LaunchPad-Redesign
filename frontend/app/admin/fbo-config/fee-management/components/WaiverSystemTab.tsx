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
import { Separator } from "@/components/ui/separator"
import { GripVerticalIcon, TrashIcon, PlusIcon, EditIcon, FuelIcon, InfoIcon } from "lucide-react"
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
  type CreateWaiverTierRequest,
  type UpdateWaiverTierRequest
} from "@/app/services/admin-fee-config-service"
import { waiverTierSchema, type WaiverTierFormData } from "@/app/schemas/waiver-tier.schema"

interface SortableWaiverTierProps {
  tier: WaiverTier
  feeRules: FeeRule[]
  onDelete: (tierId: number) => void
  onEdit: (tier: WaiverTier) => void
}

function SortableWaiverTier({ tier, feeRules, onDelete, onEdit }: SortableWaiverTierProps) {
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

  const getMultiplierDescription = (multiplier: number) => {
    if (multiplier === 1) {
      return "minimum fuel purchase"
    } else if (multiplier === 1.5) {
      return "1.5× minimum fuel purchase"
    } else if (multiplier === 2) {
      return "2× minimum fuel purchase"
    } else {
      return `${multiplier}× minimum fuel purchase`
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center space-x-4 p-4 bg-card border rounded-lg hover:shadow-md transition-shadow"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVerticalIcon className="h-5 w-5 text-muted-foreground" />
      </button>
      
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-2">
          <Badge variant="secondary">RULE {tier.tier_priority}</Badge>
          <h4 className="font-semibold text-lg">{tier.name}</h4>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <FuelIcon className="h-4 w-4 text-blue-600" />
            <span className="font-medium">When customer purchases:</span>
            <span className="text-blue-600 font-semibold">
              {getMultiplierDescription(tier.fuel_uplift_multiplier)}
            </span>
          </div>
          
          <div className="flex items-start gap-2 text-sm">
            <span className="font-medium text-green-600">Then waive:</span>
            <span className="text-green-600">{getFeeNames(tier.fees_waived_codes)}</span>
          </div>
          
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            <strong>Example:</strong> If a Citation has 200 gallons minimum fuel, this rule applies when they purchase{" "}
            {tier.fuel_uplift_multiplier === 1 
              ? "200+ gallons" 
              : `${Math.round(tier.fuel_uplift_multiplier * 200)}+ gallons (${tier.fuel_uplift_multiplier}× the 200 gallon minimum)`
            }
          </div>
        </div>
      </div>
      
      <div className="flex space-x-2">
        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit(tier)}>
          <EditIcon className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <TrashIcon className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Waiver Rule</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{tier.name}"? This will remove the automatic fee waiver for customers who purchase fuel at this level. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(tier.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Rule
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
  const [editingTier, setEditingTier] = useState<WaiverTier | null>(null)

  // Fetch waiver tiers
  const { data: fetchedTiers = [], isLoading: tiersLoading } = useQuery<WaiverTier[]>({
    queryKey: ['waiver-tiers'],
    queryFn: () => getWaiverTiers(),
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
      fuel_uplift_multiplier: "1.0",
      fees_waived_codes: [],
      is_caa_specific_tier: false,
    },
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createWaiverTier,
    onSuccess: (newTier) => {
      queryClient.setQueryData<WaiverTier[]>(['waiver-tiers'], (old) => {
        if (!old) return [newTier]
        return [...old, newTier]
      })

      setTiers((prev) => {
        const updated = [...prev, newTier]
        return updated.sort((a, b) => a.tier_priority - b.tier_priority)
      })

      form.reset()
      toast.success("Waiver rule created successfully")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create waiver rule")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWaiverTier,
    onMutate: async (tierId: number) => {
      // Optimistically remove from cache and local state
      await queryClient.cancelQueries({ queryKey: ['waiver-tiers'] })

      const previous = queryClient.getQueryData<WaiverTier[]>(['waiver-tiers'])

      if (previous) {
        queryClient.setQueryData<WaiverTier[]>(['waiver-tiers'], previous.filter((t) => t.id !== tierId))
      }

      setTiers((prev) => prev.filter((t) => t.id !== tierId))

      return { previous }
    },
    onError: (error: any, _tierId, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['waiver-tiers'], context.previous)
        setTiers(context.previous)
      }
      toast.error(error.message || "Failed to delete waiver rule")
    },
    onSuccess: () => {
      toast.success("Waiver rule deleted successfully")
    },
  })

  const reorderMutation = useMutation({
    mutationFn: reorderWaiverTiers,
    onError: (error: any, _updates, context) => {
      toast.error(error.message || "Failed to reorder waiver rules")
      // Rollback order
      if (context?.previous) setTiers(context.previous)
    },
    onMutate: async (updates: { tier_id: number; new_priority: number }[]) => {
      await queryClient.cancelQueries({ queryKey: ['waiver-tiers'] })

      const previous = queryClient.getQueryData<WaiverTier[]>(['waiver-tiers'])

      // Apply optimistic ordering to state
      setTiers((prev) => {
        const map: Record<number, number> = {}
        updates.forEach(u => map[u.tier_id] = u.new_priority)
        const reordered = prev.map(t => map[t.id] ? { ...t, tier_priority: map[t.id] } : t)
        return reordered.sort((a,b)=>a.tier_priority-b.tier_priority)
      })

      return { previous }
    },
    onSuccess: () => {
      toast.success("Waiver rules reordered successfully")
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ tierId, data }: { tierId: number; data: UpdateWaiverTierRequest }) => updateWaiverTier(tierId, data),
    onSuccess: (updatedTier) => {
      queryClient.setQueryData<WaiverTier[]>(['waiver-tiers'], (old) => {
        if (!old) return [updatedTier]
        return old.map((t) => (t.id === updatedTier.id ? updatedTier : t))
      })

      setTiers((prev) => {
        const replaced = prev.map((t) => (t.id === updatedTier.id ? updatedTier : t))
        return replaced.sort((a, b) => a.tier_priority - b.tier_priority)
      })

      toast.success("Waiver rule updated successfully")
      setEditingTier(null)
      form.reset({
        name: "",
        fuel_uplift_multiplier: "1.0",
        fees_waived_codes: [],
        is_caa_specific_tier: false,
      })
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update waiver rule")
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
      fuel_uplift_multiplier: parseFloat(data.fuel_uplift_multiplier),
      fees_waived_codes: data.fees_waived_codes,
      tier_priority: Number(tiers.length + 1), // Add to end
      is_caa_specific_tier: data.is_caa_specific_tier || false,
    }
    createMutation.mutate(requestData)
  }

  const handleDeleteTier = (tierId: number) => {
    deleteMutation.mutate(tierId)
  }

  const handleEditTier = (tier: WaiverTier) => {
    setEditingTier(tier)
  }

  const handleUpdateTier = (data: WaiverTierFormData) => {
    if (!editingTier) return

    const requestData: UpdateWaiverTierRequest = {
      name: data.name,
      fuel_uplift_multiplier: parseFloat(data.fuel_uplift_multiplier),
      fees_waived_codes: data.fees_waived_codes,
      tier_priority: editingTier.tier_priority,
      is_caa_specific_tier: data.is_caa_specific_tier || false,
    }

    updateMutation.mutate({ tierId: editingTier.id, data: requestData })
  }

  // Update local tiers when fetched data changes
  React.useEffect(() => {
    if (fetchedTiers && fetchedTiers.length > 0) {
      const sortedTiers = [...fetchedTiers].sort((a, b) => a.tier_priority - b.tier_priority)
      setTiers(sortedTiers)
    } else {
      setTiers([])
    }
  }, [fetchedTiers])

  // When entering edit mode, pre-fill the form with the selected tier values
  React.useEffect(() => {
    if (editingTier) {
      form.reset({
        name: editingTier.name,
        fuel_uplift_multiplier: editingTier.fuel_uplift_multiplier.toString(),
        fees_waived_codes: editingTier.fees_waived_codes,
        is_caa_specific_tier: editingTier.is_caa_specific_tier,
      })
    }
  }, [editingTier, form])

  return (
    <div className="space-y-6 p-6">
      {/* Header with explanation */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Fuel-Based Fee Waivers</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <InfoIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium text-blue-900">How it works:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Each aircraft type has a minimum fuel requirement (e.g., 200 gallons for a Citation)</li>
                <li>• You can create rules that waive fees when customers purchase minimum fuel or more</li>
                <li>• You can also waive additional fees when they purchase multiples of minimum fuel (e.g., 1.5× or 2×)</li>
                <li>• Rules are checked in order - the first matching rule applies</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Active Waiver Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FuelIcon className="h-5 w-5" />
            Active Waiver Rules
          </CardTitle>
          <CardDescription>
            Automatic fee waivers based on fuel purchase amounts. Drag to reorder priority - rules are checked from top to bottom.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tiersLoading ? (
            <div className="text-center py-8">Loading waiver rules...</div>
          ) : tiers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FuelIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium">No waiver rules configured</p>
              <p className="text-sm">Create your first rule below to start waiving fees based on fuel purchases.</p>
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
                      onEdit={handleEditTier}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Add New Rule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {editingTier ? <EditIcon className="h-5 w-5" /> : <PlusIcon className="h-5 w-5" />}
            {editingTier ? 'Edit Waiver Rule' : 'Create New Waiver Rule'}
          </CardTitle>
          <CardDescription>
            Set up a new rule to automatically waive fees when customers purchase fuel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(editingTier ? handleUpdateTier : handleCreateTier)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rule Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Standard Fuel Purchase" {...field} />
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
                      <FormLabel>Fuel Purchase Requirement</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
                            placeholder="1.0"
                            {...field}
                          />
                          <div className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                            × minimum fuel
                          </div>
                        </div>
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        1.0 = minimum fuel, 1.5 = 1.5× minimum fuel, etc.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="fees_waived_codes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fees to Waive</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Select which fees should be waived when this fuel requirement is met:
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {feeRules.map((rule) => (
                            <label key={rule.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
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
                                className="h-4 w-4"
                              />
                              <div className="flex-1">
                                <div className="font-medium">{rule.fee_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  ${rule.amount.toFixed(2)} • {rule.fee_code}
                                </div>
                              </div>
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
                  disabled={editingTier ? updateMutation.isPending : createMutation.isPending}
                  className="min-w-32"
                >
                  {editingTier 
                    ? (updateMutation.isPending ? "Updating..." : "Update Rule")
                    : (createMutation.isPending ? "Creating..." : "Create Rule")}
                </Button>
                {editingTier && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => {
                      setEditingTier(null)
                      form.reset({
                        name: "",
                        fuel_uplift_multiplier: "1.0",
                        fees_waived_codes: [],
                        is_caa_specific_tier: false,
                      })
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}