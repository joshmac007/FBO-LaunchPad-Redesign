"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

const feeValueSchema = z.object({
  value: z.string()
    .min(1, "Value is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Must be a valid number greater than or equal to 0"
    })
})

type FeeValueForm = z.infer<typeof feeValueSchema>

// --- NEW SUB-COMPONENT ---
// This component contains all the expensive form logic and is only rendered when needed.
const FeeEditForm = ({
  initialValue,
  onSave,
  onCancel,
}: {
  initialValue: number | null
  onSave: (newValue: number) => void
  onCancel: () => void
}) => {
  const form = useForm<FeeValueForm>({
    resolver: zodResolver(feeValueSchema),
    defaultValues: {
      value: initialValue?.toString() || "0"
    }
  })

  const handleSubmit = (data: FeeValueForm) => {
    const numericValue = Number(data.value)
    // Only call onSave if the value has actually changed
    if (numericValue !== initialValue) {
      onSave(numericValue)
    }
    onCancel() // This will set isEditing to false in the parent
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel()
    }
  }

  return (
    <div className="flex items-center gap-1">
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex items-center gap-1">
        <div className="relative">
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
          <Input
            {...form.register("value")}
            type="text"
            className="w-16 h-7 pl-5 text-sm"
            autoFocus
            onBlur={form.handleSubmit(handleSubmit)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </form>
      {form.formState.errors.value && (
        <div className="absolute z-10 mt-1 text-xs text-red-500 bg-white border rounded px-1.5 py-0.5 shadow-md">
          {form.formState.errors.value.message}
        </div>
      )}
    </div>
  )
}

interface EditableFeeCellProps {
  value: number | null
  isAircraftOverride: boolean
  onSave: (newValue: number) => void
  onRevert?: () => void
  disabled?: boolean
  className?: string
}

// --- UPDATED MAIN COMPONENT ---
export function EditableFeeCell({
  value,
  isAircraftOverride,
  onSave,
  onRevert,
  disabled = false,
  className
}: EditableFeeCellProps) {
  const [isEditing, setIsEditing] = useState(false)

  // Reset edit mode if the underlying value changes from an external source
  useEffect(() => {
    setIsEditing(false)
  }, [value])

  const handleClick = () => {
    if (!disabled) {
      setIsEditing(true)
    }
  }

  if (isEditing) {
    return (
      <FeeEditForm
        initialValue={value}
        onSave={onSave}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  const displayValue = typeof value === 'number' ? `$${Math.round(value)}` : "$0"

  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 cursor-pointer hover:bg-muted/50 rounded px-1.5 py-0.5 min-h-7",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      onClick={handleClick}
    >
      <span 
        className={cn(
          "text-sm",
          isAircraftOverride 
            ? "font-semibold text-foreground" 
            : "italic text-muted-foreground"
        )}
      >
        {displayValue}
      </span>
      
      {isAircraftOverride && onRevert && !disabled && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 hover:bg-destructive/10"
          onClick={(e) => {
            e.stopPropagation()
            onRevert()
          }}
          title="Revert to inherited value"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
} 