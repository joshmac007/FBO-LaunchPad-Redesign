"use client"

import React, { Component, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo)
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset)
      }
      
      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Something went wrong</span>
          </div>
          <p className="mt-2 text-sm text-red-600">
            {this.state.error.message || "An unexpected error occurred."}
          </p>
          <Button
            onClick={this.reset}
            variant="outline"
            size="sm"
            className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Try Again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

interface OptimisticErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
  className?: string
}

function OptimisticErrorFallback({ 
  error, 
  resetErrorBoundary,
  className 
}: OptimisticErrorFallbackProps) {
  return (
    <div className={cn("p-4 border border-red-200 rounded-lg bg-red-50", className)}>
      <div className="flex items-center gap-2 text-red-700">
        <AlertCircle className="w-4 h-4" />
        <span className="font-medium">Update Failed</span>
      </div>
      <p className="mt-2 text-sm text-red-600">
        {error.message || "An unexpected error occurred while updating. Please try again."}
      </p>
      <Button
        onClick={resetErrorBoundary}
        variant="outline"
        size="sm"
        className="mt-3 border-red-300 text-red-700 hover:bg-red-100"
      >
        <RefreshCw className="w-3 h-3 mr-1" />
        Try Again
      </Button>
    </div>
  )
}

interface OptimisticErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<OptimisticErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  className?: string
}

export function OptimisticErrorBoundary({ 
  children, 
  fallback: Fallback = OptimisticErrorFallback,
  onError,
  className
}: OptimisticErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <Fallback error={error} resetErrorBoundary={reset} className={className} />
      )}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  )
}

// Specialized error boundary for table cells
interface TableCellErrorBoundaryProps {
  children: React.ReactNode
  onError?: (error: Error) => void
}

export function TableCellErrorBoundary({ 
  children, 
  onError 
}: TableCellErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div className="flex items-center gap-1 text-red-600 text-xs">
          <AlertCircle className="w-3 h-3" />
          <span>Error</span>
          <Button
            onClick={reset}
            variant="ghost"
            size="sm"
            className="h-4 px-1 text-xs"
          >
            Retry
          </Button>
        </div>
      )}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  )
}