"use client"

import { useState, useEffect } from 'react'

/**
 * Custom hook that debounces a value by delaying its update until the value has been stable for a specified delay.
 * Useful for preventing excessive re-renders during rapid input changes like search typing.
 * 
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set a timeout to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Clear the timeout if value changes before delay completes
    // This ensures only the latest value is used after the delay
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook for debouncing search inputs specifically
 * Provides additional utilities for search scenarios
 */
export function useSearchDebounce(searchTerm: string, delay: number = 300) {
  const debouncedSearchTerm = useDebounce(searchTerm, delay)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    // Set searching state when search term changes but debounced value hasn't updated yet
    setIsSearching(searchTerm !== debouncedSearchTerm && searchTerm.length > 0)
  }, [searchTerm, debouncedSearchTerm])

  return {
    debouncedSearchTerm,
    isSearching,
    hasSearchTerm: debouncedSearchTerm.length > 0,
  }
}