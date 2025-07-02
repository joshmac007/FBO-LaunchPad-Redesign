"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUserPreferences } from "@/app/contexts/user-preferences-context";
import { UserPreferences } from "@/app/schemas/user-preferences.schema";

export function FeeScheduleSettingsTab() {
  const { preferences, updatePreferences, isLoading } = useUserPreferences();

  const handleViewSizeChange = async (value: 'default' | 'compact') => {
    try {
      await updatePreferences({ fee_schedule_view_size: value });
    } catch (error) {
      // Error is already handled by the context with a toast
      console.error('Failed to update view size preference:', error);
    }
  };

  const handleSortOrderChange = async (value: string) => {
    try {
      await updatePreferences({ fee_schedule_sort_order: value });
    } catch (error) {
      // Error is already handled by the context with a toast
      console.error('Failed to update sort order preference:', error);
    }
  };

  const handleHighlightOverridesChange = async (checked: boolean) => {
    try {
      await updatePreferences({ highlight_overrides: checked });
    } catch (error) {
      // Error is already handled by the context with a toast
      console.error('Failed to update highlight overrides preference:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Display Preferences</CardTitle>
          <CardDescription>
            Customize how the fee schedule table is displayed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* View Size Control */}
          <div className="space-y-2">
            <Label htmlFor="view-size">Table View Size</Label>
            <Select
              value={preferences.fee_schedule_view_size}
              onValueChange={handleViewSizeChange}
              disabled={isLoading}
            >
              <SelectTrigger id="view-size" className="w-[200px]">
                <SelectValue placeholder="Select view size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="compact">Compact</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose between default and compact table row sizes
            </p>
          </div>

          {/* Sort Order Control */}
          <div className="space-y-2">
            <Label htmlFor="sort-order">Default Sort Order</Label>
            <Select
              value={preferences.fee_schedule_sort_order}
              onValueChange={handleSortOrderChange}
              disabled={isLoading}
            >
              <SelectTrigger id="sort-order" className="w-[240px]">
                <SelectValue placeholder="Select sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classification_name:asc">Classification Name (A-Z)</SelectItem>
                <SelectItem value="classification_name:desc">Classification Name (Z-A)</SelectItem>
                <SelectItem value="aircraft_count:asc">Aircraft Count (Low to High)</SelectItem>
                <SelectItem value="aircraft_count:desc">Aircraft Count (High to Low)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Set the default sorting for fee schedule classifications
            </p>
          </div>

          {/* Highlight Overrides Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="highlight-overrides">Highlight Fee Overrides</Label>
              <p className="text-sm text-muted-foreground">
                Make overridden fees stand out with bold text
              </p>
            </div>
            <Switch
              id="highlight-overrides"
              checked={preferences.highlight_overrides}
              onCheckedChange={handleHighlightOverridesChange}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}