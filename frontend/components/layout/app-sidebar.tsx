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

interface AppSidebarProps {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  userRole?: "csr" | "admin" | "member" | "fueler"
}

export default function AppSidebar({ collapsed, setCollapsed, userRole = "csr" }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Get user from localStorage
    const userData = localStorage.getItem("fboUser")
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("fboUser")
    router.push("/login")
  }

  // Get navigation items based on user role
  const getNavItems = () => {
    switch (userRole) {
      case "csr":
        return [
          {
            title: "Dashboard",
            href: "/csr/dashboard",
            icon: <Home className="h-5 w-5" />,
          },
          {
            title: "Fuel Orders",
            href: "/csr/fuel-orders",
            icon: <FileText className="h-5 w-5" />,
          },
          {
            title: "Receipts",
            href: "/csr/receipts",
            icon: <Receipt className="h-5 w-5" />,
          },
          {
            title: "Export Data",
            href: "/csr/export",
            icon: <BarChart3 className="h-5 w-5" />,
          },
        ]
      case "admin":
        return [
          {
            title: "Dashboard",
            href: "/admin/dashboard",
            icon: <Home className="h-5 w-5" />,
          },
          {
            title: "User Management",
            href: "/admin/users",
            icon: <Users className="h-5 w-5" />,
          },
          {
            title: "Permissions",
            href: "/admin/permissions",
            icon: <Shield className="h-5 w-5" />,
          },
          {
            title: "Fuel Trucks",
            href: "/admin/fuel-trucks",
            icon: <Truck className="h-5 w-5" />,
          },
          {
            title: "LST Management",
            href: "/admin/lst-management",
            icon: <UserCheck className="h-5 w-5" />,
          },
        ]
      case "fueler":
        return [
          {
            title: "Dashboard",
            href: "/fueler/dashboard",
            icon: <Home className="h-5 w-5" />,
          },
          {
            title: "Pending Orders",
            href: "/fueler/pending-orders",
            icon: <Droplet className="h-5 w-5" />,
          },
          {
            title: "In Progress",
            href: "/fueler/in-progress",
            icon: <Truck className="h-5 w-5" />,
          },
          {
            title: "Completed Orders",
            href: "/fueler/completed",
            icon: <CheckCircle className="h-5 w-5" />,
          },
          {
            title: "Receipts",
            href: "/fueler/receipts",
            icon: <Receipt className="h-5 w-5" />,
          },
        ]
      default:
        return [
          {
            title: "Dashboard",
            href: `/${userRole}/dashboard`,
            icon: <Home className="h-5 w-5" />,
          },
        ]
    }
  }

  const utilityNavItems = [
    {
      title: "Settings",
      href: `/${userRole}/settings`,
      icon: <Settings className="h-5 w-5" />,
    },
  ]

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const getRoleLabel = () => {
    switch (userRole) {
      case "csr":
        return "CSR"
      case "admin":
        return "Admin"
      case "fueler":
        return "Fueler"
      default:
        return "Member"
    }
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out",
        collapsed ? "w-[80px]" : "w-[280px]",
      )}
    >
      {/* Sidebar Header with Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        <Link href={`/${userRole}/dashboard`} className="flex items-center gap-2">
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
          <div className="mb-6">
            {!collapsed && (
              <div className="mb-3 px-4">
                <h3 className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Main Menu</h3>
              </div>
            )}
            <TooltipProvider>
              {getNavItems().map((item) => (
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
                  {collapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>

          {/* Utility Navigation */}
          <div>
            {!collapsed && (
              <div className="mb-3 px-4">
                <h3 className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Utilities</h3>
              </div>
            )}
            <TooltipProvider>
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
                  {collapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
                </Tooltip>
              ))}
            </TooltipProvider>

            {/* Theme Toggle */}
            <TooltipProvider>
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
            </TooltipProvider>
          </div>
        </nav>
      </div>

      {/* User Profile Section */}
      <div className="border-t p-4">
        <div className={cn("flex", collapsed ? "flex-col items-center gap-2" : "items-center gap-3 mb-3")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/abstract-geometric-shapes.png" alt={user?.name || "User"} />
                  <AvatarFallback>{user?.name?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name || "User"}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email || "user@example.com"}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Account settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {!collapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium truncate">{user?.name || "User"}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground truncate">{user?.email || "user@example.com"}</span>
                <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 shrink-0">
                  {getRoleLabel()}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start gap-2", collapsed && "justify-center px-0")}
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                {!collapsed && <span>Logout</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Logout</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
  )
}
