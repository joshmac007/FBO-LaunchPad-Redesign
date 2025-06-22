"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload } from "lucide-react"
import { uploadFeeOverridesCSV } from "@/app/services/admin-fee-config-service"

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["text/csv"];

const uploadSchema = z.object({
  file: z
    .any()
    .refine((files) => files?.length == 1, "CSV file is required.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
      "Only .csv files are accepted."
    ),
});

interface UploadFeesDialogProps {
  fboId: number;
}

export function UploadFeesDialog({ fboId }: UploadFeesDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadFeeOverridesCSV(fboId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consolidated-fee-schedule", fboId] })
      toast.success("Fee overrides uploaded successfully.")
      setOpen(false)
      setSelectedFile(null)
      setError(null)
    },
    onError: (err: any) => {
      toast.error("Upload failed", {
        description: err.message || "An unexpected error occurred.",
      })
    },
  })

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const validation = uploadSchema.safeParse({ file: [file] })
      if (validation.success) {
        setSelectedFile(file)
        setError(null)
      } else {
        setSelectedFile(null)
        setError(validation.error.errors[0].message)
      }
    }
  }

  const handleSubmit = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile)
    } else if (!error) {
      setError("Please select a file.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Fees
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Fee Overrides</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk update aircraft-specific fee overrides. The file must contain the following columns: `aircraft_type_name`, `fee_code`, `override_amount`, and optionally `override_caa_amount`.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="csv-file">CSV File</Label>
            <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            <a href="/templates/fee_overrides_template.csv" download className="underline hover:text-primary">Download template</a>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={uploadMutation.isPending}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selectedFile || uploadMutation.isPending}>
            {uploadMutation.isPending ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 