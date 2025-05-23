"use client"

import { motion } from "framer-motion"
import { Plane, Receipt } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function ReceiptsLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container flex h-16 items-center px-4 justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-[#2A628F] rotate-45" />
            <span className="text-xl font-bold text-[#3A4356] dark:text-[#F8FAFC]">FBO LaunchPad</span>
            <Badge variant="secondary" className="bg-[#2A628F]/10 text-[#2A628F] ml-2">
              CSR
            </Badge>
          </div>
        </div>
      </header>

      <main className="container px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col gap-6 max-w-7xl mx-auto">
          {/* Loading Animation */}
          <motion.div
            className="flex flex-col items-center justify-center py-20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="flex items-center gap-3 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="p-3 bg-[#2A628F]/10 rounded-lg">
                <Receipt className="h-8 w-8 text-[#2A628F]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#3A4356] dark:text-[#F8FAFC]">Loading Receipts</h2>
                <p className="text-[#3A4356] dark:text-[#CBD5E0]">Please wait while we fetch your data...</p>
              </div>
            </motion.div>

            <motion.div
              className="h-8 w-8 border-4 border-[#2A628F] border-t-transparent rounded-full"
              animate={{
                rotate: 360,
                transition: {
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 1,
                  ease: "linear",
                },
              }}
            />

            {/* Loading Skeleton */}
            <motion.div
              className="w-full max-w-4xl mt-12 space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              {/* Statistics Cards Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>

              {/* Search Bar Skeleton */}
              <div className="h-12 bg-muted rounded-lg animate-pulse mb-4" />

              {/* Table Skeleton */}
              <div className="space-y-3">
                <div className="h-12 bg-muted rounded-lg animate-pulse" />
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
