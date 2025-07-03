"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export const QueryProvider = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 15, // 15 minutes default - good for most data
            gcTime: 1000 * 60 * 30, // 30 minutes garbage collection
            retry: 2,
            refetchOnWindowFocus: false, // Prevent unnecessary refetches
            refetchOnMount: true, // Always refetch on mount for fresh data
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
} 