"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FeeScheduleTab } from "./components/FeeScheduleTab"

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
  return (
    <QueryClientProvider client={queryClient}>
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">FBO Configuration</h1>
            <p className="text-muted-foreground">Manage fees, waivers, and aircraft configurations</p>
          </div>
        </div>

        <Tabs defaultValue="fee-schedule" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fee-schedule">Fee Schedule</TabsTrigger>
            <TabsTrigger value="waiver-tiers">Waiver Tiers</TabsTrigger>
            <TabsTrigger value="other-fees">Other Fees</TabsTrigger>
          </TabsList>

          <TabsContent value="fee-schedule" className="space-y-6">
            <FeeScheduleTab />
          </TabsContent>

          <TabsContent value="waiver-tiers" className="space-y-6">
            <div className="text-center py-12 text-muted-foreground">Waiver Tiers configuration coming soon...</div>
          </TabsContent>

          <TabsContent value="other-fees" className="space-y-6">
            <div className="text-center py-12 text-muted-foreground">Other Fees configuration coming soon...</div>
          </TabsContent>
        </Tabs>
      </div>

      <Toaster position="top-right" />
    </QueryClientProvider>
  )
}
