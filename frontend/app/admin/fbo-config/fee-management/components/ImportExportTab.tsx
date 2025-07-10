"use client"

import React, { useState, useCallback } from "react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { useDropzone } from "react-dropzone"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { UploadIcon, DownloadIcon, FileTextIcon, AlertTriangleIcon, Archive, History } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { 
  importFeeConfiguration, 
  exportFeeConfiguration,
  getFeeScheduleVersions, 
  createFeeScheduleVersion, 
  restoreFeeScheduleVersion,
  type FeeScheduleVersion
} from "@/app/services/admin-fee-config-service"
import { feeScheduleVersionSchema, type FeeScheduleVersionFormData } from "@/app/schemas/versioning.schema"

export function ImportExportTab() {
  const queryClient = useQueryClient()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

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

  // Import mutation
  const importMutation = useMutation({
    mutationFn: importFeeConfiguration,
    onSuccess: (data) => {
      // Invalidate all fee-related queries to refresh the entire application state
      queryClient.invalidateQueries({ queryKey: ['fee-rules'] })
      queryClient.invalidateQueries({ queryKey: ['waiver-tiers'] })
      queryClient.invalidateQueries({ queryKey: ['aircraft-classifications'] })
      queryClient.invalidateQueries({ queryKey: ['global-fee-schedule'] })
      queryClient.invalidateQueries({ queryKey: ['fee-schedule-versions'] })
      
      setSelectedFile(null)
      setUploadProgress(0)
      
      // Show the exact toast message as specified in the requirements
      toast.success("Configuration imported successfully. A backup of the previous state is available for 48 hours.")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to import configuration")
      setUploadProgress(0)
    },
  })

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: exportFeeConfiguration,
    onSuccess: () => {
      toast.success("Configuration exported successfully")
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to export configuration")
    },
  })

  // Dropzone configuration
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.json')) {
        toast.error("Please select a valid JSON file")
        return
      }
      
      // Validate file size (e.g., max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB")
        return
      }
      
      setSelectedFile(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json']
    },
    multiple: false,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const handleImport = () => {
    if (selectedFile) {
      setUploadProgress(10) // Start progress
      importMutation.mutate(selectedFile)
    }
  }

  const handleExport = () => {
    exportMutation.mutate()
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setUploadProgress(0)
  }

  const handleCreateVersion = (data: FeeScheduleVersionFormData) => {
    createVersionMutation.mutate(data)
  }

  const handleRestoreVersion = (versionId: number) => {
    restoreVersionMutation.mutate(versionId)
  }

  // Simulate progress during import
  React.useEffect(() => {
    if (importMutation.isPending && uploadProgress < 90) {
      const timer = setTimeout(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [importMutation.isPending, uploadProgress])

  return (
    <div className="space-y-6 p-6">
      {/* Version Control Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">■ VERSION CONTROL</h3>
        
        <div className="space-y-4 pl-4">
          {/* Save Current State */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              <h4 className="font-medium">Save Current State</h4>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateVersion)} className="flex gap-2">
                <FormField
                  control={form.control}
                  name="version_name"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input placeholder="Version name (e.g., Q3 2024 Update)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  disabled={createVersionMutation.isPending}
                  size="sm"
                >
                  {createVersionMutation.isPending ? "Saving..." : "Save Version"}
                </Button>
              </form>
            </Form>
          </div>

          {/* Saved Versions */}
          {versions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <h4 className="font-medium">Saved Versions</h4>
              </div>
              
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Version Name</TableHead>
                      <TableHead>Saved By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versions.map((version) => (
                      <TableRow key={version.id}>
                        <TableCell className="font-medium">{version.version_name}</TableCell>
                        <TableCell>{version.created_by_username || `User ${version.created_by_user_id}`}</TableCell>
                        <TableCell>{new Date(version.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
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
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import/Export Files Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">■ IMPORT / EXPORT FILES</h3>
        
        <div className="space-y-6 pl-4">
          {/* Import Configuration */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <UploadIcon className="h-4 w-4" />
              <h4 className="font-medium">Import Configuration</h4>
            </div>
            
            <div className="space-y-3">
              {/* File Drop Zone */}
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  isDragActive && !isDragReject ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                  isDragReject ? "border-destructive bg-destructive/5" : "",
                  selectedFile ? "border-green-500 bg-green-50" : ""
                )}
              >
                <input {...getInputProps()} />
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileTextIcon className="h-6 w-6 mx-auto text-green-600" />
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                    <Button variant="outline" size="sm" onClick={handleRemoveFile}>
                      Remove File
                    </Button>
                  </div>
                ) : isDragActive ? (
                  <div className="space-y-2">
                    <FileTextIcon className="h-6 w-6 mx-auto text-primary" />
                    <p className="text-sm font-medium">Drop your JSON file here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileTextIcon className="h-6 w-6 mx-auto text-muted-foreground" />
                    <p className="text-sm font-medium">Drop .json file here or click to browse</p>
                    <p className="text-xs text-muted-foreground">Max 10MB • Replaces entire configuration</p>
                  </div>
                )}
              </div>

              {/* Import Progress */}
              {importMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Importing configuration...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              {/* Import Button */}
              <Button
                onClick={handleImport}
                disabled={!selectedFile || importMutation.isPending}
                size="sm"
              >
                {importMutation.isPending ? "Importing..." : "Upload and Import"}
              </Button>
            </div>
          </div>

          {/* Export Configuration */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <DownloadIcon className="h-4 w-4" />
              <h4 className="font-medium">Export Configuration</h4>
            </div>
            
            <Button
              onClick={handleExport}
              disabled={exportMutation.isPending}
              size="sm"
            >
              {exportMutation.isPending ? "Exporting..." : "Export to .json"}
            </Button>
          </div>
        </div>
      </div>

      {/* Reset Options Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">■ RESET OPTIONS</h3>
        
        <div className="space-y-3 pl-4">
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="h-4 w-4 text-destructive" />
            <h4 className="font-medium text-destructive">Danger Zone</h4>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
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
        </div>
      </div>
    </div>
  )
}