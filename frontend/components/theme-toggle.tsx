"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch by only rendering after mount
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="h-9 w-9 rounded-md border border-[#DEE2E6] dark:border-[#2D3339] p-2 flex items-center justify-center">
        <span className="sr-only">Toggle theme</span>
        <Sun className="h-4 w-4 text-[#525F7F]" />
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-9 w-9 rounded-md border border-[#DEE2E6] dark:border-[#2D3339] bg-white dark:bg-[#252A2E] p-2 flex items-center justify-center shadow-sm"
    >
      <span className="sr-only">Toggle theme</span>
      {theme === "dark" ? <Sun className="h-4 w-4 text-[#2A628F]" /> : <Moon className="h-4 w-4 text-[#2A628F]" />}
    </button>
  )
}
