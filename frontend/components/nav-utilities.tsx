"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export interface UtilityItem {
  title: string;
  icon: LucideIcon;
  url?: string;
  onClick?: () => void;
}

interface NavUtilitiesProps {
  items: UtilityItem[];
}

export function NavUtilities({ items }: NavUtilitiesProps) {
  const pathname = usePathname()

  return (
    // This className is key: it hides the section in icon-only mode
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Utilities</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild={!!item.url}
              onClick={item.onClick}
              isActive={item.url ? pathname === item.url : false}
            >
              {item.url ? (
                <Link href={item.url}>
                  <item.icon className="size-5" />
                  <span>{item.title}</span>
                </Link>
              ) : (
                <>
                  <item.icon className="size-5" />
                  <span>{item.title}</span>
                </>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
} 