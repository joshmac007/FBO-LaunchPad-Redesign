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
import { FeeScheduleSettingsTab } from "./FeeScheduleSettingsTab"
import { FeeLibraryTab } from "./FeeLibraryTab"
import { WaiverSystemTab } from "./WaiverSystemTab"
import { ClassificationsTab } from "./ClassificationsTab"
import { ImportExportTab } from "./ImportExportTab"

interface ScheduleRulesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ScheduleRulesDialog({ open, onOpenChange }: ScheduleRulesDialogProps) {
  const [activeTab, setActiveTab] = useState("display-settings")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Configure Fees & Rules</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="display-settings">Display Settings</TabsTrigger>
            <TabsTrigger value="fee-types">Fee Types</TabsTrigger>
            <TabsTrigger value="fuel-waivers">Fuel Waivers</TabsTrigger>
            <TabsTrigger value="aircraft-groups">Aircraft Classifications</TabsTrigger>
            <TabsTrigger value="bulk-tools">Import / Export</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto">
            <TabsContent value="display-settings" className="mt-0">
              <FeeScheduleSettingsTab />
            </TabsContent>
            
            <TabsContent value="fee-types" className="mt-0">
              <FeeLibraryTab />
            </TabsContent>
            
            <TabsContent value="fuel-waivers" className="mt-0">
              <WaiverSystemTab />
            </TabsContent>
            
            <TabsContent value="aircraft-groups" className="mt-0">
              <ClassificationsTab />
            </TabsContent>
            
            <TabsContent value="bulk-tools" className="mt-0">
              <ImportExportTab />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}