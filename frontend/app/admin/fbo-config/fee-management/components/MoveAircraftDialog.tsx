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
import {
  updateAircraftTypeClassification,
} from "@/app/services/admin-fee-config-service"
import { useToast } from "@/hooks/use-toast"
import { AircraftClassification } from "@/app/services/admin-fee-config-service"

export interface MoveAircraftDialogProps {
  aircraft: {
    aircraft_type_id: number
    aircraft_type_name: string
    classification_id: number
  } | null
  classifications: AircraftClassification[]
  open: boolean
  onOpenChange: (open: boolean) => void
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
  classifications,
  onSuccess,
}: MoveAircraftDialogProps) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const form = useForm<MoveAircraftForm>({
    resolver: zodResolver(moveAircraftSchema),
    defaultValues: {
      classification_id: aircraft?.classification_id || 0,
    },
  })

  // Reset form when aircraft changes
  useEffect(() => {
    if (aircraft) {
      form.reset({
        classification_id: aircraft.classification_id,
      })
    }
  }, [aircraft?.aircraft_type_id, form])

  const moveAircraftMutation = useMutation({
    mutationFn: (vars: { aircraftTypeId: number; classificationId: number }) =>
      updateAircraftTypeClassification(vars.aircraftTypeId, vars.classificationId),
    onSuccess: () => {
      toast({
        title: "Aircraft Moved",
        description: "The aircraft has been moved to the new classification.",
      })
      onSuccess()
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast({
        title: "Error Moving Aircraft",
        description:
          error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    },
  })

  const handleSubmit = (data: MoveAircraftForm) => {
    if (!aircraft) return
    moveAircraftMutation.mutate({
      aircraftTypeId: aircraft.aircraft_type_id,
      classificationId: data.classification_id,
    })
  }

  const handleCancel = () => {
    onOpenChange(false)
    form.reset()
  }

  const currentClassificationName =
    classifications.find((c) => c.id === aircraft?.classification_id)?.name ?? "Not Classified"

  // Filter out the current classification from available options
  const filteredClassifications = classifications.filter(
    (classification) => classification.id !== aircraft?.classification_id
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
            <strong>{currentClassificationName}</strong> to a different classification.
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