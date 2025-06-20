import { API_BASE_URL, getAuthHeaders } from './api-config'

// Performance stats interfaces
export interface PerformanceStats {
  total_requests: number
  avg_response_time: number
  error_rate: number
  cache_hit_rate: number
  active_users: number
  peak_concurrent_users: number
  timeframe: string
}

export interface PerformanceTrend {
  timestamp: string
  requests: number
  avg_response_time: number
  error_rate: number
  cache_hit_rate: number
}

export interface SlowQuery {
  query_type: string
  permission_name: string
  response_time: number
  timestamp: string
  user_id?: string
  resource_context?: Record<string, any>
}

export interface UserPerformanceStats {
  user_id: string
  username: string
  total_requests: number
  avg_response_time: number
  error_rate: number
  most_used_permissions: string[]
  last_activity: string
}

export interface PermissionPerformanceStats {
  permission_name: string
  total_requests: number
  avg_response_time: number
  error_rate: number
  cache_hit_rate: number
  unique_users: number
  slow_queries_count: number
}

export interface PerformanceOverview {
  current_stats: PerformanceStats
  trends: PerformanceTrend[]
  slow_queries: SlowQuery[]
  top_users: UserPerformanceStats[]
  top_permissions: PermissionPerformanceStats[]
}

class PerformanceService {
  
  /**
   * Get current performance statistics
   */
  async getCurrentStats(timeframe: string = 'last_hour'): Promise<PerformanceStats> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/performance/stats?timeframe=${timeframe}`,
        {
          headers: getAuthHeaders()
        }
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch performance stats: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Map backend response to frontend interface
      if (data.permission_checking) {
        const stats = data.permission_checking
        return {
          total_requests: stats.total_checks || 0,
          avg_response_time: stats.average_response_time_ms || 0,
          error_rate: (stats.error_rate_percent || 0) / 100, // Convert percentage to decimal
          cache_hit_rate: (stats.cache_hit_rate_percent || 0) / 100, // Convert percentage to decimal
          active_users: data.cache_health?.connected_clients || 0,
          peak_concurrent_users: 0, // Not available in current backend
          timeframe
        }
      }
      
      return data
    } catch (error) {
      console.error('Error fetching performance stats:', error)
      // Return fallback data to prevent UI breakage
      return {
        total_requests: 0,
        avg_response_time: 0,
        error_rate: 0,
        cache_hit_rate: 0,
        active_users: 0,
        peak_concurrent_users: 0,
        timeframe
      }
    }
  }

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(timeframe: string = 'last_24_hours'): Promise<PerformanceTrend[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/performance/trends?timeframe=${timeframe}`,
        {
          headers: getAuthHeaders()
        }
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch performance trends: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Map backend trends to frontend interface
      if (data.trends && Array.isArray(data.trends)) {
        return data.trends.map((trend: any) => ({
          timestamp: trend.interval_start || trend.timestamp || new Date().toISOString(),
          requests: trend.total_checks || 0,
          avg_response_time: trend.average_response_time_ms || 0,
          error_rate: (trend.error_rate_percent || 0) / 100,
          cache_hit_rate: (trend.cache_hit_rate_percent || 0) / 100
        }))
      }
      
      return []
    } catch (error) {
      console.error('Error fetching performance trends:', error)
      return []
    }
  }

  /**
   * Get slow queries
   */
  async getSlowQueries(thresholdMs: number = 500, limit: number = 10): Promise<SlowQuery[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/performance/slow-queries?threshold_ms=${thresholdMs}&limit=${limit}`,
        {
          headers: getAuthHeaders()
        }
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch slow queries: ${response.statusText}`)
      }
      
      const data = await response.json()
      return data.slow_queries || []
    } catch (error) {
      console.error('Error fetching slow queries:', error)
      return []
    }
  }

  /**
   * Get user-specific performance stats
   */
  async getUserPerformanceStats(userId: string): Promise<UserPerformanceStats | null> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/performance/users/${userId}/stats`,
        {
          headers: getAuthHeaders()
        }
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user performance stats: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching user performance stats:', error)
      return null
    }
  }

  /**
   * Get permission-specific performance stats
   */
  async getPermissionPerformanceStats(permissionName: string): Promise<PermissionPerformanceStats | null> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/performance/permissions/${encodeURIComponent(permissionName)}/stats`,
        {
          headers: getAuthHeaders()
        }
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch permission performance stats: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching permission performance stats:', error)
      return null
    }
  }

  /**
   * Get comprehensive performance overview
   */
  async getPerformanceOverview(): Promise<PerformanceOverview> {
    try {
      // Fetch all performance data in parallel
      const [currentStats, trends, slowQueries] = await Promise.all([
        this.getCurrentStats('last_hour'),
        this.getPerformanceTrends('last_24_hours'),
        this.getSlowQueries(500, 5)
      ])

      return {
        current_stats: currentStats,
        trends,
        slow_queries: slowQueries,
        top_users: [], // Will be populated based on trends analysis
        top_permissions: [] // Will be populated based on permission usage
      }
    } catch (error) {
      console.error('Error fetching performance overview:', error)
      // Return safe fallback data
      return {
        current_stats: {
          total_requests: 0,
          avg_response_time: 0,
          error_rate: 0,
          cache_hit_rate: 0,
          active_users: 0,
          peak_concurrent_users: 0,
          timeframe: 'last_hour'
        },
        trends: [],
        slow_queries: [],
        top_users: [],
        top_permissions: []
      }
    }
  }

  /**
   * Format response time for display
   */
  formatResponseTime(milliseconds: number): string {
    if (milliseconds < 1000) {
      return `${Math.round(milliseconds)}ms`
    }
    return `${(milliseconds / 1000).toFixed(2)}s`
  }

  /**
   * Format percentage for display
   */
  formatPercentage(decimal: number): string {
    return `${(decimal * 100).toFixed(1)}%`
  }

  /**
   * Get performance health status based on metrics
   */
  getHealthStatus(stats: PerformanceStats): 'excellent' | 'good' | 'warning' | 'critical' {
    const { avg_response_time, error_rate, cache_hit_rate } = stats
    
    // Critical thresholds
    if (avg_response_time > 5000 || error_rate > 0.1 || cache_hit_rate < 0.3) {
      return 'critical'
    }
    
    // Warning thresholds
    if (avg_response_time > 2000 || error_rate > 0.05 || cache_hit_rate < 0.6) {
      return 'warning'
    }
    
    // Good thresholds
    if (avg_response_time > 1000 || error_rate > 0.02 || cache_hit_rate < 0.8) {
      return 'good'
    }
    
    return 'excellent'
  }
}

// Export singleton instance
const performanceService = new PerformanceService()
export default performanceService 