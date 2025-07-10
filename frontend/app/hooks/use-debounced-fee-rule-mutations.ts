import { useCallback, useRef } from 'react'
import { useFeeRuleFieldUpdate } from './use-fee-rule-mutations'
import type { UpdateFeeRuleRequest } from '@/app/services/admin-fee-config-service'

interface DebouncedUpdate {
  id: number
  field: keyof UpdateFeeRuleRequest
  value: any
  timeoutId: NodeJS.Timeout
}

export function useDebouncedFeeRuleFieldUpdate(delay: number = 500) {
  const { updateField, isPending, error, isSuccess, mutate } = useFeeRuleFieldUpdate()
  const pendingUpdatesRef = useRef<Map<string, DebouncedUpdate>>(new Map())

  const debouncedUpdateField = useCallback(
    (id: number, field: keyof UpdateFeeRuleRequest, value: any) => {
      const updateKey = `${id}-${field}`
      
      // Clear existing timeout for this field
      const existingUpdate = pendingUpdatesRef.current.get(updateKey)
      if (existingUpdate) {
        clearTimeout(existingUpdate.timeoutId)
      }
      
      // Set new timeout
      const timeoutId = setTimeout(() => {
        updateField(id, field, value)
        pendingUpdatesRef.current.delete(updateKey)
      }, delay)
      
      // Store the update
      pendingUpdatesRef.current.set(updateKey, {
        id,
        field,
        value,
        timeoutId
      })
    },
    [updateField, delay]
  )

  const flushPendingUpdates = useCallback(() => {
    pendingUpdatesRef.current.forEach((update) => {
      clearTimeout(update.timeoutId)
      updateField(update.id, update.field, update.value)
    })
    pendingUpdatesRef.current.clear()
  }, [updateField])

  const cancelPendingUpdates = useCallback(() => {
    pendingUpdatesRef.current.forEach((update) => {
      clearTimeout(update.timeoutId)
    })
    pendingUpdatesRef.current.clear()
  }, [])

  const hasPendingUpdates = pendingUpdatesRef.current.size > 0

  return {
    debouncedUpdateField,
    flushPendingUpdates,
    cancelPendingUpdates,
    hasPendingUpdates,
    isPending,
    error,
    isSuccess,
    mutate
  }
}