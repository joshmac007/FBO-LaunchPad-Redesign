"use client"

import { useState, useMemo } from "react"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Settings, Search, Plane } from "lucide-react"
import { FeeScheduleTable } from "./components/FeeScheduleTable"
import { ScheduleRulesDialog } from "./components/ScheduleRulesDialog"
import { getGlobalFeeSchedule } from "@/app/services/admin-fee-config-service"

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
  // Fetch global fee schedule data (no FBO ID needed)
  const { data: globalData } = useQuery({
    queryKey: ['global-fee-schedule'],
    queryFn: () => getGlobalFeeSchedule(),
  })

  // Filter rules into primary and general categories
  const primaryFeeRules = useMemo(() => {
    const filtered = globalData?.fee_rules?.filter(rule => rule.is_primary_fee) || []
    console.log('All rules from global data:', globalData?.fee_rules)
    console.log('Filtered primary fee rules:', filtered)
    
    // Fallback: if no rules are marked as primary, show all rules as primary
    // This helps when the system hasn't been configured yet
    if (filtered.length === 0 && globalData?.fee_rules && globalData.fee_rules.length > 0) {
      console.log('No primary fees configured, falling back to show all rules as primary')
      return globalData.fee_rules
    }
    
    return filtered
  }, [globalData])


  // Check if we need to show a warning about primary fees
  const showPrimaryFeeWarning = useMemo(() => {
    const actualPrimary = globalData?.fee_rules?.filter(rule => rule.is_primary_fee) || []
    const hasRules = globalData?.fee_rules && globalData.fee_rules.length > 0
    return hasRules && actualPrimary.length === 0
  }, [globalData])

  const handleToggleCAA = () => {
    setViewMode(prev => prev === 'standard' ? 'caa' : 'standard')
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pricing & Fees</h1>
          <p className="text-muted-foreground">Set up your airport fees and pricing rules for different aircraft types</p>
        </div>
      </div>

      {/* Warning about primary fees */}
      {showPrimaryFeeWarning && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Setup Required: Choose Your Main Fee Categories
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  You have fees configured, but you need to select which fees should appear as main columns in your pricing table. 
                  Click "Configure Fees & Rules" below to choose your primary fee categories.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Toolbar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Pricing Tools
          </CardTitle>
          <CardDescription>
            Configure fee rules, customize your pricing display, and manage imports/exports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <Button
              variant={viewMode === 'caa' ? 'default' : 'outline'}
              onClick={handleToggleCAA}
              className="flex items-center gap-2"
            >
              {viewMode === 'caa' ? 'Switch to Standard View' : 'Switch to International View'}
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowScheduleRulesDialog(true)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configure Fees & Rules
            </Button>

            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search aircraft types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aircraft Fee Schedule Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Aircraft Pricing Schedule
          </CardTitle>
          <CardDescription>
            View and adjust pricing for different aircraft types. Aircraft are grouped by category for easy management.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FeeScheduleTable
            searchTerm={searchTerm}
            viewMode={viewMode}
            primaryFeeRules={primaryFeeRules}
            globalData={globalData}
          />
        </CardContent>
      </Card>


      {/* Schedule Rules Dialog */}
      <ScheduleRulesDialog
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
