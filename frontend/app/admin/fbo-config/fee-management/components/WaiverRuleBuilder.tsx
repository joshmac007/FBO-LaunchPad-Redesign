"use client"

import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { GripVertical, Plus, Trash2 } from "lucide-react"
import {
  getWaiverTiers,
  createWaiverTier,
  updateWaiverTier,
  deleteWaiverTier,
  reorderWaiverTiers,
  getFeeRules,
  WaiverTier,
  CreateWaiverTierRequest,
} from "@/app/services/admin-fee-config-service"

interface WaiverRuleBuilderProps {
  fboId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

const createWaiverSchema = z.object({
  fuel_uplift_multiplier: z.string()
    .min(1, "Fuel multiplier is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Must be a valid number greater than 0"
    }),
  fees_waived_codes: z.array(z.string()).min(1, "At least one fee must be selected"),
})

type CreateWaiverForm = z.infer<typeof createWaiverSchema>

interface SortableWaiverTierProps {
  tier: WaiverTier
  onDelete: (id: number) => void
  feeRules: any[]
}

function SortableWaiverTier({ tier, onDelete, feeRules }: SortableWaiverTierProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tier.id.toString() })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const waivedFeeNames = useMemo(() => {
    return tier.fees_waived_codes
      .map(code => {
        const rule = feeRules.find(r => r.fee_code === code)
        return rule ? rule.fee_name : code
      })
      .join(', ')
  }, [tier.fees_waived_codes, feeRules])

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`mb-2 ${isDragging ? 'shadow-lg' : ''}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className="cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          
          <div className="flex-1 text-sm">
            <span>When fuel uplift is </span>
            <span className="font-medium">{tier.fuel_uplift_multiplier}</span>
            <span>x Min Fuel, waive </span>
            <span className="font-medium">{waivedFeeNames}</span>
            <span>.</span>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(tier.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function WaiverRuleBuilder({ fboId, open, onOpenChange }: WaiverRuleBuilderProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<CreateWaiverForm>({
    resolver: zodResolver(createWaiverSchema),
    defaultValues: {
      fuel_uplift_multiplier: "",
      fees_waived_codes: [],
    }
  })

  // Fetch waiver tiers
  const { data: waiverTiers = [], isLoading } = useQuery({
    queryKey: ['waiver-tiers', fboId],
    queryFn: () => getWaiverTiers(fboId),
    enabled: open,
  })

  // Fetch fee rules for dropdown
  const { data: feeRules = [] } = useQuery({
    queryKey: ['fee-rules', fboId],
    queryFn: () => getFeeRules(fboId),
    enabled: open,
  })

  // Sort tiers by priority (highest first)
  const sortedTiers = useMemo(() => {
    return [...waiverTiers].sort((a, b) => b.tier_priority - a.tier_priority)
  }, [waiverTiers])

  // Create waiver tier mutation
  const createWaiverMutation = useMutation({
    mutationFn: (data: CreateWaiverTierRequest) => createWaiverTier(fboId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiver-tiers', fboId] })
      toast.success("Waiver tier created successfully")
      setShowAddForm(false)
      form.reset()
    },
    onError: (error) => {
      toast.error("Failed to create waiver tier")
      console.error(error)
    },
  })

  // Delete waiver tier mutation
  const deleteWaiverMutation = useMutation({
    mutationFn: (id: number) => deleteWaiverTier(fboId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiver-tiers', fboId] })
      toast.success("Waiver tier deleted successfully")
    },
    onError: (error) => {
      toast.error("Failed to delete waiver tier")
      console.error(error)
    },
  })

  // Reorder waiver tiers mutation
  const reorderMutation = useMutation({
    mutationFn: (tierUpdates: { tier_id: number; new_priority: number }[]) => 
      reorderWaiverTiers(fboId, tierUpdates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiver-tiers', fboId] })
      toast.success("Waiver tier order updated successfully")
    },
    onError: (error) => {
      toast.error("Failed to update waiver tier order")
      console.error(error)
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = sortedTiers.findIndex(tier => tier.id.toString() === active.id)
    const newIndex = sortedTiers.findIndex(tier => tier.id.toString() === over.id)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Calculate new priorities based on the reordered array
    const reorderedTiers = arrayMove(sortedTiers, oldIndex, newIndex)
    
    // Create tier updates with new priorities (highest priority first)
    const tierUpdates = reorderedTiers.map((tier, index) => ({
      tier_id: tier.id,
      new_priority: reorderedTiers.length - index, // Reverse index for priority
    }))

    // Execute the reorder mutation
    reorderMutation.mutate(tierUpdates)
  }

  const handleDeleteTier = (id: number) => {
    deleteWaiverMutation.mutate(id)
  }

  const onSubmit = (data: CreateWaiverForm) => {
    // Generate a name based on the multiplier and fees
    const feeNames = data.fees_waived_codes
      .map(code => {
        const rule = feeRules.find(r => r.fee_code === code)
        return rule ? rule.fee_name : code
      })
      .join(' + ')
    
    const name = `${data.fuel_uplift_multiplier}x Min Fuel - ${feeNames}`
    
    // Calculate tier priority (highest + 1)
    const maxPriority = Math.max(...waiverTiers.map(t => t.tier_priority), 0)
    
    const createData: CreateWaiverTierRequest = {
      name,
      fuel_uplift_multiplier: parseFloat(data.fuel_uplift_multiplier),
      fees_waived_codes: data.fees_waived_codes,
      tier_priority: maxPriority + 1,
    }
    
    createWaiverMutation.mutate(createData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Waiver Tiers</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Active Tiers Section */}
          <div className="space-y-3">
            <h3 className="font-semibold">Active Tiers (drag to re-order priority)</h3>
            
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading waiver tiers...</div>
            ) : sortedTiers.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={sortedTiers.map(tier => tier.id.toString())}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedTiers.map(tier => (
                    <SortableWaiverTier
                      key={tier.id}
                      tier={tier}
                      onDelete={handleDeleteTier}
                      feeRules={feeRules}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              <div className="text-center py-4 text-muted-foreground">No waiver tiers configured</div>
            )}
          </div>

          {/* Add New Tier Section */}
          <div className="border-t pt-4">
            {!showAddForm ? (
              <Button
                onClick={() => setShowAddForm(true)}
                variant="outline"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Waiver Tier
              </Button>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fuel_uplift_multiplier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fuel Multiplier</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="1.0"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="fees_waived_codes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fees to Waive</FormLabel>
                          <Select
                            onValueChange={(value) => {
                              if (!field.value.includes(value)) {
                                field.onChange([...field.value, value])
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select fees to waive" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {feeRules.map((rule) => (
                                <SelectItem 
                                  key={rule.id} 
                                  value={rule.fee_code}
                                  disabled={field.value.includes(rule.fee_code)}
                                >
                                  {rule.fee_name} ({rule.fee_code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {field.value.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {field.value.map((code) => {
                                const rule = feeRules.find(r => r.fee_code === code)
                                return (
                                  <span
                                    key={code}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs"
                                  >
                                    {rule?.fee_name || code}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        field.onChange(field.value.filter(c => c !== code))
                                      }}
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      ×
                                    </button>
                                  </span>
                                )
                              })}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={createWaiverMutation.isPending}
                    >
                      {createWaiverMutation.isPending ? "Adding..." : "Add Tier"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false)
                        form.reset()
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}