"use client"

import React, { useState, useCallback } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { UploadIcon, DownloadIcon, FileTextIcon, AlertTriangleIcon } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { 
  importFeeConfiguration, 
  exportFeeConfiguration
} from "@/app/services/admin-fee-config-service"

export function ImportExportTab() {
  const queryClient = useQueryClient()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

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
      {/* Import Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Import Configuration</CardTitle>
          <CardDescription>
            Import a complete fee schedule from a .json file. This will replace the entire existing setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning Message */}
          <div className="flex items-start space-x-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Important:</p>
              <p>Importing a new configuration will overwrite all existing settings. A backup of the current state will be automatically created.</p>
            </div>
          </div>

          {/* File Drop Zone */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive && !isDragReject ? "border-primary bg-primary/5" : "border-muted-foreground/25",
              isDragReject ? "border-destructive bg-destructive/5" : "",
              selectedFile ? "border-green-500 bg-green-50" : ""
            )}
          >
            <input {...getInputProps()} />
            {selectedFile ? (
              <div className="space-y-2">
                <FileTextIcon className="h-8 w-8 mx-auto text-green-600" />
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
                <UploadIcon className="h-8 w-8 mx-auto text-primary" />
                <p className="text-sm font-medium">Drop your JSON file here</p>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadIcon className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm font-medium">
                  Drop .json file here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Maximum file size: 10MB
                </p>
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
            className="w-full"
          >
            <UploadIcon className="h-4 w-4 mr-2" />
            {importMutation.isPending ? "Importing..." : "Upload and Import"}
          </Button>
        </CardContent>
      </Card>

      {/* Export Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Export Configuration</CardTitle>
          <CardDescription>
            Export the current fee schedule to a .json file for backup or migration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>The exported file will contain:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All fee rules and their configurations</li>
                <li>Aircraft classifications</li>
                <li>Waiver tiers and rules</li>
                <li>Fee rule overrides</li>
                <li>Aircraft type configurations</li>
              </ul>
            </div>
            
            <Button
              onClick={handleExport}
              disabled={exportMutation.isPending}
              className="w-full"
            >
              <DownloadIcon className="h-4 w-4 mr-2" />
              {exportMutation.isPending ? "Exporting..." : "Export Current Configuration (.json)"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Backup Workflow:</h4>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li>Export your current configuration before making major changes</li>
              <li>Store the exported file in a safe location</li>
              <li>If needed, import the file to restore your previous configuration</li>
            </ol>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">Environment Migration:</h4>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li>Export configuration from your source environment (e.g., staging)</li>
              <li>Import the file into your target environment (e.g., production)</li>
              <li>Verify all settings after import</li>
            </ol>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Always create a manual version snapshot before importing 
              a configuration to ensure you can easily revert if needed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}