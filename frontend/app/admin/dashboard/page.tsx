"use client"

import { useEffect, useState } from "react"
import { Users, Shield, Truck, UserCheck, TrendingUp, Activity, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalRoles: 0,
    totalPermissions: 0,
    activeFuelTrucks: 0,
    totalFuelTrucks: 0,
    activeLSTs: 0,
    totalLSTs: 0,
  })

  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    // Load statistics from localStorage
    const users = JSON.parse(localStorage.getItem("fboUsers") || "[]")
    const roles = JSON.parse(localStorage.getItem("fboRoles") || "[]")
    const permissions = JSON.parse(localStorage.getItem("fboPermissions") || "[]")
    const fuelTrucks = JSON.parse(localStorage.getItem("fboFuelTrucks") || "[]")
    const lsts = JSON.parse(localStorage.getItem("fboLSTs") || "[]")

    setStats({
      totalUsers: users.length,
      activeUsers: users.filter((user: any) => user.is_active !== false).length,
      totalRoles: roles.length,
      totalPermissions: permissions.length,
      activeFuelTrucks: fuelTrucks.filter((truck: any) => truck.is_active).length,
      totalFuelTrucks: fuelTrucks.length,
      activeLSTs: lsts.filter((lst: any) => lst.is_active).length,
      totalLSTs: lsts.length,
    })

    // Mock recent activity
    setRecentActivity([
      {
        id: 1,
        type: "user_created",
        message: "New user John Doe created",
        timestamp: "2 minutes ago",
        severity: "info",
      },
      {
        id: 2,
        type: "role_assigned",
        message: "CSR role assigned to Sarah Johnson",
        timestamp: "15 minutes ago",
        severity: "info",
      },
      {
        id: 3,
        type: "truck_maintenance",
        message: "Fuel truck FT-003 scheduled for maintenance",
        timestamp: "1 hour ago",
        severity: "warning",
      },
      {
        id: 4,
        type: "lst_performance",
        message: "LST Michael Brown completed 15 fuel orders today",
        timestamp: "2 hours ago",
        severity: "success",
      },
    ])
  }, [])

  const quickActions = [
    {
      title: "Add New User",
      description: "Create a new user account",
      href: "/admin/users",
      icon: <Users className="h-5 w-5" />,
      color: "bg-blue-500",
    },
    {
      title: "Manage Permissions",
      description: "Configure role permissions",
      href: "/admin/permissions",
      icon: <Shield className="h-5 w-5" />,
      color: "bg-green-500",
    },
    {
      title: "Add Fuel Truck",
      description: "Register a new fuel truck",
      href: "/admin/fuel-trucks",
      icon: <Truck className="h-5 w-5" />,
      color: "bg-orange-500",
    },
    {
      title: "Add LST",
      description: "Register a new line service technician",
      href: "/admin/lst-management",
      icon: <UserCheck className="h-5 w-5" />,
      color: "bg-purple-500",
    },
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "success":
        return "text-green-600 bg-green-50"
      case "warning":
        return "text-yellow-600 bg-yellow-50"
      case "error":
        return "text-red-600 bg-red-50"
      default:
        return "text-blue-600 bg-blue-50"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your FBO operations and system administration</p>
        </div>
        <div className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleString()}</div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{stats.activeUsers} active</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles & Permissions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRoles}</div>
            <p className="text-xs text-muted-foreground">{stats.totalPermissions} permissions defined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fuel Trucks</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFuelTrucks}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{stats.activeFuelTrucks} operational</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LST Staff</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLSTs}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{stats.activeLSTs} on duty</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>Common administrative tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-105">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${action.color} text-white`}>{action.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{action.title}</h3>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity and System Status */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest system activities and changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(activity.severity)}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full">
                View All Activity
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>Current system health and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">User Authentication</span>
                </div>
                <Badge variant="outline" className="text-green-600">
                  Operational
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">Permission System</span>
                </div>
                <Badge variant="outline" className="text-green-600">
                  Operational
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-sm font-medium">Fuel Truck Monitoring</span>
                </div>
                <Badge variant="outline" className="text-yellow-600">
                  Maintenance
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">LST Performance</span>
                </div>
                <Badge variant="outline" className="text-green-600">
                  Operational
                </Badge>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full">
                View System Details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Management Modules Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User & Permission Management</CardTitle>
            <CardDescription>Manage user accounts, roles, and access permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Users</span>
                <span className="font-medium">{stats.activeUsers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Defined Roles</span>
                <span className="font-medium">{stats.totalRoles}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Permissions</span>
                <span className="font-medium">{stats.totalPermissions}</span>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button asChild size="sm" className="flex-1">
                <Link href="/admin/users">Manage Users</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link href="/admin/permissions">Permissions</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operations Management</CardTitle>
            <CardDescription>Oversee fuel trucks and line service technicians</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Fuel Trucks</span>
                <span className="font-medium">{stats.activeFuelTrucks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">On-Duty LSTs</span>
                <span className="font-medium">{stats.activeLSTs}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Operational Status</span>
                <Badge variant="outline" className="text-green-600">
                  Normal
                </Badge>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button asChild size="sm" className="flex-1">
                <Link href="/admin/fuel-trucks">Fuel Trucks</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link href="/admin/lst-management">LST Management</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
