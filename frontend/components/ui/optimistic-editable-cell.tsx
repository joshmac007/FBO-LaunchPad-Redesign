"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, CheckIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// Schema for inline editing validation
const inlineEditValueSchema = z.object({
  value: z.string().min(1, "Value is required")
})

type InlineEditForm = z.infer<typeof inlineEditValueSchema>

interface InlineEditFormProps {
  initialValue: string | number
  type: 'text' | 'number' | 'currency'
  onSave: (newValue: string | number) => Promise<void>
  onCancel: () => void
  placeholder?: string
  validation?: z.ZodSchema<any>
  prefix?: string
  suffix?: string
}

const InlineEditForm = ({
  initialValue,
  type,
  onSave,
  onCancel,
  placeholder,
  validation = inlineEditValueSchema,
  prefix,
  suffix
}: InlineEditFormProps) => {
  const [isSaving, setIsSaving] = useState(false)
  
  const form = useForm<InlineEditForm>({
    resolver: zodResolver(validation),
    defaultValues: {
      value: initialValue?.toString() || ""
    }
  })

  const handleSubmit = async (data: InlineEditForm) => {
    if (isSaving) return
    
    let processedValue: string | number = data.value
    
    // Process based on type
    if (type === 'number' || type === 'currency') {
      const numericValue = Number(data.value)
      if (isNaN(numericValue)) {
        form.setError('value', { message: 'Must be a valid number' })
        return
      }
      processedValue = numericValue
    }
    
    // Only save if value changed
    if (processedValue.toString() === initialValue?.toString()) {
      onCancel()
      return
    }
    
    setIsSaving(true)
    try {
      await onSave(processedValue)
      onCancel()
    } catch (error) {
      // Error is handled by the optimistic mutation
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onCancel()
    } else if (e.key === "Enter") {
      e.preventDefault()
      form.handleSubmit(handleSubmit)()
    }
  }

  return (
    <div className="flex items-center gap-1">
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex items-center gap-1">
        <div className="relative">
          {prefix && (
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {prefix}
            </span>
          )}
          <Input
            {...form.register("value")}
            type="text"
            className={cn(
              "h-7 text-sm",
              prefix ? "pl-5" : "pl-2",
              suffix ? "pr-5" : "pr-2",
              type === 'number' || type === 'currency' ? "w-20" : "w-32"
            )}
            placeholder={placeholder}
            autoFocus
            disabled={isSaving}
            onBlur={() => {
              if (!isSaving) {
                form.handleSubmit(handleSubmit)()
              }
            }}
            onKeyDown={handleKeyDown}
          />
          {suffix && (
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex items-center gap-0.5">
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            disabled={isSaving}
            aria-label="Save changes"
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <CheckIcon className="h-3 w-3" />
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={onCancel}
            disabled={isSaving}
            aria-label="Cancel changes"
          >
            <XIcon className="h-3 w-3" />
          </Button>
        </div>
      </form>
      
      {/* Error display */}
      {form.formState.errors.value && (
        <div className="absolute z-10 mt-8 text-xs text-red-500 bg-white border rounded px-1.5 py-0.5 shadow-md">
          {form.formState.errors.value.message}
        </div>
      )}
    </div>
  )
}

interface OptimisticEditableCellProps {
  value: string | number | null
  type?: 'text' | 'number' | 'currency'
  onSave: (newValue: string | number) => Promise<void>
  disabled?: boolean
  className?: string
  placeholder?: string
  prefix?: string
  suffix?: string
  validation?: z.ZodSchema<any>
  isPending?: boolean
  displayFormat?: (value: string | number | null) => string
}

export function OptimisticEditableCell({
  value,
  type = 'text',
  onSave,
  disabled = false,
  className,
  placeholder,
  prefix,
  suffix,
  validation,
  isPending = false,
  displayFormat
}: OptimisticEditableCellProps) {
  const [isEditing, setIsEditing] = useState(false)

  // Reset edit mode if the underlying value changes from an external source
  useEffect(() => {
    setIsEditing(false)
  }, [value])

  const handleClick = () => {
    if (!disabled && !isPending) {
      setIsEditing(true)
    }
  }

  if (isEditing) {
    return (
      <InlineEditForm
        initialValue={value ?? ""}
        type={type}
        onSave={onSave}
        onCancel={() => setIsEditing(false)}
        placeholder={placeholder}
        validation={validation}
        prefix={prefix}
        suffix={suffix}
      />
    )
  }

  // Format display value
  let displayValue: string
  if (displayFormat) {
    displayValue = displayFormat(value)
  } else if (type === 'currency') {
    displayValue = typeof value === 'number' ? `$${value.toFixed(2)}` : "$0.00"
  } else {
    displayValue = value?.toString() || ""
  }

  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 cursor-pointer hover:bg-blue-50 hover:border hover:border-blue-200 rounded px-1.5 py-0.5 min-h-7 transition-colors duration-150",
        disabled && "cursor-not-allowed opacity-50",
        isPending && "opacity-70",
        className
      )}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled && !isPending) {
          e.preventDefault()
          setIsEditing(true)
        }
      }}
      aria-label={`Editable ${type} field with value ${displayValue}. Click to edit.`}
    >
      <span className={cn("text-sm", isPending && "flex items-center gap-1")}>
        {displayValue}
        {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
      </span>
    </div>
  )
}