"use client"

import React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { toast } from "sonner"
import { useUserPreferences } from "@/app/contexts/user-preferences-context"
import { 
  getFeeScheduleVersions, 
  createFeeScheduleVersion, 
  restoreFeeScheduleVersion,
  type FeeScheduleVersion
} from "@/app/services/admin-fee-config-service"
import { feeScheduleVersionSchema, type FeeScheduleVersionFormData } from "@/app/schemas/versioning.schema"

export function FeeScheduleSettingsTab() {
  const queryClient = useQueryClient()
  const { preferences, updatePreferences, isLoading: preferencesLoading } = useUserPreferences()

  // Fetch fee schedule versions for version history
  const { data: versions = [] } = useQuery<FeeScheduleVersion[]>({
    queryKey: ['fee-schedule-versions'],
    queryFn: () => getFeeScheduleVersions(),
  })


  // Form for creating new version
  const form = useForm<FeeScheduleVersionFormData>({
    resolver: zodResolver(feeScheduleVersionSchema),
    defaultValues: {
      version_name: "",
      description: "",
    },
  })

  // Create version mutation
  const createVersionMutation = useMutation({
    mutationFn: createFeeScheduleVersion,
    onSuccess: (newVersion) => {
      queryClient.invalidateQueries({ queryKey: ['fee-schedule-versions'] })
      form.reset()
      toast.success(`Version "${newVersion.version_name}" created successfully`)
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create version")
    },
  })

  // Restore version mutation
  const restoreVersionMutation = useMutation({
    mutationFn: restoreFeeScheduleVersion,
    onSuccess: () => {
      // Invalidate all fee-related queries to refresh the entire UI
      queryClient.invalidateQueries({ queryKey: ['fee-rules'] })
      queryClient.invalidateQueries({ queryKey: ['waiver-tiers'] })
      queryClient.invalidateQueries({ queryKey: ['aircraft-classifications'] })
      queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
      toast.success("Configuration restored successfully")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to restore version")
    },
  })

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


  const handleCreateVersion = (data: FeeScheduleVersionFormData) => {
    createVersionMutation.mutate(data)
  }

  const handleRestoreVersion = (versionId: number) => {
    restoreVersionMutation.mutate(versionId)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Display Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
          <CardDescription>Configure how the fee schedule table appears</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="highlight-overrides"
              checked={preferences.highlight_overrides}
              onCheckedChange={handleHighlightOverridesChange}
              disabled={preferencesLoading}
            />
            <Label htmlFor="highlight-overrides">Highlight Overridden Fees</Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="table-density">Table View Density</Label>
            <Select 
              value={preferences.fee_schedule_view_size} 
              onValueChange={handleViewSizeChange}
              disabled={preferencesLoading}
            >
              <SelectTrigger id="table-density" className="w-[200px]">
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
            <Label htmlFor="sort-order">Default Sort Order</Label>
            <Select 
              value={preferences.fee_schedule_sort_order} 
              onValueChange={handleSortOrderChange}
              disabled={preferencesLoading}
            >
              <SelectTrigger id="sort-order" className="w-[300px]">
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
        </CardContent>
      </Card>

      {/* Version History Card */}
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
          <CardDescription>Save a snapshot of the current fee schedule before making major changes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateVersion)} className="flex gap-2">
              <FormField
                control={form.control}
                name="version_name"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Version name (e.g., Q3 2024 Pricing Update)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                disabled={createVersionMutation.isPending}
              >
                {createVersionMutation.isPending ? "Saving..." : "Save Current Version"}
              </Button>
            </form>
          </Form>

          {versions.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version Name</TableHead>
                  <TableHead>Saved By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell className="font-medium">{version.version_name}</TableCell>
                    <TableCell>{version.created_by_username || `User ${version.created_by_user_id}`}</TableCell>
                    <TableCell>{new Date(version.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Restore
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Restore Configuration?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will overwrite all current fee rules, overrides, and waiver tiers. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRestoreVersion(version.id)}
                              disabled={restoreVersionMutation.isPending}
                            >
                              {restoreVersionMutation.isPending ? "Restoring..." : "Confirm Restore"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone Card */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                Reset All Overrides...
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset All Fee Overrides?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all custom fee overrides for aircraft types and classifications. 
                  All fees will revert to their default values. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => toast.info("Reset functionality not yet implemented")}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Reset All Overrides
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}