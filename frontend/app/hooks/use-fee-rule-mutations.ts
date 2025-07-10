import { useOptimisticMutation } from './use-optimistic-mutation'
import { 
  updateFeeRule, 
  type FeeRule, 
  type UpdateFeeRuleRequest 
} from '@/app/services/admin-fee-config-service'

export function useFeeRuleOptimisticUpdate() {
  return useOptimisticMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateFeeRuleRequest }) =>
      updateFeeRule(id, data),
    queryKey: ['fee-rules'],
    updateFn: (oldData: FeeRule[], { id, data }) => {
      if (!oldData) return oldData
      
      return oldData.map((feeRule) =>
        feeRule.id === id ? { ...feeRule, ...data } : feeRule
      )
    },
    successMessage: "Fee rule updated successfully",
    errorMessage: "Failed to update fee rule",
  })
}

// Hook for updating specific fee rule fields with type safety
export function useFeeRuleFieldUpdate() {
  const mutation = useFeeRuleOptimisticUpdate()
  
  const updateField = (id: number, field: keyof UpdateFeeRuleRequest, value: any) => {
    return mutation.mutate({
      id,
      data: { [field]: value } as UpdateFeeRuleRequest
    })
  }
  
  return {
    updateField,
    isPending: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    mutate: mutation.mutate,
  }
}