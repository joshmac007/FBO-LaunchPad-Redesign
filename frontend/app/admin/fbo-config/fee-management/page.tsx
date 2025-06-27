"use client"

import { useState, useMemo } from "react"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, Settings, Search } from "lucide-react"
import { FeeScheduleTable } from "./components/FeeScheduleTable"
import { GeneralFeesTable } from "./components/GeneralFeesTable"
import { ScheduleRulesDialog } from "./components/ScheduleRulesDialog"
import { UploadFeesDialog } from "./components/UploadFeesDialog"
import { getConsolidatedFeeSchedule } from "@/app/services/admin-fee-config-service"

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

function FeeManagementContent() {
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<'standard' | 'caa'>('standard')
  const [showScheduleRulesDialog, setShowScheduleRulesDialog] = useState(false)
  const fboId = 1 // TODO: Get this from context/params

  // Fetch consolidated fee schedule data
  const { data: consolidatedData } = useQuery({
    queryKey: ['consolidated-fee-schedule', fboId],
    queryFn: () => getConsolidatedFeeSchedule(fboId),
  })

  // Filter rules into primary and general categories
  const primaryFeeRules = useMemo(() => {
    const filtered = consolidatedData?.rules?.filter(rule => rule.is_primary_fee) || []
    console.log('All rules from consolidated data:', consolidatedData?.rules)
    console.log('Filtered primary fee rules:', filtered)
    
    // Fallback: if no rules are marked as primary, show all rules as primary
    // This helps when the system hasn't been configured yet
    if (filtered.length === 0 && consolidatedData?.rules && consolidatedData.rules.length > 0) {
      console.log('No primary fees configured, falling back to show all rules as primary')
      return consolidatedData.rules
    }
    
    return filtered
  }, [consolidatedData])

  const generalServiceRules = useMemo(() => {
    const filtered = consolidatedData?.rules?.filter(rule => !rule.is_primary_fee) || []
    console.log('Filtered general service rules:', filtered)
    return filtered
  }, [consolidatedData])

  // Check if we need to show a warning about primary fees
  const showPrimaryFeeWarning = useMemo(() => {
    const actualPrimary = consolidatedData?.rules?.filter(rule => rule.is_primary_fee) || []
    const hasRules = consolidatedData?.rules && consolidatedData.rules.length > 0
    return hasRules && actualPrimary.length === 0
  }, [consolidatedData])

  const handleToggleCAA = () => {
    setViewMode(prev => prev === 'standard' ? 'caa' : 'standard')
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">FBO Configuration</h1>
          <p className="text-muted-foreground">Manage fees, waivers, and aircraft configurations for Austin (AUS)</p>
        </div>
      </div>

      {/* Warning about primary fees */}
      {showPrimaryFeeWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                No Primary Fee Columns Configured
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  You have fee rules configured, but none are marked as "primary fees" to appear as columns in the schedule table. 
                  Click "Manage Schedule Rules" above to configure which fees should appear as columns.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
          onClick={() => setShowScheduleRulesDialog(true)}
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
          primaryFeeRules={primaryFeeRules}
        />
      </div>

      {/* General Service Fees Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">General Service Fees</h2>
        <GeneralFeesTable 
          fboId={fboId} 
          generalServiceRules={generalServiceRules}
        />
      </div>

      {/* Schedule Rules Dialog */}
      <ScheduleRulesDialog
        fboId={fboId}
        open={showScheduleRulesDialog}
        onOpenChange={setShowScheduleRulesDialog}
      />
    </div>
  )
}

export default function FeeManagementPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <FeeManagementContent />
      <Toaster position="top-right" />
    </QueryClientProvider>
  )
}
