"use client"

import { useState, useMemo } from "react"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Settings, Search, Plus, Eye, EyeOff } from "lucide-react"
import { FeeScheduleTable } from "./components/FeeScheduleTable"
import { ScheduleRulesDialog } from "./components/ScheduleRulesDialog"
import { FeeRuleFormDialog } from "./components/FeeRuleFormDialog"
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
  const [showAddFeeDialog, setShowAddFeeDialog] = useState(false)
  const { preferences, updatePreferences } = useUserPreferences()
  
  // Fetch global fee schedule data (no FBO ID needed)
  const { data: globalData } = useQuery({
    queryKey: ['global-fee-schedule'],
    queryFn: () => getGlobalFeeSchedule(),
  })

  // Filter fee rules based on user preference
  const primaryFeeRules = useMemo(() => {
    if (!globalData?.fee_rules) return []
    
    // If no preference set (null/undefined), show all rules (first time user)
    if (!preferences.fee_schedule_column_codes) {
      return globalData.fee_rules
    }
    
    // If preference is an empty array, user has explicitly hidden all columns
    if (preferences.fee_schedule_column_codes && preferences.fee_schedule_column_codes.length === 0) {
      return []
    }
    
    // Filter based on user preference
    return globalData.fee_rules.filter(rule => 
      preferences.fee_schedule_column_codes!.includes(rule.fee_code)
    )
  }, [globalData?.fee_rules, preferences.fee_schedule_column_codes])



  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pricing & Fees</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            className="flex items-center gap-2"
            onClick={() => setShowAddFeeDialog(true)}
          >
            <Plus className="h-4 w-4" />
            Add Fee
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowScheduleRulesDialog(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Fee Schedule Content */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-end gap-3">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search types..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updatePreferences({ show_classification_defaults: !preferences.show_classification_defaults })}
                className="flex items-center gap-2"
              >
                {preferences.show_classification_defaults ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    Hide Defaults
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Show Defaults
                  </>
                )}
              </Button>
            </div>

            <FeeScheduleTable
              searchTerm={searchTerm}
              primaryFeeRules={primaryFeeRules}
              globalData={globalData}
              showClassificationDefaults={preferences.show_classification_defaults}
            />
          </div>
        </CardContent>
      </Card>


      {/* Add Fee Dialog */}
      <FeeRuleFormDialog
        open={showAddFeeDialog}
        onOpenChange={setShowAddFeeDialog}
      />

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
