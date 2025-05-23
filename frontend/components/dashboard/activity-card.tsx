import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface Activity {
  id: string | number
  user: {
    name: string
    avatar?: string
    email?: string
  }
  action: string
  target?: string
  timestamp: string | Date
  project?: string
}

interface ActivityCardProps {
  title: string
  description?: string
  activities: Activity[]
  className?: string
  limit?: number
}

export function ActivityCard({ title, description, activities, className, limit = 5 }: ActivityCardProps) {
  // Format timestamp
  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.round(diffMs / 60000)
    const diffHours = Math.round(diffMs / 3600000)

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    }
  }

  return (
    <Card className={cn("border-0 shadow-sm", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.slice(0, limit).map((activity) => (
            <div key={activity.id} className="flex gap-4">
              <Avatar className="h-9 w-9">
                <AvatarImage src={activity.user.avatar || "/placeholder.svg"} alt={activity.user.name} />
                <AvatarFallback>{activity.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <p className="text-sm">
                  <span className="font-medium">{activity.user.name}</span> {activity.action}{" "}
                  <span className="text-blue-600 hover:underline cursor-pointer">{activity.target}</span>
                </p>
                <div className="flex items-center text-xs text-gray-500">
                  <span>{formatTimestamp(activity.timestamp)}</span>
                  {activity.project && (
                    <>
                      <span className="mx-1">•</span>
                      <span>{activity.project}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              <p>No recent activity</p>
            </div>
          )}
        </div>
        {activities.length > limit && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-center">
              <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                View all activity
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
