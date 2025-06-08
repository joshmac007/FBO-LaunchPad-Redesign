"use client"

import { useEffect, useState } from "react"
import { Users, Shield, Truck, UserCheck, Activity, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import AdminService, { type DashboardData, type AdminDashboardStats, type SystemStatusItem, type ActivityItem } from "@/app/services/admin-service"

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const data = await AdminService.getDashboardData()
      setDashboardData(data)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }



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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "text-green-600"
      case "maintenance":
        return "text-yellow-600"
      case "error":
        return "text-red-600"
      default:
        return "text-blue-600"
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational":
        return "Operational"
      case "maintenance":
        return "Maintenance"
      case "error":
        return "Error"
      default:
        return "Unknown"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Error Loading Dashboard</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadDashboardData}>Try Again</Button>
        </div>
      </div>
    )
  }

  const stats = dashboardData?.stats || {
    totalUsers: 0,
    activeUsers: 0,
    totalRoles: 0,
    totalPermissions: 0,
    activeFuelTrucks: 0,
    totalFuelTrucks: 0,
    activeLSTs: 0,
    totalLSTs: 0,
  }

  const systemStatus = dashboardData?.systemStatus || []
  const recentActivity = dashboardData?.recentActivity || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your FBO operations and system administration</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={loadDashboardData}>
            Refresh Data
          </Button>
          <div className="text-sm text-muted-foreground">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>
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
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(activity.severity)}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity to display</p>
              )}
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
              {systemStatus.length > 0 ? (
                systemStatus.map((status, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        status.status === 'operational' ? 'bg-green-500' :
                        status.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <span className="text-sm font-medium">{status.name}</span>
                    </div>
                    <Badge variant="outline" className={getStatusColor(status.status)}>
                      {getStatusBadge(status.status)}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">System status unavailable</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full" onClick={() => AdminService.getSystemHealth()}>
                Refresh System Status
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
