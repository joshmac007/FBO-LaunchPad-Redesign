"use client"

import { useState, useMemo } from "react"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Settings, Search, Plane, Eye, EyeOff } from "lucide-react"
import { FeeScheduleTable } from "./components/FeeScheduleTable"
import { ScheduleRulesDialog } from "./components/ScheduleRulesDialog"
import { getGlobalFeeSchedule } from "@/app/services/admin-fee-config-service"
import { useUserPreferences } from "@/app/contexts/user-preferences-context"

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
  const [showScheduleRulesDialog, setShowScheduleRulesDialog] = useState(false)
  const { preferences, updatePreferences } = useUserPreferences()
  
  // Fetch global fee schedule data (no FBO ID needed)
  const { data: globalData } = useQuery({
    queryKey: ['global-fee-schedule'],
    queryFn: () => getGlobalFeeSchedule(),
  })

  // Filter fee rules based on user preference
  const primaryFeeRules = useMemo(() => {
    if (!globalData?.fee_rules) return []
    
    // If no preference set, show all rules (existing behavior)
    if (!preferences.fee_schedule_column_codes || preferences.fee_schedule_column_codes.length === 0) {
      return globalData.fee_rules
    }
    
    // Filter based on user preference
    return globalData.fee_rules.filter(rule => 
      preferences.fee_schedule_column_codes.includes(rule.fee_code)
    )
  }, [globalData?.fee_rules, preferences.fee_schedule_column_codes])


  const handleToggleClassificationDefaults = () => {
    updatePreferences({ show_classification_defaults: !preferences.show_classification_defaults })
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


      {/* Action Toolbar */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <Button
              variant={preferences.show_classification_defaults ? 'outline' : 'default'}
              onClick={handleToggleClassificationDefaults}
              className="flex items-center gap-2"
            >
              {preferences.show_classification_defaults ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Hide Classification Defaults
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Show Classification Defaults
                </>
              )}
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
            primaryFeeRules={primaryFeeRules}
            globalData={globalData}
            showClassificationDefaults={preferences.show_classification_defaults}
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
