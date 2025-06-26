"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createFeeCategory } from "@/app/services/admin-fee-config-service"

const createClassificationSchema = z.object({
  name: z.string().min(1, "Classification name is required").max(100, "Name must be 100 characters or less"),
})

type CreateClassificationForm = z.infer<typeof createClassificationSchema>

interface CreateClassificationDialogProps {
  fboId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (newCategoryId: number) => void
}

export function CreateClassificationDialog({
  fboId,
  open,
  onOpenChange,
  onSuccess,
}: CreateClassificationDialogProps) {
  const queryClient = useQueryClient()

  const form = useForm<CreateClassificationForm>({
    resolver: zodResolver(createClassificationSchema),
    defaultValues: {
      name: "",
    }
  })

  const createClassificationMutation = useMutation({
    mutationFn: async (data: CreateClassificationForm) => {
      return createFeeCategory(fboId, data)
    },
    onSuccess: (newCategory) => {
      // Invalidate both fee categories and consolidated fee schedule queries
      queryClient.invalidateQueries({ queryKey: ['fee-categories', fboId] })
      queryClient.invalidateQueries({ queryKey: ['consolidated-fee-schedule', fboId] })
      toast.success("Classification created successfully")
      onSuccess(newCategory.id)
      onOpenChange(false)
      form.reset()
    },
    onError: (error) => {
      toast.error("Failed to create classification", {
        description: (error as Error).message || "An unexpected error occurred."
      })
      console.error("Create classification error:", error)
    }
  })

  const onSubmit = (data: CreateClassificationForm) => {
    createClassificationMutation.mutate(data)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset()
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Classification</DialogTitle>
          <DialogDescription>
            Create a new fee category classification for aircraft types.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Classification Name*</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Heavy Jet, Light Jet, Turboprop" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createClassificationMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createClassificationMutation.isPending}
              >
                {createClassificationMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}