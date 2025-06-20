"use client"

import dynamic from "next/dynamic"

const StagewiseToolbar = dynamic(
  () => import("@stagewise/toolbar-next").then((mod) => mod.StagewiseToolbar),
  { ssr: false }
)

export default function StagewiseToolbarWrapper() {
  if (process.env.NODE_ENV !== "development") {
    return null
  }

  return <StagewiseToolbar config={{ plugins: [] }} />
} 