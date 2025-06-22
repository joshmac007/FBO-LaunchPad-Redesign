"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Upload, Search, ToggleLeft, ToggleRight } from "lucide-react"
import { FeeScheduleTable } from "./FeeScheduleTable"
import { AddAircraftDialog } from "./AddAircraftDialog"
import { getConsolidatedFeeSchedule } from "@/app/services/admin-fee-config-service"

interface FeeScheduleTabProps {
  fboId?: number
}

export function FeeScheduleTab({ fboId = 1 }: FeeScheduleTabProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<'standard' | 'caa'>('standard')
  const [groupBy, setGroupBy] = useState<'classification' | 'manufacturer' | 'none'>('classification')

  const {
    data: consolidatedData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['consolidated-fee-schedule', fboId],
    queryFn: () => getConsolidatedFeeSchedule(fboId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const handleToggleCAA = () => {
    setViewMode(prev => prev === 'standard' ? 'caa' : 'standard')
  }

  const handleGroupByChange = (value: string) => {
    setGroupBy(value as 'classification' | 'manufacturer' | 'none')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>

        <div className="border rounded-lg">
          <div className="p-4">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-destructive">Failed to load fee schedule</h3>
          <p className="text-sm text-muted-foreground mt-1">
            There was an error loading the fee schedule data.
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  const categories = consolidatedData?.categories || []
  const totalAircraft = consolidatedData?.mappings?.length || 0
  const totalOverrides = consolidatedData?.overrides?.length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fee Schedule for Austin (AUS)</h2>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>{totalAircraft} aircraft types configured</span>
            <span>•</span>
            <span>{totalOverrides} custom overrides</span>
            <span>•</span>
            <Badge variant={viewMode === 'caa' ? 'default' : 'secondary'}>
              {viewMode === 'caa' ? 'CAA Pricing' : 'Standard Pricing'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <AddAircraftDialog fboId={fboId} categories={categories} />
        
        <Button variant="outline" className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload Fees
        </Button>

        <Button
          variant={viewMode === 'caa' ? 'default' : 'outline'}
          onClick={handleToggleCAA}
          className="flex items-center gap-2"
        >
          {viewMode === 'caa' ? (
            <ToggleRight className="h-4 w-4" />
          ) : (
            <ToggleLeft className="h-4 w-4" />
          )}
          Toggle CAA View
        </Button>

        <Select value={groupBy} onValueChange={handleGroupByChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Group by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="classification">Group by Classification</SelectItem>
            <SelectItem value="manufacturer">Group by Manufacturer</SelectItem>
            <SelectItem value="none">No Grouping</SelectItem>
          </SelectContent>
        </Select>

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

      {/* Fee Schedule Table */}
      {consolidatedData && (
        <FeeScheduleTable
          fboId={fboId}
          data={consolidatedData}
          searchTerm={searchTerm}
          viewMode={viewMode}
          groupBy={groupBy}
        />
      )}
    </div>
  )
}
