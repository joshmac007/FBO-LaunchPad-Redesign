"use client"

import React, { useState, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus } from "lucide-react"
import {
  getGlobalFeeSchedule,
  GlobalFeeRule,
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
        <h3 className="text-lg font-semibold">Manage Global Fee Definitions</h3>
        <p className="text-sm text-muted-foreground">
          All global fee definitions appear as columns in the fee schedule. 
          Classification and aircraft-specific fees are managed directly in the fee schedule table.
        </p>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fee Name</TableHead>
              <TableHead>Fee Code</TableHead>
              <TableHead>Default Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feeRules.length > 0 ? (
              feeRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.fee_name}</TableCell>
                  <TableCell className="font-mono text-sm">{rule.fee_code}</TableCell>
                  <TableCell>${rule.amount.toFixed(2)}</TableCell>
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
          Need to create a new fee type? Use the button below to add new global fee definitions.
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
      />
    </div>
  )
}