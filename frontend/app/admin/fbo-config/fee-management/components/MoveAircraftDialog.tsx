"use client"

import { useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { updateAircraftClassificationMapping } from "@/app/services/admin-fee-config-service"

// TypeScript interfaces as specified in RFI-03
export interface ClassificationOption {
  id: number
  name: string
}

export interface AircraftToMove {
  aircraft_type_id: number
  aircraft_type_name: string
  current_classification_id: number
  current_classification_name: string
}

export interface MoveAircraftDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  aircraft: AircraftToMove | null
  availableClassifications: ClassificationOption[]
  fboId: number
  onSuccess: () => void
}

// Zod schema for form validation
const moveAircraftSchema = z.object({
  classification_id: z.number().min(1, "Please select a classification"),
})

type MoveAircraftForm = z.infer<typeof moveAircraftSchema>

export function MoveAircraftDialog({
  open,
  onOpenChange,
  aircraft,
  availableClassifications,
  fboId,
  onSuccess,
}: MoveAircraftDialogProps) {
  const queryClient = useQueryClient()

  const form = useForm<MoveAircraftForm>({
    resolver: zodResolver(moveAircraftSchema),
    defaultValues: {
      classification_id: aircraft?.current_classification_id || 0,
    },
  })

  // Reset form when aircraft changes
  useEffect(() => {
    if (aircraft) {
      form.reset({
        classification_id: aircraft.current_classification_id,
      })
    }
  }, [aircraft?.aircraft_type_id, form])

  const moveAircraftMutation = useMutation({
    mutationFn: async (data: MoveAircraftForm) => {
      if (!aircraft) {
        throw new Error("No aircraft selected")
      }
      
      return updateAircraftClassificationMapping(fboId, aircraft.aircraft_type_id, {
        classification_id: data.classification_id,
      })
    },
    onSuccess: () => {
      // Close the dialog
      onOpenChange(false)
      
      // Programmatically refetch the fee schedule data
      queryClient.invalidateQueries({ queryKey: ['consolidated-fee-schedule', fboId] })
      queryClient.invalidateQueries({ queryKey: ['aircraft-mappings', fboId] })
      
      // Call the success callback
      onSuccess()
      
      // Show success toast
      toast.success(`Successfully moved ${aircraft?.aircraft_type_name} to new classification`)
    },
    onError: (error: any) => {
      // Display a toast notification with the API error message
      const errorMessage = error?.message || 'Failed to move aircraft'
      toast.error(`Error: ${errorMessage}`)
    },
  })

  const handleSubmit = (data: MoveAircraftForm) => {
    moveAircraftMutation.mutate(data)
  }

  const handleCancel = () => {
    onOpenChange(false)
    form.reset()
  }

  // Filter out the current classification from available options
  const filteredClassifications = availableClassifications.filter(
    (classification) => classification.id !== aircraft?.current_classification_id
  )

  if (!aircraft) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Move Aircraft</DialogTitle>
          <DialogDescription>
            Move <strong>{aircraft.aircraft_type_name}</strong> from{" "}
            <strong>{aircraft.current_classification_name}</strong> to a different classification.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="classification_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Classification</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value, 10))}
                    value={field.value ? field.value.toString() : ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a classification" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredClassifications.map((classification) => (
                        <SelectItem
                          key={classification.id}
                          value={classification.id.toString()}
                        >
                          {classification.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={moveAircraftMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={moveAircraftMutation.isPending}
              >
                {moveAircraftMutation.isPending ? "Moving..." : "Move Aircraft"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}