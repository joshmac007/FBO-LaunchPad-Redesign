"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Plane,
  ChevronLeft,
  ChevronRight,
  Home,
  FileText,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SidebarProps {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const pathname = usePathname()

  const mainNavItems = [
    {
      title: "Home",
      href: "/member/dashboard",
      icon: <Home className="h-5 w-5" />,
    },
    {
      title: "CSR Representatives",
      href: "/member/csr",
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: "Fueling Agents",
      href: "/member/fueling",
      icon: <Plane className="h-5 w-5 rotate-45" />,
    },
    {
      title: "Fuel Orders",
      href: "/member/orders",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      title: "Performance",
      href: "/member/performance",
      icon: <BarChart3 className="h-5 w-5" />,
    },
  ]

  const utilityNavItems = [
    {
      title: "Settings",
      href: "/member/settings",
      icon: <Settings className="h-5 w-5" />,
    },
    {
      title: "Help & Support",
      href: "/member/support",
      icon: <HelpCircle className="h-5 w-5" />,
    },
  ]

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r bg-white dark:bg-gray-900 transition-all duration-300 ease-in-out",
        collapsed ? "w-[80px]" : "w-[280px]",
      )}
    >
      {/* Sidebar Header */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        <Link href="/member/dashboard" className="flex items-center gap-2">
          <Plane className="h-6 w-6 text-primary rotate-45" />
          {!collapsed && <span className="text-xl font-bold">FBO LaunchPad</span>}
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="h-8 w-8 rounded-full">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto py-4">
        <TooltipProvider delayDuration={0}>
          <nav className="flex flex-col gap-1 px-2">
            {/* Main Navigation */}
            <div className="mb-4">
              {!collapsed && (
                <div className="mb-2 px-4">
                  <h3 className="text-xs font-medium uppercase text-gray-500">Main Menu</h3>
                </div>
              )}
              {mainNavItems.map((item) => (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive(item.href)
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200",
                      )}
                    >
                      {item.icon}
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
                </Tooltip>
              ))}
            </div>

            {/* Utility Navigation */}
            <div className="mt-auto">
              {!collapsed && (
                <div className="mb-2 px-4">
                  <h3 className="text-xs font-medium uppercase text-gray-500">Utilities</h3>
                </div>
              )}
              {utilityNavItems.map((item) => (
                <Tooltip key={item.href} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive(item.href)
                          ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200",
                      )}
                    >
                      {item.icon}
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">{item.title}</TooltipContent>}
                </Tooltip>
              ))}
            </div>
          </nav>
        </TooltipProvider>
      </div>

      {/* Sidebar Footer */}
      <div className="border-t p-4">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className={cn("w-full justify-start gap-2", collapsed && "justify-center px-0")}
              onClick={() => {
                // Handle logout
                localStorage.removeItem("fboUser")
                window.location.href = "/login"
              }}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </Button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Logout</TooltipContent>}
        </Tooltip>
      </div>
    </aside>
  )
}
