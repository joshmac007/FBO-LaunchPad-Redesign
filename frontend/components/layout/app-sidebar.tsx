"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Plane,
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
import { Button } from "@/components/ui/button"
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
import {
  useSidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  permissions: string[]
  requiredRoles?: string[] // Add this field for role-based checks
  description?: string
}

interface AppSidebarProps {
  userRole?: "csr" | "admin" | "member" | "fueler" // Keep for backward compatibility
}

export default function AppSidebar({ userRole = "csr" }: AppSidebarProps) {
  const { state } = useSidebar()
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
      requiredRoles: ['System Administrator'], // Added role check
      description: "System-wide settings and management"
    },
    {
      title: "User Management",
      href: "/admin/users",
      icon: <Users className="h-5 w-5" />,
      permissions: ['manage_users'],
      requiredRoles: ['System Administrator'], // Added role check
      description: "Manage user accounts"
    },
    {
      title: "LST Management",
      href: "/admin/lst-management",
      icon: <UserCheck className="h-5 w-5" />,
      permissions: ['manage_users'],
      requiredRoles: ['System Administrator'], // Added role check
      description: "Manage Line Service Technicians"
    },
    {
      title: "Permissions",
      href: "/admin/permissions",
      icon: <Shield className="h-5 w-5" />,
      permissions: ['manage_roles'],
      requiredRoles: ['System Administrator'], // Added role check
      description: "Manage roles and permissions"
    },
    {
      title: "Fuel Trucks",
      href: "/admin/fuel-trucks",
      icon: <Truck className="h-5 w-5" />,
      permissions: ['manage_fuel_trucks'],
      requiredRoles: ['System Administrator'], // Added role check
      description: "Manage fuel truck fleet"
    },
    {
      title: "Customer Management",
      href: "/admin/customers",
      icon: <Users className="h-5 w-5" />,
      permissions: ['manage_customers'],
      requiredRoles: ['System Administrator'], // Added role check
      description: "Manage customer accounts"
    },
    {
      title: "Aircraft Management",
      href: "/admin/aircraft",
      icon: <Plane className="h-5 w-5" />,
      permissions: ['manage_aircraft'],
      requiredRoles: ['System Administrator'], // Added role check
      description: "Manage aircraft records and registration"
    },
    {
      title: "Fee Management",
      href: "/admin/fbo-config/fee-management",
      icon: <Settings className="h-5 w-5" />,
      permissions: ['manage_fbo_fee_schedules'],
      requiredRoles: ['System Administrator'],
      description: "Manage fee categories, rules, and waivers"
    },

    // CSR Navigation
    {
      title: "CSR Dashboard",
      href: "/csr/dashboard",
      icon: <Home className="h-5 w-5" />,
      permissions: ['access_csr_dashboard'],
      requiredRoles: ['Customer Service Representative', 'System Administrator'], // Added role check
      description: "Main dashboard for CSRs"
    },
    {
      title: "Fuel Orders",
      href: "/csr/fuel-orders",
      icon: <FileText className="h-5 w-5" />,
      permissions: ['view_all_orders', 'create_fuel_order'],
      requiredRoles: ['Customer Service Representative', 'System Administrator'], // Added role check
      description: "Manage all fuel orders"
    },
    {
      title: "Receipts",
      href: "/csr/receipts",
      icon: <Receipt className="h-5 w-5" />,
      permissions: ['view_receipts', 'create_receipt'],
      requiredRoles: ['Customer Service Representative', 'System Administrator'], // Added role check
      description: "Manage and issue receipts"
    },
    {
      title: "Export Data",
      href: "/csr/export",
      icon: <BarChart3 className="h-5 w-5" />,
      permissions: ['export_order_data', 'view_order_statistics'],
      requiredRoles: ['Customer Service Representative', 'System Administrator'], // Added role check
      description: "Export data and generate reports"
    },

    // Fueler Navigation
    {
      title: "Fueler Dashboard",
      href: "/fueler/dashboard",
      icon: <Droplet className="h-5 w-5" />,
      permissions: ['access_fueler_dashboard'],
      requiredRoles: ['Line Service Technician', 'System Administrator'], // Added role check
      description: "Dashboard for LSTs to manage fuel orders"
    },
    {
      title: "Completed Orders",
      href: "/fueler/completed",
      icon: <CheckCircle className="h-5 w-5" />,
      permissions: ['access_fueler_dashboard'],
      requiredRoles: ['Line Service Technician', 'System Administrator'], // Added role check
      description: "View your completed orders"
    },

    // Member Navigation
    {
      title: "Member Dashboard",
      href: "/member/dashboard",
      icon: <Home className="h-5 w-5" />,
      permissions: [], // No specific permission, just role
      requiredRoles: ['Member', 'System Administrator'], // Added role check
      description: "Dashboard for members"
    },
  ]

  // Filter navigation items based on user permissions
  const getAccessibleNavItems = (): NavItem[] => {
    if (permissionsLoading) {
      return [] // Show no items while loading
    }

    const userRoles = permissionUser?.roles || []

    return allNavItems.filter(item => {
      // If requiredRoles is defined, use it for access control.
      if (item.requiredRoles && item.requiredRoles.length > 0) {
        return item.requiredRoles.some(requiredRole => userRoles.includes(requiredRole))
      }

      // Fallback to original permission-based logic if requiredRoles is not set.
      if (!item.permissions || item.permissions.length === 0) {
        return true
      }
      return canAny(item.permissions)
    })
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
    <>
      <SidebarHeader>
        <Link href={getDefaultDashboard()} className="flex items-center gap-2 p-2">
          <Plane className="h-6 w-6 text-primary rotate-45" />
          {state === 'expanded' && <span className="text-xl font-bold">FBO LaunchPad</span>}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {accessibleNavItems.length > 0 && (
            <>
              <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {accessibleNavItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href)}
                        tooltip={state === 'collapsed' ? `${item.title}${item.description ? ` - ${item.description}` : ''}` : undefined}
                      >
                        <Link href={item.href}>
                          {item.icon}
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </>
          )}

        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>Utilities</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {utilityNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={state === 'collapsed' ? `${item.title}${item.description ? ` - ${item.description}` : ''}` : undefined}
                  >
                    <Link href={item.href}>
                      {item.icon}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  tooltip={state === 'collapsed' ? (mounted && theme === "dark" ? "Light Mode" : "Dark Mode") : undefined}
                >
                  {mounted && theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  <span>{mounted && theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {/* Permission Loading State */}
        {permissionsLoading && (
          <div className="px-4 py-2">
            <div className="text-xs text-muted-foreground">Loading permissions...</div>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter>
        {permissionUser?.isLoggedIn ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src="" alt={permissionUser.name} />
                  <AvatarFallback className="rounded-lg">
                    {permissionUser.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{permissionUser.name || 'User'}</span>
                  <Badge variant="secondary" className="text-xs w-fit">
                    {getUserRoleLabel()}
                  </Badge>
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side="bottom"
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src="" alt={permissionUser.name} />
                    <AvatarFallback className="rounded-lg">
                      {permissionUser.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{permissionUser.name || 'User'}</span>
                    <span className="truncate text-xs">{permissionUser.email}</span>
                  </div>
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
          <SidebarMenuButton onClick={() => router.push("/login")}>
            Sign In
          </SidebarMenuButton>
        )}
      </SidebarFooter>
    </>
  )
}
