"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Plane,
  ChevronLeft,
  ChevronRight,
  Home,
  FileText,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Users,
  Shield,
  Truck,
  UserCheck,
  Sun,
  Moon,
  Droplet,
  CheckCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "next-themes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePermissions } from "@/hooks/usePermissions"

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  permissions: string[]
  description?: string
}

interface AppSidebarProps {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  userRole?: "csr" | "admin" | "member" | "fueler" // Keep for backward compatibility
}

export default function AppSidebar({ collapsed, setCollapsed, userRole = "csr" }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  
  const { 
    user: permissionUser, 
    can, 
    canAny, 
    isAdmin, 
    isCSR, 
    isFueler, 
    isMember,
    loading: permissionsLoading 
  } = usePermissions()

  useEffect(() => {
    setMounted(true)

    // Get user from localStorage (fallback)
    const userData = localStorage.getItem("fboUser")
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  // Handle logout
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("fboUser")
    }
    router.push("/login")
  }

  // All possible navigation items with their required permissions - Updated to use backend permissions
  const allNavItems: NavItem[] = [
    // Admin Navigation
    {
      title: "Admin Dashboard",
      href: "/admin/dashboard",
      icon: <Home className="h-5 w-5" />,
      permissions: ['access_admin_dashboard'],
      description: "Admin overview and system management"
    },
    {
      title: "User Management",
      href: "/admin/users",
      icon: <Users className="h-5 w-5" />,
      permissions: ['manage_users'],
      description: "Manage system users and their access"
    },
    {
      title: "Permissions",
      href: "/admin/permissions",
      icon: <Shield className="h-5 w-5" />,
      permissions: ['view_permissions'],
      description: "Configure user permissions and roles"
    },
    {
      title: "Fuel Trucks",
      href: "/admin/fuel-trucks",
      icon: <Truck className="h-5 w-5" />,
      permissions: ['manage_fuel_trucks'],
      description: "Manage fuel truck fleet"
    },
    {
      title: "LST Management",
      href: "/admin/lst-management",
      icon: <UserCheck className="h-5 w-5" />,
      permissions: ['manage_users'],
      description: "Manage Line Service Technicians"
    },
    {
      title: "Customer Management",
      href: "/admin/customers",
      icon: <Users className="h-5 w-5" />,
      permissions: ['manage_customers'],
      description: "Manage customer accounts"
    },
    {
      title: "Aircraft Management",
      href: "/admin/aircraft",
      icon: <Plane className="h-5 w-5" />,
      permissions: ['manage_aircraft'],
      description: "Manage aircraft records and registration"
    },

    // CSR Navigation
    {
      title: "CSR Dashboard",
      href: "/csr/dashboard",
      icon: <Home className="h-5 w-5" />,
      permissions: ['access_csr_dashboard'],
      description: "Customer service overview"
    },
    {
      title: "Fuel Orders",
      href: "/csr/fuel-orders",
      icon: <FileText className="h-5 w-5" />,
      permissions: ['view_all_orders', 'create_order', 'edit_fuel_order'],
      description: "Manage fuel orders and requests"
    },
    {
      title: "Receipts",
      href: "/csr/receipts",
      icon: <Receipt className="h-5 w-5" />,
      permissions: ['view_all_receipts'],
      description: "View and manage transaction receipts"
    },
    {
      title: "Export Data",
      href: "/csr/export",
      icon: <BarChart3 className="h-5 w-5" />,
      permissions: ['export_order_data', 'view_order_statistics'],
      description: "Export data and generate reports"
    },

    // Fueler Navigation
    {
      title: "Fueler Dashboard",
      href: "/fueler/dashboard",
      icon: <Home className="h-5 w-5" />,
      permissions: ['access_fueler_dashboard'],
      description: "Fueling operations overview"
    },

    // Member Navigation
    {
      title: "Member Dashboard",
      href: "/member/dashboard",
      icon: <Home className="h-5 w-5" />,
      permissions: ['access_member_dashboard'],
      description: "Personal account overview"
    },
  ]

  // Filter navigation items based on user permissions
  const getAccessibleNavItems = (): NavItem[] => {
    if (permissionsLoading) {
      return [] // Show no items while loading
    }

    return allNavItems.filter(item => 
      canAny(item.permissions)
    )
  }

  // Utility navigation items (always shown if user has basic access)
  const getUtilityNavItems = (): NavItem[] => {
    const utilityItems: NavItem[] = []

    // Settings - shown to all authenticated users
    if (permissionUser?.isLoggedIn) {
      // Determine the appropriate settings path based on user's primary role
      let settingsPath = "/member/settings"
      if (isAdmin) {
        settingsPath = "/admin/settings"
      } else if (isCSR) {
        settingsPath = "/csr/settings" 
      } else if (isFueler) {
        settingsPath = "/fueler/settings"
      }

      utilityItems.push({
        title: "Settings",
        href: settingsPath,
        icon: <Settings className="h-5 w-5" />,
        permissions: [], // Always accessible to authenticated users
        description: "Account and application settings"
      })
    }

    return utilityItems
  }

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const getUserRoleLabel = () => {
    if (!permissionUser) return "Guest"
    
    // Determine primary role based on permissions
    if (isAdmin) return "Admin"
    if (isCSR) return "CSR" 
    if (isFueler) return "Fueler"
    if (isMember) return "Member"
    
    return "User"
  }

  const getDefaultDashboard = () => {
    if (isAdmin) return "/admin/dashboard"
    if (isCSR) return "/csr/dashboard"
    if (isFueler) return "/fueler/dashboard"
    if (isMember) return "/member/dashboard"
    return "/login"
  }

  const accessibleNavItems = getAccessibleNavItems()
  const utilityNavItems = getUtilityNavItems()

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out",
          collapsed ? "w-[80px]" : "w-[280px]",
        )}
      >
        {/* Sidebar Header with Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link href={getDefaultDashboard()} className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary rotate-45" />
            {!collapsed && <span className="text-xl font-bold">FBO LaunchPad</span>}
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="h-8 w-8 rounded-full">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto py-6">
          <nav className="flex flex-col gap-1 px-2">
            {/* Main Navigation */}
            {accessibleNavItems.length > 0 && (
              <div className="mb-6">
                {!collapsed && (
                  <div className="mb-3 px-4">
                    <h3 className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Main Menu</h3>
                  </div>
                )}
                {accessibleNavItems.map((item) => (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          isActive(item.href)
                            ? "bg-primary/10 text-primary shadow-sm"
                            : "text-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {item.icon}
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">
                        <div>
                          <div className="font-medium">{item.title}</div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
                          )}
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </div>
            )}

            {/* Utility Navigation */}
            {utilityNavItems.length > 0 && (
              <div>
                {!collapsed && (
                  <div className="mb-3 px-4">
                    <h3 className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Utilities</h3>
                  </div>
                )}
                {utilityNavItems.map((item) => (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          isActive(item.href)
                            ? "bg-primary/10 text-primary shadow-sm"
                            : "text-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {item.icon}
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">
                        <div>
                          <div className="font-medium">{item.title}</div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
                          )}
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}

                {/* Theme Toggle */}
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size={collapsed ? "icon" : "default"}
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      className={cn(
                        "w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 mt-1",
                        collapsed && "justify-center",
                      )}
                    >
                      {mounted && theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                      {!collapsed && <span>{mounted && theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right">
                      {mounted && theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            )}

            {/* Permission Loading State */}
            {permissionsLoading && (
              <div className="px-4 py-2">
                <div className="text-xs text-muted-foreground">Loading permissions...</div>
              </div>
            )}
          </nav>
        </div>

        {/* Sidebar Footer with User Info */}
        <div className="border-t p-4">
          {permissionUser?.isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start gap-3 p-2 h-auto">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={permissionUser.name} />
                    <AvatarFallback>
                      {permissionUser.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">{permissionUser.name || 'User'}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {getUserRoleLabel()}
                        </Badge>
                      </div>
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <div className="font-medium">{permissionUser.name || 'User'}</div>
                    <div className="text-xs text-muted-foreground">{permissionUser.email}</div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="text-center">
              <Button variant="outline" size="sm" onClick={() => router.push("/login")}>
                Sign In
              </Button>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
