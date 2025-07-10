"use client"

import React from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUserPreferences } from "@/app/contexts/user-preferences-context"

export function FeeScheduleSettingsTab() {
  const { preferences, updatePreferences, isLoading: preferencesLoading } = useUserPreferences()

  const handleViewSizeChange = async (value: 'compact' | 'standard' | 'detailed') => {
    try {
      await updatePreferences({ fee_schedule_view_size: value });
    } catch (error) {
      console.error('Failed to update view size preference:', error);
    }
  };

  const handleSortOrderChange = async (value: 'alphabetical' | 'amount_asc' | 'amount_desc' | 'classification') => {
    try {
      await updatePreferences({ fee_schedule_sort_order: value });
    } catch (error) {
      console.error('Failed to update sort order preference:', error);
    }
  };

  const handleHighlightOverridesChange = async (checked: boolean) => {
    try {
      await updatePreferences({ highlight_overrides: checked });
    } catch (error) {
      console.error('Failed to update highlight overrides preference:', error);
    }
  };



  return (
    <div className="space-y-6 p-6">
      {/* Table View Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">■ TABLE VIEW</h3>
        
        <div className="space-y-4 pl-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="highlight-overrides"
              checked={preferences.highlight_overrides}
              onCheckedChange={handleHighlightOverridesChange}
              disabled={preferencesLoading}
            />
            <Label htmlFor="highlight-overrides">Highlight overridden fees</Label>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="table-density">View density</Label>
              <Select 
                value={preferences.fee_schedule_view_size} 
                onValueChange={handleViewSizeChange}
                disabled={preferencesLoading}
              >
                <SelectTrigger id="table-density">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sort-order">Sort order</Label>
              <Select 
                value={preferences.fee_schedule_sort_order} 
                onValueChange={handleSortOrderChange}
                disabled={preferencesLoading}
              >
                <SelectTrigger id="sort-order">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                  <SelectItem value="classification">Classification</SelectItem>
                  <SelectItem value="amount_asc">Amount (Low to High)</SelectItem>
                  <SelectItem value="amount_desc">Amount (High to Low)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}