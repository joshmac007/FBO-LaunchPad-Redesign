"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  ChevronDown // <-- Import ChevronDown
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
  SidebarMenuSub, // <-- Import Sub-menu components
  SidebarMenuSubItem,
  SidebarMenuSubButton
} from "@/components/ui/sidebar"

interface NavItem {
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  permissions: string[];
  requiredRoles?: string[];
  description?: string;
  subItems?: NavItem[]; // <-- Added for nesting
}

interface NavSection {
  label: string
  items: NavItem[]
}

export default function AppSidebar() {
  const { state } = useSidebar()
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  const { 
    user: permissionUser, 
    canAny, 
    isAdmin, 
    isCSR, 
    isFueler, 
    isMember,
    loading: permissionsLoading 
  } = usePermissions()

  // State to manage which sub-menus are open
  const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);

  // Function to toggle sub-menus
  const handleSubMenuToggle = (href: string) => {
    setOpenSubMenus(prev => 
      prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]
    );
  };
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // Effect to automatically open the parent menu of the active page
  useEffect(() => {
    const getInitiallyOpenSubMenus = () => {
      const openMenus: string[] = [];
      for (const section of navSections) {
        for (const item of section.items) {
          if (item.href && item.subItems && item.subItems.length > 0) {
            if (pathname.startsWith(item.href)) {
              openMenus.push(item.href);
            }
          }
        }
      }
      return openMenus;
    };
    if (!permissionsLoading) {
      setOpenSubMenus(getInitiallyOpenSubMenus());
    }
  }, [pathname, permissionsLoading]);


  const handleLogout = () => {
    localStorage.removeItem("fboUser")
    router.push("/login")
  }

  // Updated Data Structure with grouped items
  const navSections: NavSection[] = [
    {
      label: "Main Menu",
      items: [
        {
          title: "Administration",
          href: "/admin",
          icon: <Shield className="h-5 w-5" />,
          permissions: ['access_admin_dashboard'],
          requiredRoles: ['System Administrator'],
          description: "Manage system-wide settings",
          subItems: [
            { title: "Admin Dashboard", href: "/admin/dashboard", icon: <Home className="h-5 w-5" />, permissions: ['access_admin_dashboard'], requiredRoles: ['System Administrator'] },
            { title: "User Management", href: "/admin/users", icon: <Users className="h-5 w-5" />, permissions: ['manage_users'], requiredRoles: ['System Administrator'] },
            { title: "LST Management", href: "/admin/lst-management", icon: <UserCheck className="h-5 w-5" />, permissions: ['manage_users'], requiredRoles: ['System Administrator'] },
            { title: "Permissions", href: "/admin/permissions", icon: <Shield className="h-5 w-5" />, permissions: ['manage_roles'], requiredRoles: ['System Administrator'] },
            { title: "Fuel Trucks", href: "/admin/fuel-trucks", icon: <Truck className="h-5 w-5" />, permissions: ['manage_fuel_trucks'], requiredRoles: ['System Administrator'] },
            { title: "Customer Management", href: "/admin/customers", icon: <Users className="h-5 w-5" />, permissions: ['manage_customers'], requiredRoles: ['System Administrator'] },
            { title: "Aircraft Management", href: "/admin/aircraft", icon: <Plane className="h-5 w-5" />, permissions: ['manage_aircraft'], requiredRoles: ['System Administrator'] },
            { title: "Fee Management", href: "/admin/fbo-config/fee-management", icon: <Settings className="h-5 w-5" />, permissions: ['manage_fbo_fee_schedules'], requiredRoles: ['System Administrator'] },
          ]
        },
        { title: "CSR Dashboard", href: "/csr/dashboard", icon: <Home className="h-5 w-5" />, permissions: ['access_csr_dashboard'], requiredRoles: ['Customer Service Representative', 'System Administrator'], description: "Main dashboard for CSRs" },
        { title: "Fuel Orders", href: "/csr/fuel-orders", icon: <FileText className="h-5 w-5" />, permissions: ['view_all_orders', 'create_fuel_order'], requiredRoles: ['Customer Service Representative', 'System Administrator'], description: "Manage all fuel orders" },
        { title: "Receipts", href: "/csr/receipts", icon: <Receipt className="h-5 w-5" />, permissions: ['view_receipts', 'create_receipt'], requiredRoles: ['Customer Service Representative', 'System Administrator'], description: "Manage and issue receipts" },
        { title: "Export Data", href: "/csr/export", icon: <BarChart3 className="h-5 w-5" />, permissions: ['export_order_data', 'view_order_statistics'], requiredRoles: ['Customer Service Representative', 'System Administrator'], description: "Export data and generate reports" },
        { title: "Fueler Dashboard", href: "/fueler/dashboard", icon: <Droplet className="h-5 w-5" />, permissions: ['access_fueler_dashboard'], requiredRoles: ['Line Service Technician', 'System Administrator'], description: "Dashboard for LSTs to manage fuel orders" },
        { title: "Completed Orders", href: "/fueler/completed", icon: <CheckCircle className="h-5 w-5" />, permissions: ['access_fueler_dashboard'], requiredRoles: ['Line Service Technician', 'System Administrator'], description: "View your completed orders" },
        { title: "Member Dashboard", href: "/member/dashboard", icon: <Home className="h-5 w-5" />, permissions: [], requiredRoles: ['Member', 'System Administrator'], description: "Dashboard for members" },
      ]
    },
    {
      label: "Utilities",
      items: []
    }
  ];
  
  const utilitiesSection = navSections.find(s => s.label === 'Utilities');
  if (utilitiesSection && permissionUser?.isLoggedIn) {
      let settingsPath = "/member/settings";
      if (isAdmin) settingsPath = "/admin/settings";
      else if (isCSR) settingsPath = "/csr/settings";
      else if (isFueler) settingsPath = "/fueler/settings";

      utilitiesSection.items.push({
          title: "Settings", href: settingsPath, icon: <Settings className="h-5 w-5" />, permissions: [], description: "Account and application settings"
      });
      utilitiesSection.items.push({
          title: mounted && theme === "dark" ? "Light Mode" : "Dark Mode", icon: mounted && theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />, onClick: () => setTheme(theme === "dark" ? "light" : "dark"), permissions: [], description: "Toggle light or dark theme"
      });
  }

  const isParentActive = (item: NavItem) => {
    if (!item.href) return false;
    return pathname.startsWith(item.href);
  }
  
  const isActive = (href: string) => pathname === href;

  const getUserRoleLabel = () => {
    if (!permissionUser) return "Guest";
    if (isAdmin) return "Admin";
    if (isCSR) return "CSR";
    if (isFueler) return "Fueler";
    if (isMember) return "Member";
    return "User";
  }

  const getDefaultDashboard = () => {
    if (isAdmin) return "/admin/dashboard";
    if (isCSR) return "/csr/dashboard";
    if (isFueler) return "/fueler/dashboard";
    if (isMember) return "/member/dashboard";
    return "/login";
  }

  return (
    <>
      <SidebarHeader>
        <Link href={getDefaultDashboard()} className="flex items-center gap-2 p-2">
          <Plane className="h-6 w-6 text-primary rotate-45" />
          {state === 'expanded' && <span className="text-xl font-bold">FBO LaunchPad</span>}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {navSections.map((section) => {
          const accessibleItems = permissionsLoading ? [] : section.items.filter(item => {
            const userRoles = permissionUser?.roles || [];
            let hasRequiredRole = true;
            if (item.requiredRoles && item.requiredRoles.length > 0) {
              hasRequiredRole = item.requiredRoles.some(requiredRole => userRoles.includes(requiredRole));
            }
            if (!hasRequiredRole) return false;

            if (item.permissions && item.permissions.length > 0) {
              return canAny(item.permissions);
            }
            return true;
          });

          if (accessibleItems.length === 0) return null;

          return (
            <SidebarGroup key={section.label} className="p-3">
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-1"> {/* Use smaller gap for tighter packing */}
                  {accessibleItems.map((item) => (
                    <SidebarMenuItem key={item.href || item.title}>
                      {/* === RENDER LOGIC FOR SUB-MENUS === */}
                      {item.subItems && item.subItems.length > 0 && item.href ? (
                        <>
                          <SidebarMenuButton
                            onClick={() => handleSubMenuToggle(item.href!)}
                            isActive={isParentActive(item)}
                            className="justify-between"
                          >
                            <div className="flex items-center gap-2">
                              {item.icon}
                              <span>{item.title}</span>
                            </div>
                            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${openSubMenus.includes(item.href) ? 'rotate-180' : ''}`} />
                          </SidebarMenuButton>

                          {openSubMenus.includes(item.href) && (
                            <SidebarMenuSub>
                              {item.subItems.map(subItem => (
                                <SidebarMenuSubItem key={subItem.href}>
                                  <Link href={subItem.href!} legacyBehavior passHref>
                                    <SidebarMenuSubButton isActive={isActive(subItem.href!)}>
                                      <span>{subItem.title}</span>
                                    </SidebarMenuSubButton>
                                  </Link>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          )}
                        </>
                      ) : (
                        // === RENDER LOGIC FOR REGULAR ITEMS ===
                        <SidebarMenuButton
                          asChild={!!item.href}
                          onClick={item.onClick}
                          isActive={item.href ? isActive(item.href) : false}
                          tooltip={state === 'collapsed' ? `${item.title}${item.description ? ` - ${item.description}` : ''}` : undefined}
                        >
                          {item.href ? (
                            <Link href={item.href}>
                              {item.icon}
                              <span>{item.title}</span>
                            </Link>
                          ) : (
                            <>
                              {item.icon}
                              <span>{item.title}</span>
                            </>
                          )}
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
        
        {permissionsLoading && (
          <div className="p-4"><div className="text-xs text-muted-foreground">Loading...</div></div>
        )}
      </SidebarContent>

      <SidebarFooter>
        {/* ... Footer remains the same ... */}
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
                  <span className="truncate text-xs text-muted-foreground">{getUserRoleLabel()}</span>
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