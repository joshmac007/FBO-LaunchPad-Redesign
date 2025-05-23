"use client"

import type React from "react"

import { useState } from "react"
import AppSidebar from "@/components/layout/app-sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function FuelerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        <AppSidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} userRole="fueler" />
        <main
          className={`flex-1 overflow-auto transition-all duration-300 ${
            sidebarCollapsed ? "ml-[80px]" : "ml-[280px]"
          }`}
        >
          <div className="p-6">{children}</div>
        </main>
      </div>
    </TooltipProvider>
  )
}
