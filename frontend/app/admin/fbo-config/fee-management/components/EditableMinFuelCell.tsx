"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const minFuelSchema = z.object({
  value: z.string()
    .min(1, "Value is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Must be a valid number greater than or equal to 0"
    })
})

type MinFuelForm = z.infer<typeof minFuelSchema>

interface EditableMinFuelCellProps {
  value: number | null
  onSave: (newValue: number) => void
  disabled?: boolean
  className?: string
}

export function EditableMinFuelCell({
  value,
  onSave,
  disabled = false,
  className
}: EditableMinFuelCellProps) {
  const [isEditing, setIsEditing] = useState(false)

  const form = useForm<MinFuelForm>({
    resolver: zodResolver(minFuelSchema),
    defaultValues: {
      value: value?.toString() || "0"
    }
  })

  const handleClick = () => {
    if (disabled) return
    setIsEditing(true)
    form.setValue("value", value?.toString() || "0")
  }

  const handleSubmit = (data: MinFuelForm) => {
    const numericValue = Number(data.value)
    onSave(numericValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    form.reset()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleCancel()
    }
  }

  const displayValue = value !== null ? `${value} gal` : "0 gal"

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex items-center gap-1">
          <div className="relative">
            <Input
              {...form.register("value")}
              type="text"
              className="w-20 h-8 pr-8 text-sm"
              autoFocus
              onBlur={form.handleSubmit(handleSubmit)}
              onKeyDown={handleKeyDown}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">gal</span>
          </div>
        </form>
        {form.formState.errors.value && (
          <div className="absolute z-10 mt-1 text-xs text-red-500 bg-white border rounded px-2 py-1 shadow-md">
            {form.formState.errors.value.message}
          </div>
        )}
      </div>
    )
  }

  return (
    <div 
      className={cn(
        "flex items-center cursor-pointer hover:bg-muted/50 rounded px-2 py-1 min-h-8",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      onClick={handleClick}
    >
      <span className="text-sm font-semibold text-foreground">
        {displayValue}
      </span>
    </div>
  )
} 