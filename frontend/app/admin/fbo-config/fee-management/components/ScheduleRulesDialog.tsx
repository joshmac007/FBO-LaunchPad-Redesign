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
  const [activeTab, setActiveTab] = useState("fee-schedule-settings")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Fee Schedule & Rules</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="fee-schedule-settings">Fee Schedule Settings</TabsTrigger>
            <TabsTrigger value="fee-library">Fee Library</TabsTrigger>
            <TabsTrigger value="waiver-system">Waiver System</TabsTrigger>
            <TabsTrigger value="classifications">Classifications</TabsTrigger>
            <TabsTrigger value="import-export">Import / Export</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-y-auto">
            <TabsContent value="fee-schedule-settings" className="mt-0">
              <FeeScheduleSettingsTab />
            </TabsContent>
            
            <TabsContent value="fee-library" className="mt-0">
              <FeeLibraryTab />
            </TabsContent>
            
            <TabsContent value="waiver-system" className="mt-0">
              <WaiverSystemTab />
            </TabsContent>
            
            <TabsContent value="classifications" className="mt-0">
              <ClassificationsTab />
            </TabsContent>
            
            <TabsContent value="import-export" className="mt-0">
              <ImportExportTab />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}