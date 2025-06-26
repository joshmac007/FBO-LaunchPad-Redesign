"use client"

import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, Settings, Search } from "lucide-react"
import { FeeScheduleTable } from "./components/FeeScheduleTable"
import { GeneralFeesTable } from "./components/GeneralFeesTable"
import { WaiverRuleBuilder } from "./components/WaiverRuleBuilder"
import { UploadFeesDialog } from "./components/UploadFeesDialog"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
    mutations: {
      retry: 1,
    },
  },
})

export default function FeeManagementPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<'standard' | 'caa'>('standard')
  const [showWaiverBuilder, setShowWaiverBuilder] = useState(false)
  const fboId = 1 // TODO: Get this from context/params

  const handleToggleCAA = () => {
    setViewMode(prev => prev === 'standard' ? 'caa' : 'standard')
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="container mx-auto py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">FBO Configuration</h1>
            <p className="text-muted-foreground">Manage fees, waivers, and aircraft configurations for Austin (AUS)</p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-4 flex-wrap">
          <UploadFeesDialog fboId={fboId} />

          <Button
            variant={viewMode === 'caa' ? 'default' : 'outline'}
            onClick={handleToggleCAA}
            className="flex items-center gap-2"
          >
            Toggle CAA View
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowWaiverBuilder(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Manage Schedule Rules
          </Button>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Aircraft Fee Schedule Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Aircraft Fee Schedule</h2>
          <FeeScheduleTable
            fboId={fboId}
            searchTerm={searchTerm}
            viewMode={viewMode}
          />
        </div>

        {/* General Service Fees Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">General Service Fees</h2>
          <GeneralFeesTable fboId={fboId} />
        </div>

        {/* Waiver Rule Builder Modal */}
        <WaiverRuleBuilder
          fboId={fboId}
          open={showWaiverBuilder}
          onOpenChange={setShowWaiverBuilder}
        />
      </div>

      <Toaster position="top-right" />
    </QueryClientProvider>
  )
}
