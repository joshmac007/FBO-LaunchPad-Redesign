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
  DialogTrigger,
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
import { Input } from "@/components/ui/input"
import { Plus } from "lucide-react"
import { addAircraftToFeeSchedule } from "@/app/services/admin-fee-config-service"

const addAircraftSchema = z.object({
  aircraft_type_name: z.string().min(1, "Aircraft type name is required"),
  fee_category_id: z.string().min(1, "Fee category is required"),
  min_fuel_gallons: z.string()
    .min(1, "Minimum fuel is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Must be a valid number greater than or equal to 0"
    })
})

type AddAircraftForm = z.infer<typeof addAircraftSchema>

interface AddAircraftDialogProps {
  fboId: number
  categories: Array<{ id: number; name: string }>
}

export function AddAircraftDialog({ fboId, categories }: AddAircraftDialogProps) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const form = useForm<AddAircraftForm>({
    resolver: zodResolver(addAircraftSchema),
    defaultValues: {
      aircraft_type_name: "",
      fee_category_id: "",
      min_fuel_gallons: "0"
    }
  })

  // This would be implemented with a proper API call
  const addAircraftMutation = useMutation({
    mutationFn: async (data: AddAircraftForm) => {
      return addAircraftToFeeSchedule(fboId, {
        aircraft_type_name: data.aircraft_type_name,
        fee_category_id: parseInt(data.fee_category_id, 10),
        min_fuel_gallons: parseInt(data.min_fuel_gallons, 10),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consolidated-fee-schedule', fboId] })
      toast.success("Aircraft added successfully")
      setOpen(false)
      form.reset()
    },
    onError: (error) => {
      toast.error("Failed to add aircraft", {
        description: (error as Error).message || "An unexpected error occurred."
      })
      console.error("Add aircraft error:", error)
    }
  })

  const onSubmit = (data: AddAircraftForm) => {
    addAircraftMutation.mutate(data)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Aircraft
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Aircraft Type</DialogTitle>
          <DialogDescription>
            Add a new aircraft type to the fee schedule with initial configuration.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="aircraft_type_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aircraft Type Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Citation CJ3+" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fee_category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a fee category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="min_fuel_gallons"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Fuel (Gallons)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={addAircraftMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addAircraftMutation.isPending}
              >
                {addAircraftMutation.isPending ? "Adding..." : "Add Aircraft"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 