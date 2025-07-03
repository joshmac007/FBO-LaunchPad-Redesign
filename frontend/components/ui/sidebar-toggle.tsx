"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"

export function SidebarToggle({ className }: { className?: string }) {
  const { state, toggleSidebar } = useSidebar()

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "size-8 shrink-0 rounded-full border border-border/40 bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        "absolute top-3 -right-4 z-20",
        "transition-all duration-200",
        className
      )}
      onClick={() => toggleSidebar()}
      aria-label={state === "collapsed" ? "Expand sidebar" : "Collapse sidebar"}
    >
      {state === "collapsed" ? (
        <ChevronRight className="size-4" />
      ) : (
        <ChevronLeft className="size-4" />
      )}
    </Button>
  )
} 