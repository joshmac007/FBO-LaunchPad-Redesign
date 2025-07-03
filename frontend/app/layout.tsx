import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Montserrat } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import StagewiseToolbarWrapper from "@/components/stagewise-toolbar"
import { PermissionProvider } from "@/app/contexts/permission-context"
import { UserPreferencesProviderWrapper } from "@/app/providers/user-preferences-provider"
import { QueryProvider } from "@/app/providers/query-provider"

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: "FBO LaunchPad",
  description: "Aviation fuel management platform",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={montserrat.className} suppressHydrationWarning={true}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <QueryProvider>
            <PermissionProvider>
              <UserPreferencesProviderWrapper>
                {children}
              </UserPreferencesProviderWrapper>
            </PermissionProvider>
          </QueryProvider>
          <Toaster />
          <StagewiseToolbarWrapper />
        </ThemeProvider>
      </body>
    </html>
  )
}
