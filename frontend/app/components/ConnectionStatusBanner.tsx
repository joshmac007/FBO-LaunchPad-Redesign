"use client"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wifi, WifiOff, Clock } from "lucide-react"

interface ConnectionStatusBannerProps {
  connectionStatus: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED'
  queuedActionsCount: number
  className?: string
}

export function ConnectionStatusBanner({ 
  connectionStatus, 
  queuedActionsCount, 
  className 
}: ConnectionStatusBannerProps) {
  if (connectionStatus === 'CONNECTED' && queuedActionsCount === 0) {
    return null
  }

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'DISCONNECTED':
        return {
          variant: 'destructive' as const,
          icon: WifiOff,
          message: 'Connection lost. Actions will be queued until reconnected.',
          bgColor: 'bg-red-50 border-red-200',
        }
      case 'RECONNECTING':
        return {
          variant: 'default' as const,
          icon: Wifi,
          message: 'Reconnecting...',
          bgColor: 'bg-yellow-50 border-yellow-200',
        }
      default:
        return {
          variant: 'default' as const,
          icon: Clock,
          message: 'Syncing queued actions...',
          bgColor: 'bg-blue-50 border-blue-200',
        }
    }
  }

  const config = getStatusConfig()
  const IconComponent = config.icon

  return (
    <div 
      className={cn("fixed top-0 left-0 right-0 z-50", className)}
      data-cy="connection-status-banner"
    >
      <Alert className={cn("rounded-none border-x-0 border-t-0", config.bgColor)}>
        <IconComponent className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            {config.message}
            {queuedActionsCount > 0 && (
              <span className="ml-2">
                {queuedActionsCount} action{queuedActionsCount !== 1 ? 's' : ''} queued
              </span>
            )}
          </span>
          {queuedActionsCount > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-2"
              data-cy="queued-actions-count"
            >
              {queuedActionsCount}
            </Badge>
          )}
        </AlertDescription>
      </Alert>
    </div>
  )
} 