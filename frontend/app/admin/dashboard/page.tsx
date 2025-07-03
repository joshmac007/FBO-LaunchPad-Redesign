"use client"

import { useEffect, useState } from "react"
import { 
  Users, 
  Shield, 
  Truck, 
  UserCheck, 
  Activity, 
  AlertTriangle,
  BarChart3,
  Clock,
  Zap,
  TrendingUp,
  RefreshCw,
  Database
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from "next/link"
import { cn } from "@/lib/utils"
import AdminService, { type DashboardData, type AdminDashboardStats, type SystemStatusItem, type ActivityItem } from "@/app/services/admin-service"
import PerformanceService, { type PerformanceOverview, type PerformanceStats, type SlowQuery } from "@/app/services/performance-service"
import { PerformanceMetricsGrid } from "@/components/dashboard/performance-chart"

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [performanceData, setPerformanceData] = useState<PerformanceOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPerformanceLoading, setIsPerformanceLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const data = await AdminService.getDashboardData()
      setDashboardData(data)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      throw err
    }
  }

  const loadPerformanceData = async () => {
    try {
      const data = await PerformanceService.getPerformanceOverview()
      setPerformanceData(data)
    } catch (err) {
      console.error('Error loading performance data:', err)
      throw err
    }
  }

  const loadAllData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Load both dashboard and performance data in parallel
      await Promise.all([
        loadDashboardData(),
        loadPerformanceData()
      ])
      
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setIsLoading(false)
      setIsPerformanceLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadAllData()
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
  const performanceStats = performanceData?.current_stats
  const slowQueries = performanceData?.slow_queries || []

  // Get performance health status
  const getPerformanceHealthStatus = () => {
    if (!performanceStats) return 'unknown'
    return PerformanceService.getHealthStatus(performanceStats)
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600 bg-green-50'
      case 'good':
        return 'text-blue-600 bg-blue-50'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50'
      case 'critical':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive system monitoring and administration
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Last updated: {lastUpdated.toLocaleString()}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceStats ? PerformanceService.formatResponseTime(performanceStats.avg_response_time) : '...'}
            </div>
            <div className="text-xs text-muted-foreground">
              <Badge 
                variant="outline" 
                className={getHealthStatusColor(getPerformanceHealthStatus())}
              >
                {getPerformanceHealthStatus()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {performanceStats ? PerformanceService.formatPercentage(performanceStats.cache_hit_rate) : '...'}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">Optimization active</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fuel Operations</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeFuelTrucks}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{stats.totalFuelTrucks} total trucks</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LST Staff</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeLSTs}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">{stats.totalLSTs} total staff</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="management">Management</TabsTrigger>
        </TabsList>

        {/* System Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
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

        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <PerformanceMetricsGrid data={performanceData?.trends || []} />
          
          {/* Slow Queries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Slow Query Detection
              </CardTitle>
              <CardDescription>
                Queries taking longer than 500ms to complete
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {slowQueries.length > 0 ? (
                  slowQueries.map((query, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{query.permission_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {query.query_type} • {new Date(query.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-red-600">
                        {PerformanceService.formatResponseTime(query.response_time)}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No slow queries detected</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Fuel Operations</CardTitle>
                <CardDescription>Fleet and fueling operation status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total Fuel Trucks</span>
                    <span className="font-semibold">{stats.totalFuelTrucks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Operational Trucks</span>
                    <span className="font-semibold text-green-600">{stats.activeFuelTrucks}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Operational Rate</span>
                    <span className="font-semibold">
                      {stats.totalFuelTrucks > 0 ? Math.round((stats.activeFuelTrucks / stats.totalFuelTrucks) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <Progress 
                  value={stats.totalFuelTrucks > 0 ? (stats.activeFuelTrucks / stats.totalFuelTrucks) * 100 : 0} 
                  className="w-full" 
                />
                <div className="pt-4 border-t">
                  <Button className="w-full" asChild>
                    <Link href="/admin/fuel-trucks">Manage Fleet</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Staff Management</CardTitle>
                <CardDescription>Line Service Technician staffing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total LST Staff</span>
                    <span className="font-semibold">{stats.totalLSTs}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Currently On Duty</span>
                    <span className="font-semibold text-green-600">{stats.activeLSTs}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Coverage Rate</span>
                    <span className="font-semibold">
                      {stats.totalLSTs > 0 ? Math.round((stats.activeLSTs / stats.totalLSTs) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <Progress 
                  value={stats.totalLSTs > 0 ? (stats.activeLSTs / stats.totalLSTs) * 100 : 0} 
                  className="w-full" 
                />
                <div className="pt-4 border-t">
                  <Button className="w-full" asChild>
                    <Link href="/admin/lst-management">Manage LST Staff</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Management Tab */}
        <TabsContent value="management" className="space-y-6">
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
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>Configure FBO settings and fee structures</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Performance Health</span>
                    <Badge variant="outline" className={getHealthStatusColor(getPerformanceHealthStatus())}>
                      {getPerformanceHealthStatus()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cache Efficiency</span>
                    <span className="font-medium">
                      {performanceStats ? PerformanceService.formatPercentage(performanceStats.cache_hit_rate) : '...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Sessions</span>
                    <span className="font-medium">
                      {performanceStats?.active_users || 0}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link href="/admin/fbo-config/fee-management">Fee Config</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="flex-1">
                    <Link href="/admin/aircraft">Aircraft</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
