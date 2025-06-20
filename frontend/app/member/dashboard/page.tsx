"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AppLayout from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThumbsUp, Clock, BarChart, MoreHorizontal, FileText, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import PermissionDebug from "@/app/components/permission-debug"

// Types
interface Task {
  id: string
  title: string
  status: "in_progress" | "on_hold" | "done"
  timeSpent: string
  dueDate?: string
}

interface Activity {
  id: string
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

export default function MemberDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [stats, setStats] = useState({
    finished: { value: 18, trend: "+8 tasks" },
    tracked: { value: "31h", trend: "-6 hours" },
    efficiency: { value: "93%", trend: "+12%" },
  })

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem("fboUser")
    if (!userData) {
      router.push("/login")
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      if (!parsedUser.isLoggedIn) {
        router.push("/login")
        return
      }

      setUser(parsedUser)

      // Load mock data
      loadMockData()
    } catch (error) {
      console.error("Error parsing user data:", error)
      router.push("/login")
      return
    }

    setIsLoading(false)
  }, [router])

  const loadMockData = () => {
    // Mock tasks
    const mockTasks: Task[] = [
      {
        id: "1",
        title: "Review fuel order for United Airlines",
        status: "in_progress",
        timeSpent: "4h",
      },
      {
        id: "2",
        title: "Update CSR training documentation",
        status: "on_hold",
        timeSpent: "8h",
      },
      {
        id: "3",
        title: "Complete monthly performance report",
        status: "done",
        timeSpent: "32h",
      },
    ]
    setTasks(mockTasks)

    // Mock activities
    const mockActivities: Activity[] = [
      {
        id: "1",
        user: {
          name: "Floyd Miles",
          avatar: "/abstract-geometric-shapes.png",
        },
        action: "commented on",
        target: "Fuel Order #1234",
        project: "Operations",
        timestamp: new Date(Date.now() - 15 * 60000).toISOString(), // 15 minutes ago
      },
      {
        id: "2",
        user: {
          name: "Guy Hawkins",
          avatar: "/abstract-geometric-shapes.png",
        },
        action: "added a file to",
        target: "CSR Documentation",
        project: "Training",
        timestamp: new Date(Date.now() - 60 * 60000).toISOString(), // 1 hour ago
      },
      {
        id: "3",
        user: {
          name: "Kristin Watson",
          avatar: "/abstract-geometric-shapes.png",
        },
        action: "commented on",
        target: "Performance Metrics",
        project: "Analytics",
        timestamp: new Date(Date.now() - 3 * 60 * 60000).toISOString(), // 3 hours ago
      },
    ]
    setActivities(mockActivities)
  }

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

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "on_hold":
        return <AlertCircle className="h-4 w-4 text-amber-500" />
      case "done":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case "in_progress":
        return "In progress"
      case "on_hold":
        return "On hold"
      case "done":
        return "Done"
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Hello, {user?.name || "User"}</h1>
          <p className="text-gray-500">Track team progress here. You almost reach a goal!</p>
        </div>

        {/* Permission Debug Component */}
        <PermissionDebug />

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Finished */}
          <Card className="bg-gray-50 border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="rounded-full bg-gray-200 p-2">
                  <ThumbsUp className="h-5 w-5 text-gray-700" />
                </div>
                <div className="text-xs font-medium text-green-600">{stats.finished.trend}</div>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-500">Finished</h3>
                <div className="mt-1 flex items-baseline">
                  <p className="text-3xl font-semibold">{stats.finished.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tracked */}
          <Card className="bg-gray-50 border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="rounded-full bg-gray-200 p-2">
                  <Clock className="h-5 w-5 text-gray-700" />
                </div>
                <div className="text-xs font-medium text-red-600">{stats.tracked.trend}</div>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-500">Tracked</h3>
                <div className="mt-1 flex items-baseline">
                  <p className="text-3xl font-semibold">{stats.tracked.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Efficiency */}
          <Card className="bg-gray-50 border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="rounded-full bg-gray-200 p-2">
                  <BarChart className="h-5 w-5 text-gray-700" />
                </div>
                <div className="text-xs font-medium text-green-600">{stats.efficiency.trend}</div>
              </div>
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-500">Efficiency</h3>
                <div className="mt-1 flex items-baseline">
                  <p className="text-3xl font-semibold">{stats.efficiency.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Performance</CardTitle>
              <CardDescription>Track your team's performance over time</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                01-07 May
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full flex items-center justify-center bg-gray-50 rounded-md">
              <p className="text-gray-500">Performance chart will be displayed here</p>
            </div>
          </CardContent>
        </Card>

        {/* Tasks and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Tasks */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Current Tasks</CardTitle>
                <CardDescription>Done 30%</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Week
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-gray-200 p-2">
                        <FileText className="h-4 w-4 text-gray-700" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-normal",
                              task.status === "in_progress" && "bg-blue-50 text-blue-700 border-blue-200",
                              task.status === "on_hold" && "bg-amber-50 text-amber-700 border-amber-200",
                              task.status === "done" && "bg-green-50 text-green-700 border-green-200",
                            )}
                          >
                            <span className="flex items-center gap-1">
                              {getStatusIcon(task.status)}
                              {getStatusText(task.status)}
                            </span>
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">{task.timeSpent}</span>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Activity */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity) => (
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
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-center">
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                    View all activity
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
