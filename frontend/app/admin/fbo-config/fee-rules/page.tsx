'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  getFeeRules,
  createFeeRule,
  updateFeeRule,
  deleteFeeRule,
  getFeeCategories,
  FeeRule,
  FeeCategory,
  CreateFeeRuleRequest,
  UpdateFeeRuleRequest
} from '../../../services/admin-fee-config-service'

// Main component for managing fee rules
export default function FeeRulesPage() {
  const [rules, setRules] = useState<FeeRule[]>([])
  const [categories, setCategories] = useState<FeeCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<FeeRule | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [ruleToDelete, setRuleToDelete] = useState<FeeRule | null>(null)

  // TODO: Get actual FBO ID from user context
  const fboId = 1

  // Load rules and categories on component mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [rulesData, categoriesData] = await Promise.all([
        getFeeRules(fboId),
        getFeeCategories(fboId)
      ])
      setRules(rulesData)
      setCategories(categoriesData)
    } catch (error: any) {
      toast.error(`Failed to load data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRule = () => {
    setEditingRule(null)
    setIsFormOpen(true)
  }

  const handleEditRule = (rule: FeeRule) => {
    setEditingRule(rule)
    setIsFormOpen(true)
  }

  const handleDeleteRule = (rule: FeeRule) => {
    setRuleToDelete(rule)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!ruleToDelete) return

    try {
      await deleteFeeRule(fboId, ruleToDelete.id)
      toast.success('Fee rule deleted successfully')
      setRules(rules.filter(r => r.id !== ruleToDelete.id))
    } catch (error: any) {
      toast.error(`Failed to delete fee rule: ${error.message}`)
    } finally {
      setIsDeleteDialogOpen(false)
      setRuleToDelete(null)
    }
  }

  const handleFormSubmit = async (data: CreateFeeRuleRequest | UpdateFeeRuleRequest) => {
    try {
      if (editingRule) {
        // Update existing rule
        const updated = await updateFeeRule(fboId, editingRule.id, data as UpdateFeeRuleRequest)
        setRules(rules.map(r => r.id === editingRule.id ? updated : r))
        toast.success('Fee rule updated successfully')
      } else {
        // Create new rule
        const created = await createFeeRule(fboId, data as CreateFeeRuleRequest)
        setRules([...rules, created])
        toast.success('Fee rule created successfully')
      }
      setIsFormOpen(false)
      setEditingRule(null)
    } catch (error: any) {
      if (error.status === 409) {
        toast.error('Fee code already exists')
      } else if (error.status === 400) {
        toast.error('Invalid fee rule data')
      } else {
        toast.error(`Failed to save fee rule: ${error.message}`)
      }
    }
  }

  const handleFormCancel = () => {
    setIsFormOpen(false)
    setEditingRule(null)
  }

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.name || 'Unknown Category'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading fee rules...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Fee Rules</h1>
        <p className="text-gray-600">
          Configure fee rules for different services and aircraft categories. Set up CAA overrides where needed.
        </p>
      </div>

      <div className="mb-6">
        <button
          data-testid="add-rule-button"
          onClick={handleCreateRule}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Add New Fee Rule
        </button>
      </div>

      <FeeRuleList
        rules={rules}
        getCategoryName={getCategoryName}
        onEdit={handleEditRule}
        onDelete={handleDeleteRule}
      />

      {isFormOpen && (
        <FeeRuleForm
          rule={editingRule}
          categories={categories}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}

      {isDeleteDialogOpen && ruleToDelete && (
        <DeleteConfirmationDialog
          rule={ruleToDelete}
          onConfirm={confirmDelete}
          onCancel={() => {
            setIsDeleteDialogOpen(false)
            setRuleToDelete(null)
          }}
        />
      )}
    </div>
  )
}

// Component for displaying the list of fee rules
interface FeeRuleListProps {
  rules: FeeRule[]
  getCategoryName: (categoryId: number) => string
  onEdit: (rule: FeeRule) => void
  onDelete: (rule: FeeRule) => void
}

function FeeRuleList({ rules, getCategoryName, onEdit, onDelete }: FeeRuleListProps) {
  if (rules.length === 0) {
    return (
      <div data-testid="fee-rule-list" className="border rounded-lg p-8 text-center">
        <p className="text-gray-500">No fee rules found. Create your first rule to get started.</p>
      </div>
    )
  }

  return (
    <div data-testid="fee-rule-list" className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Fee Name</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Code</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Category</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Amount</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Basis</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">CAA Override</th>
            <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rules.map((rule) => (
            <tr key={rule.id} data-testid="rule-item" className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <span data-testid="rule-name" className="font-medium">
                  {rule.fee_name}
                </span>
              </td>
              <td className="px-4 py-3">
                <span data-testid="rule-code" className="font-mono text-sm">
                  {rule.fee_code}
                </span>
              </td>
              <td className="px-4 py-3">
                <span data-testid="rule-category">
                  {getCategoryName(rule.applies_to_fee_category_id)}
                </span>
              </td>
              <td className="px-4 py-3">
                <span data-testid="rule-amount">
                  ${rule.amount.toFixed(2)}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="text-sm">
                  {rule.calculation_basis.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`text-sm ${rule.has_caa_override ? 'text-orange-600' : 'text-gray-500'}`}>
                  {rule.has_caa_override ? 'Yes' : 'No'}
                </span>
              </td>
              <td className="px-4 py-3 text-right space-x-2">
                <button
                  data-testid="edit-button"
                  onClick={() => onEdit(rule)}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Edit
                </button>
                <button
                  data-testid="delete-button"
                  onClick={() => onDelete(rule)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Component for creating/editing fee rules
interface FeeRuleFormProps {
  rule?: FeeRule | null
  categories: FeeCategory[]
  onSubmit: (data: CreateFeeRuleRequest | UpdateFeeRuleRequest) => void
  onCancel: () => void
}

function FeeRuleForm({ rule, categories, onSubmit, onCancel }: FeeRuleFormProps) {
  const [formData, setFormData] = useState({
    fee_name: rule?.fee_name || '',
    fee_code: rule?.fee_code || '',
    applies_to_fee_category_id: rule?.applies_to_fee_category_id || (categories[0]?.id || 0),
    amount: rule?.amount || 0,
    calculation_basis: rule?.calculation_basis || 'PER_GALLON' as const,
    waiver_strategy: rule?.waiver_strategy || 'NO_WAIVER' as const,
    has_caa_override: rule?.has_caa_override || false,
    caa_override_amount: rule?.caa_override_amount || 0,
    caa_override_calculation_basis: rule?.caa_override_calculation_basis || 'PER_GALLON' as const,
    caa_override_waiver_strategy: rule?.caa_override_waiver_strategy || 'NO_WAIVER' as const,
    multiplier: rule?.multiplier || 1
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.fee_name.trim()) {
      newErrors.fee_name = 'Fee name is required'
    }
    if (!formData.fee_code.trim()) {
      newErrors.fee_code = 'Fee code is required'
    }
    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0'
    }
    if (!formData.applies_to_fee_category_id) {
      newErrors.applies_to_fee_category_id = 'Category is required'
    }

    // CAA override validation
    if (formData.has_caa_override && formData.caa_override_amount <= 0) {
      newErrors.caa_override_amount = 'CAA override amount must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const submitData = {
      ...formData,
      fee_name: formData.fee_name.trim(),
      fee_code: formData.fee_code.trim().toUpperCase(),
      // Only include CAA override fields if enabled
      ...(formData.has_caa_override ? {
        caa_override_amount: formData.caa_override_amount,
        caa_override_calculation_basis: formData.caa_override_calculation_basis,
        caa_override_waiver_strategy: formData.caa_override_waiver_strategy
      } : {})
    }

    onSubmit(submitData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div data-testid="rule-form-dialog" className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">
          {rule ? 'Edit Fee Rule' : 'Create Fee Rule'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fee Name
              </label>
              <input
                data-testid="fee-name-input"
                type="text"
                value={formData.fee_name}
                onChange={(e) => handleInputChange('fee_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.fee_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Ramp Fee"
              />
              {errors.fee_name && (
                <p className="text-red-500 text-sm mt-1">{errors.fee_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fee Code
              </label>
              <input
                data-testid="fee-code-input"
                type="text"
                value={formData.fee_code}
                onChange={(e) => handleInputChange('fee_code', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.fee_code ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., RAMP"
              />
              {errors.fee_code && (
                <p className="text-red-500 text-sm mt-1">{errors.fee_code}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fee Category
              </label>
              <select
                data-testid="category-select"
                value={formData.applies_to_fee_category_id}
                onChange={(e) => handleInputChange('applies_to_fee_category_id', parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.applies_to_fee_category_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.applies_to_fee_category_id && (
                <p className="text-red-500 text-sm mt-1">{errors.applies_to_fee_category_id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                data-testid="amount-input"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.amount ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calculation Basis
              </label>
              <select
                data-testid="calculation-basis-select"
                value={formData.calculation_basis}
                onChange={(e) => handleInputChange('calculation_basis', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="PER_GALLON">Per Gallon</option>
                <option value="FIXED_PRICE">Fixed Price</option>
                <option value="PER_UNIT_SERVICE">Per Unit Service</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Waiver Strategy
              </label>
              <select
                data-testid="waiver-strategy-select"
                value={formData.waiver_strategy}
                onChange={(e) => handleInputChange('waiver_strategy', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="NO_WAIVER">No Waiver</option>
                <option value="MINIMUM_FUEL">Minimum Fuel</option>
                <option value="PERCENTAGE_DISCOUNT">Percentage Discount</option>
                <option value="TIERED_DISCOUNT">Tiered Discount</option>
              </select>
            </div>
          </div>

          {/* CAA Override Section */}
          <div className="mb-4">
            <label className="flex items-center">
              <input
                data-testid="caa-override-checkbox"
                type="checkbox"
                checked={formData.has_caa_override}
                onChange={(e) => handleInputChange('has_caa_override', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Enable CAA Override</span>
            </label>
          </div>

          {formData.has_caa_override && (
            <div data-testid="caa-override-section" className="border border-orange-200 rounded-md p-4 mb-4 bg-orange-50">
              <h3 className="text-sm font-medium text-orange-800 mb-3">CAA Override Settings</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Override Amount
                  </label>
                  <input
                    data-testid="caa-override-amount-input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.caa_override_amount}
                    onChange={(e) => handleInputChange('caa_override_amount', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border rounded-md ${
                      errors.caa_override_amount ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.caa_override_amount && (
                    <p className="text-red-500 text-sm mt-1">{errors.caa_override_amount}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Override Calculation Basis
                  </label>
                  <select
                    data-testid="caa-override-calculation-basis-select"
                    value={formData.caa_override_calculation_basis}
                    onChange={(e) => handleInputChange('caa_override_calculation_basis', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="PER_GALLON">Per Gallon</option>
                    <option value="FIXED_PRICE">Fixed Price</option>
                    <option value="PER_UNIT_SERVICE">Per Unit Service</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Override Waiver Strategy
                </label>
                <select
                  data-testid="caa-override-waiver-strategy-select"
                  value={formData.caa_override_waiver_strategy}
                  onChange={(e) => handleInputChange('caa_override_waiver_strategy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="NO_WAIVER">No Waiver</option>
                  <option value="MINIMUM_FUEL">Minimum Fuel</option>
                  <option value="PERCENTAGE_DISCOUNT">Percentage Discount</option>
                  <option value="TIERED_DISCOUNT">Tiered Discount</option>
                </select>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              data-testid="save-rule-button"
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {rule ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Component for delete confirmation dialog
interface DeleteConfirmationDialogProps {
  rule: FeeRule
  onConfirm: () => void
  onCancel: () => void
}

function DeleteConfirmationDialog({ rule, onConfirm, onCancel }: DeleteConfirmationDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div data-testid="confirm-delete-dialog" className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-4">Delete Fee Rule</h2>
        
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete the fee rule &quot;{rule.fee_name}&quot; ({rule.fee_code})? 
          This action cannot be undone.
        </p>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            data-testid="confirm-delete-button"
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
} 