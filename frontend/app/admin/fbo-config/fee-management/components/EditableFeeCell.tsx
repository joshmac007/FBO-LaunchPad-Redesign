"use client"

import { useState } from "react"
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

interface EditableFeeCellProps {
  value: number | null
  isOverride: boolean
  onSave: (newValue: number) => void
  onRevert?: () => void
  disabled?: boolean
  className?: string
}

export function EditableFeeCell({
  value,
  isOverride,
  onSave,
  onRevert,
  disabled = false,
  className
}: EditableFeeCellProps) {
  const [isEditing, setIsEditing] = useState(false)

  const form = useForm<FeeValueForm>({
    resolver: zodResolver(feeValueSchema),
    defaultValues: {
      value: value?.toString() || "0"
    }
  })

  const handleClick = () => {
    if (disabled) return
    setIsEditing(true)
    form.setValue("value", value?.toString() || "0")
  }

  const handleSubmit = (data: FeeValueForm) => {
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

  const displayValue = value !== null ? `$${value.toFixed(2)}` : "$0.00"

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="flex items-center gap-1">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              {...form.register("value")}
              type="text"
              className="w-20 h-8 pl-6 text-sm"
              autoFocus
              onBlur={form.handleSubmit(handleSubmit)}
              onKeyDown={handleKeyDown}
            />
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
        "flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-2 py-1 min-h-8",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      onClick={handleClick}
    >
      <span 
        className={cn(
          "text-sm",
          isOverride 
            ? "font-semibold text-foreground" 
            : "italic text-muted-foreground"
        )}
      >
        {displayValue}
      </span>
      
      {isOverride && onRevert && !disabled && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-destructive/10"
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