import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { PerformanceTrend } from "@/app/services/performance-service"

interface PerformanceChartProps {
  title: string
  description?: string
  data: PerformanceTrend[]
  metric: 'requests' | 'avg_response_time' | 'error_rate' | 'cache_hit_rate'
  className?: string
}

interface MiniBarChartProps {
  data: number[]
  height?: number
  color?: string
  className?: string
}

// Simple mini bar chart component
function MiniBarChart({ data, height = 60, color = "bg-primary", className }: MiniBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-muted-foreground text-sm", className)}>
        No data available
      </div>
    )
  }

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  return (
    <div className={cn("flex items-end gap-1", className)} style={{ height }}>
      {data.map((value, index) => {
        const normalizedHeight = range > 0 ? ((value - min) / range) * height * 0.8 + height * 0.1 : height * 0.5
        return (
          <div
            key={index}
            className={cn("flex-1 rounded-t transition-all duration-300 hover:opacity-70", color)}
            style={{ height: `${normalizedHeight}px` }}
            title={`${value}`}
          />
        )
      })}
    </div>
  )
}

// Performance trend chart with sparklines
export function PerformanceChart({ title, description, data, metric, className }: PerformanceChartProps) {
  // Ensure data is an array and not empty
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-muted-foreground">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Extract values for the specific metric
  const values = data.map(item => {
    switch (metric) {
      case 'requests':
        return item.requests
      case 'avg_response_time':
        return item.avg_response_time
      case 'error_rate':
        return item.error_rate * 100 // Convert to percentage
      case 'cache_hit_rate':
        return item.cache_hit_rate * 100 // Convert to percentage
      default:
        return 0
    }
  })

  // Calculate trend stats
  const latest = values[values.length - 1] || 0
  const previous = values[values.length - 2] || latest
  const trend = latest - previous
  const trendPercentage = previous !== 0 ? (trend / previous) * 100 : 0

  // Format value based on metric type
  const formatValue = (value: number) => {
    switch (metric) {
      case 'requests':
        return value.toLocaleString()
      case 'avg_response_time':
        return `${Math.round(value)}ms`
      case 'error_rate':
      case 'cache_hit_rate':
        return `${value.toFixed(1)}%`
      default:
        return value.toString()
    }
  }

  // Get color based on metric and trend
  const getColor = () => {
    switch (metric) {
      case 'requests':
        return trend > 0 ? 'bg-blue-500' : 'bg-blue-400'
      case 'avg_response_time':
        return trend > 0 ? 'bg-red-500' : 'bg-green-500'
      case 'error_rate':
        return trend > 0 ? 'bg-red-500' : 'bg-green-500'
      case 'cache_hit_rate':
        return trend > 0 ? 'bg-green-500' : 'bg-yellow-500'
      default:
        return 'bg-primary'
    }
  }

  const getTrendColor = () => {
    switch (metric) {
      case 'requests':
        return trend > 0 ? 'text-blue-600' : 'text-blue-500'
      case 'avg_response_time':
        return trend > 0 ? 'text-red-600' : 'text-green-600'
      case 'error_rate':
        return trend > 0 ? 'text-red-600' : 'text-green-600'
      case 'cache_hit_rate':
        return trend > 0 ? 'text-green-600' : 'text-yellow-600'
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            {description && (
              <CardDescription className="text-sm">{description}</CardDescription>
            )}
          </div>
          {Math.abs(trendPercentage) > 0.1 && (
            <Badge variant="outline" className={getTrendColor()}>
              {trend > 0 ? '+' : ''}{trendPercentage.toFixed(1)}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">{formatValue(latest)}</span>
            <span className="text-sm text-muted-foreground">
              {data.length > 0 ? `${data.length} data points` : 'No data'}
            </span>
          </div>
          <MiniBarChart data={values} color={getColor()} />
          {data.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Last updated: {new Date(data[data.length - 1]?.timestamp || Date.now()).toLocaleTimeString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Performance metric grid component
interface PerformanceMetricsGridProps {
  data: PerformanceTrend[]
  className?: string
}

export function PerformanceMetricsGrid({ data, className }: PerformanceMetricsGridProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      <PerformanceChart
        title="Requests"
        description="Total requests per hour"
        data={data}
        metric="requests"
      />
      <PerformanceChart
        title="Response Time"
        description="Average response time"
        data={data}
        metric="avg_response_time"
      />
      <PerformanceChart
        title="Error Rate"
        description="Percentage of failed requests"
        data={data}
        metric="error_rate"
      />
      <PerformanceChart
        title="Cache Hit Rate"
        description="Percentage of cache hits"
        data={data}
        metric="cache_hit_rate"
      />
    </div>
  )
} 