"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { FeeColumnsTab } from "./FeeColumnsTab"
import { WaiverTiersTab } from "./WaiverTiersTab"

interface ScheduleRulesDialogProps {
  // No props needed for global architecture
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ScheduleRulesDialog({ open, onOpenChange }: ScheduleRulesDialogProps) {
  const [activeTab, setActiveTab] = useState("fee-columns")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Schedule Rules Configuration</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fee-columns">Fee Columns</TabsTrigger>
            <TabsTrigger value="waiver-tiers">Waiver Tiers</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto">
            <TabsContent value="fee-columns" className="mt-0">
              <FeeColumnsTab />
            </TabsContent>
            
            <TabsContent value="waiver-tiers" className="mt-0">
              <WaiverTiersTab />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}