"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plane, Home, FileText, Receipt, BarChart3, Settings, Shield, Sun, Moon, Droplet, CheckCircle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { usePermissions } from "@/hooks/usePermissions";

import { NavMain, type NavItem } from "@/components/nav-main";
import { NavUtilities, type UtilityItem } from "@/components/nav-utilities";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { SidebarToggle } from "@/components/ui/sidebar-toggle";

export default function AppSidebar() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const {
    user: permissionUser,
    canAny,
    isAdmin,
    isCSR,
    isFueler,
    isMember,
    loading: permissionsLoading,
  } = usePermissions();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("fboUser");
    router.push("/login");
  };

  // Memoize the navigation data to avoid re-computation on every render
  const { mainNavItems, utilityNavItems } = useMemo(() => {
    // Define all possible navigation items
    const allNavItems: (NavItem & { permissions: string[], requiredRoles: string[] })[] = [
      {
        title: "Administration",
        url: "/admin",
        icon: Shield,
        permissions: ['access_admin_dashboard'],
        requiredRoles: ['System Administrator'],
        subItems: [
          { title: "Dashboard", url: "/admin/dashboard" },
          { title: "User Management", url: "/admin/users" },
          { title: "LST Management", url: "/admin/lst-management" },
          { title: "Permissions", url: "/admin/permissions" },
          { title: "Fuel Trucks", url: "/admin/fuel-trucks" },
          { title: "Customers", url: "/admin/customers" },
          { title: "Aircraft", url: "/admin/aircraft" },
          { title: "Fee Management", url: "/admin/fbo-config/fee-management" },
          { title: "Fuel Pricing", url: "/admin/fbo-config/fuel-pricing" },
        ]
      },
      { title: "CSR Dashboard", url: "/csr/dashboard", icon: Home, permissions: ['access_csr_dashboard'], requiredRoles: ['Customer Service Representative', 'System Administrator'] },
      { title: "Fuel Orders", url: "/csr/fuel-orders", icon: FileText, permissions: ['view_all_orders', 'create_fuel_order'], requiredRoles: ['Customer Service Representative', 'System Administrator'] },
      { title: "Receipts", url: "/csr/receipts", icon: Receipt, permissions: ['view_receipts', 'create_receipt'], requiredRoles: ['Customer Service Representative', 'System Administrator'] },
      { title: "Export Data", url: "/csr/export", icon: BarChart3, permissions: ['export_order_data', 'view_order_statistics'], requiredRoles: ['Customer Service Representative', 'System Administrator'] },
      { title: "Fueler Dashboard", url: "/fueler/dashboard", icon: Droplet, permissions: ['access_fueler_dashboard'], requiredRoles: ['Line Service Technician', 'System Administrator'] },
      { title: "Completed Orders", url: "/fueler/completed", icon: CheckCircle, permissions: ['access_fueler_dashboard'], requiredRoles: ['Line Service Technician', 'System Administrator'] },
      { title: "Member Dashboard", url: "/member/dashboard", icon: Home, permissions: [], requiredRoles: ['Member', 'System Administrator'] },
    ];
    
    // Filter items based on permissions
    const accessibleMainNavItems = permissionsLoading ? [] : allNavItems.filter(item => {
      const userRoles = permissionUser?.roles || [];
      const hasRequiredRole = item.requiredRoles.length === 0 || item.requiredRoles.some(role => userRoles.includes(role));
      if (!hasRequiredRole) return false;
      return item.permissions.length === 0 || canAny(item.permissions);
    });

    // Define utility items
    const accessibleUtilityItems: UtilityItem[] = [];
    if (permissionUser?.isLoggedIn) {
        let settingsPath = "/member/settings";
        if (isAdmin) settingsPath = "/admin/settings";
        else if (isCSR) settingsPath = "/csr/settings";
        else if (isFueler) settingsPath = "/fueler/settings";

        accessibleUtilityItems.push({
            title: "Settings", url: settingsPath, icon: Settings
        });
        accessibleUtilityItems.push({
            title: mounted && theme === "dark" ? "Light Mode" : "Dark Mode", 
            icon: mounted && theme === "dark" ? Sun : Moon, 
            onClick: () => setTheme(theme === "dark" ? "light" : "dark")
        });
    }
    
    return { mainNavItems: accessibleMainNavItems, utilityNavItems: accessibleUtilityItems };

  }, [permissionsLoading, permissionUser, canAny, isAdmin, isCSR, isFueler, mounted, theme, setTheme]);

  const userForNav = {
    name: permissionUser?.name,
    email: permissionUser?.email,
    isLoggedIn: !!permissionUser?.isLoggedIn,
    roleLabel: (() => {
      if (!permissionUser) return "Guest";
      if (isAdmin) return "Admin";
      if (isCSR) return "CSR";
      if (isFueler) return "Fueler";
      if (isMember) return "Member";
      return "User";
    })(),
  };

  const getDefaultDashboard = () => {
    if (isAdmin) return "/admin/dashboard";
    if (isCSR) return "/csr/dashboard";
    if (isFueler) return "/fueler/dashboard";
    if (isMember) return "/member/dashboard";
    return "/login";
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="relative">
        <SidebarToggle />
        <Link href={getDefaultDashboard()} className="flex items-center gap-2 p-2">
          <Plane className="h-6 w-6 text-primary rotate-45" />
          <span className="text-xl font-bold group-data-[collapsible=icon]:hidden">
            FBO LaunchPad
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {permissionsLoading ? (
            <div className="p-4"><div className="text-xs text-muted-foreground">Loading...</div></div>
        ) : (
            <>
                <NavMain items={mainNavItems} />
                <NavUtilities items={utilityNavItems} />
            </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <NavUser user={userForNav} onLogout={handleLogout} />
      </SidebarFooter>
    </Sidebar>
  );
}