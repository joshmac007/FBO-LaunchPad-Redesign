import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { toast } from 'sonner'

interface OptimisticMutationOptions<TData, TVariables, TContext = unknown> {
  mutationFn: (variables: TVariables) => Promise<TData>
  queryKey: QueryKey
  updateFn: (oldData: any, variables: TVariables) => any
  successMessage?: string
  errorMessage?: string
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void
  onError?: (error: Error, variables: TVariables, context: TContext | undefined) => void
}

export function useOptimisticMutation<TData, TVariables, TContext = unknown>({
  mutationFn,
  queryKey,
  updateFn,
  successMessage,
  errorMessage,
  onSuccess,
  onError,
}: OptimisticMutationOptions<TData, TVariables, TContext>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey })
      
      // Snapshot the previous value
      const previousData = queryClient.getQueryData(queryKey)
      
      // Optimistically update to the new value
      queryClient.setQueryData(queryKey, (old: any) => updateFn(old, variables))
      
      // Return a context object with the snapshotted value
      return { previousData } as TContext
    },
    onError: (error, variables, context) => {
      // If the mutation fails, use the context to roll back
      if (context && typeof context === 'object' && context !== null && 'previousData' in context) {
        queryClient.setQueryData(queryKey, (context as any).previousData)
      }
      
      // Show error message
      if (errorMessage) {
        toast.error(errorMessage)
      } else {
        toast.error(`Operation failed: ${error.message}`)
      }
      
      // Call custom error handler
      onError?.(error, variables, context)
    },
    onSuccess: (data, variables, context) => {
      // Show success message
      if (successMessage) {
        toast.success(successMessage)
      }
      
      // Call custom success handler
      onSuccess?.(data, variables, context)
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey })
    },
  })
}