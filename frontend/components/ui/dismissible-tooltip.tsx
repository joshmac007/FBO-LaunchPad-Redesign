"use client"

import * as React from "react"
import { X, Info, AlertCircle, Lightbulb } from "lucide-react"
import { useUserPreferences } from "@/app/contexts/user-preferences-context"
import { cn } from "@/lib/utils"

interface DismissibleTooltipProps {
  id: string
  children: React.ReactNode
  className?: string
  variant?: "info" | "warning" | "tip"
  icon?: React.ReactNode
  title?: string
}

export function DismissibleTooltip({
  id,
  children,
  className,
  variant = "info",
  icon,
  title,
}: DismissibleTooltipProps) {
  const { preferences, updatePreferences } = useUserPreferences()
  
  // Check if this tooltip has been dismissed - if so, don't render anything
  const isDismissed = preferences.dismissed_tooltips.includes(id)
  
  if (isDismissed) {
    return null
  }

  // Handle temporary dismissal (X button)
  const handleClose = () => {
    // Just hide without saving - will come back on page refresh
    const element = document.querySelector(`[data-tooltip-id="${id}"]`) as HTMLElement
    if (element) {
      element.style.display = 'none'
    }
  }

  // Handle permanent dismissal ("Don't show again")
  const handlePermanentDismiss = () => {
    updatePreferences({
      dismissed_tooltips: [...preferences.dismissed_tooltips, id]
    })
  }

  // Get appropriate styling based on variant
  const variantStyles = {
    info: "bg-blue-50 border-blue-200 text-blue-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900", 
    tip: "bg-green-50 border-green-200 text-green-900"
  }

  const iconMap = {
    info: <Info className="h-5 w-5 text-blue-600" />,
    warning: <AlertCircle className="h-5 w-5 text-amber-600" />,
    tip: <Lightbulb className="h-5 w-5 text-green-600" />
  }

  return (
    <div 
      data-tooltip-id={id}
      className={cn(
        "relative rounded-lg border p-4",
        variantStyles[variant],
        className
      )}
      role="region"
      aria-labelledby={title ? `tooltip-title-${id}` : undefined}
      aria-live="polite"
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-3 right-3 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Content */}
      <div className="flex items-start gap-3 pr-6">
        {icon || iconMap[variant]}
        <div className="flex-1 space-y-2">
          {title && (
            <p id={`tooltip-title-${id}`} className="font-medium">
              {title}
            </p>
          )}
          <div className="text-sm">
            {children}
          </div>
          
          {/* Subtle "Don't show again" link at bottom */}
          <div className="pt-2">
            <button
              onClick={handlePermanentDismiss}
              className="text-xs opacity-75 hover:opacity-100 underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-sm"
            >
              Don't show again
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 