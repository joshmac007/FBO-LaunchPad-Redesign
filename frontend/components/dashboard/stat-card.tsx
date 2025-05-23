import type React from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { cva, type VariantProps } from "class-variance-authority"

const statCardVariants = cva("", {
  variants: {
    variant: {
      default: "bg-gray-50 border-0 shadow-sm",
      primary: "bg-blue-50 border-0 shadow-sm",
      success: "bg-green-50 border-0 shadow-sm",
      warning: "bg-amber-50 border-0 shadow-sm",
      danger: "bg-red-50 border-0 shadow-sm",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

interface StatCardProps extends VariantProps<typeof statCardVariants> {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: {
    value: string
    isUpward: boolean
  }
  className?: string
  children?: React.ReactNode
}

export function StatCard({ title, value, icon, trend, variant, className, children }: StatCardProps) {
  return (
    <Card className={cn(statCardVariants({ variant }), className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="rounded-full bg-gray-200 p-2">{icon}</div>
          {trend && (
            <div className={cn("text-xs font-medium", trend.isUpward ? "text-green-600" : "text-red-600")}>
              {trend.value}
            </div>
          )}
        </div>
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <div className="mt-1 flex items-baseline">
            <p className="text-3xl font-semibold">{value}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  )
}
