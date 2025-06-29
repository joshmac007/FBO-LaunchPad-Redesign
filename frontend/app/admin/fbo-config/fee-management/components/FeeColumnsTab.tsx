"use client"

import React, { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus } from "lucide-react"
import {
  getGlobalFeeSchedule,
  updateFeeRule,
  GlobalFeeRule,
  UpdateFeeRuleRequest,
} from "@/app/services/admin-fee-config-service"
import { FeeRuleDialog } from "./FeeRuleDialog"

interface FeeColumnsTabProps {
  // No props needed for global architecture
}

export function FeeColumnsTab({}: FeeColumnsTabProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const queryClient = useQueryClient()

  // Fetch all fee rules
  const { data: globalData, isLoading } = useQuery({
    queryKey: ['global-fee-schedule'],
    queryFn: () => getGlobalFeeSchedule(),
  })

  const feeRules = useMemo(() => {
    return globalData?.fee_rules || []
  }, [globalData])

  // Get classifications from global data
  const aircraftClassifications = useMemo(() => {
    return globalData?.schedule || []
  }, [globalData])

  // Update fee rule mutation with optimistic updates
  const updateFeeRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateFeeRuleRequest }) => 
      updateFeeRule(1, id, data),  // TODO: Remove fboId when backend is fully global
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['global-fee-schedule'] })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['global-fee-schedule'])

      // Optimistically update to the new value
      queryClient.setQueryData(['global-fee-schedule'], (old: any) => {
        if (!old) return old
        
        return {
          ...old,
          fee_rules: old.fee_rules.map((rule: GlobalFeeRule) => 
            rule.id === id ? { ...rule, ...data } : rule
          )
        }
      })

      // Return a context object with the snapshotted value
      return { previousData }
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['global-fee-schedule'], context?.previousData)
      toast.error("Failed to update fee column setting")
    },
    onSuccess: (updatedRule, { data }) => {
      const action = data.is_primary_fee ? "primary column" : "general fees"
      toast.success(`Fee moved to ${action}`)
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
    },
  })

  const handleTogglePrimaryFee = (rule: GlobalFeeRule, newPrimaryStatus: boolean) => {
    updateFeeRuleMutation.mutate({
      id: rule.id,
      data: { is_primary_fee: newPrimaryStatus }
    })
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">Loading fee rules...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Manage Fee Columns</h3>
        <p className="text-sm text-muted-foreground">
          Control which fees appear as columns in the main fee schedule table. 
          Primary fees are displayed as columns, while others appear in the general fees section.
        </p>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fee Name</TableHead>
              <TableHead>Fee Code</TableHead>
              <TableHead className="w-[120px]">Display as Column</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feeRules.length > 0 ? (
              feeRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.fee_name}</TableCell>
                  <TableCell className="font-mono text-sm">{rule.fee_code}</TableCell>
                  <TableCell>
                    <Checkbox
                      checked={rule.is_primary_fee}
                      onCheckedChange={(checked) => 
                        handleTogglePrimaryFee(rule, checked as boolean)
                      }
                      disabled={updateFeeRuleMutation.isPending}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No fee rules configured
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="border-t pt-4">
        <p className="text-sm text-muted-foreground mb-4">
          Need to create a new fee type? Use the button below to add new primary fees.
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Fee Type
        </Button>
      </div>

      <FeeRuleDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
          toast.success("Fee rule created successfully")
        }}
        defaultValues={{
          is_primary_fee: true, // Default to primary fee for this tab
        }}
        availableCategories={aircraftClassifications}
      />
    </div>
  )
}