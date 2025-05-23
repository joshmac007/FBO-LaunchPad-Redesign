// Utility functions for the application

// Check if we're in offline mode
export function isOfflineMode(): boolean {
  // Always return true for preview environment
  return true
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

// Format date
export function formatDate(date: string | Date): string {
  if (!date) return ""

  const dateObj = typeof date === "string" ? new Date(date) : date
  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// Format time
export function formatTime(date: string | Date): string {
  if (!date) return ""

  const dateObj = typeof date === "string" ? new Date(date) : date
  return dateObj.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Format date and time
export function formatDateTime(date: string | Date): string {
  if (!date) return ""

  return `${formatDate(date)} ${formatTime(date)}`
}
