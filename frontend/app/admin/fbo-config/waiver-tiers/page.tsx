'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  getWaiverTiers,
  createWaiverTier,
  updateWaiverTier,
  deleteWaiverTier,
  getFeeRules,
  WaiverTier,
  FeeRule,
  CreateWaiverTierRequest,
  UpdateWaiverTierRequest
} from '../../../services/admin-fee-config-service'

export default function WaiverTiersPage() {
  const [tiers, setTiers] = useState<WaiverTier[]>([])
  const [feeRules, setFeeRules] = useState<FeeRule[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTier, setEditingTier] = useState<WaiverTier | null>(null)

  // TODO: Get actual FBO ID from user context
  const fboId = 1

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [tiersData, rulesData] = await Promise.all([
        getWaiverTiers(fboId),
        getFeeRules(fboId)
      ])
      setTiers(tiersData)
      setFeeRules(rulesData)
    } catch (error: any) {
      toast.error(`Failed to load data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTier = () => {
    setEditingTier(null)
    setIsFormOpen(true)
  }

  const handleEditTier = (tier: WaiverTier) => {
    setEditingTier(tier)
    setIsFormOpen(true)
  }

  const handleDeleteTier = async (tier: WaiverTier) => {
    if (!confirm(`Are you sure you want to delete waiver tier "${tier.tier_name}"?`)) {
      return
    }

    try {
      await deleteWaiverTier(fboId, tier.id)
      toast.success('Waiver tier deleted successfully')
      setTiers(tiers.filter(t => t.id !== tier.id))
    } catch (error: any) {
      toast.error(`Failed to delete waiver tier: ${error.message}`)
    }
  }

  const handleFormSubmit = async (data: CreateWaiverTierRequest | UpdateWaiverTierRequest) => {
    try {
      if (editingTier) {
        const updated = await updateWaiverTier(fboId, editingTier.id, data as UpdateWaiverTierRequest)
        setTiers(tiers.map(t => t.id === editingTier.id ? updated : t))
        toast.success('Waiver tier updated successfully')
      } else {
        const created = await createWaiverTier(fboId, data as CreateWaiverTierRequest)
        setTiers([...tiers, created])
        toast.success('Waiver tier created successfully')
      }
      setIsFormOpen(false)
      setEditingTier(null)
    } catch (error: any) {
      toast.error(`Failed to save waiver tier: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading waiver tiers...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Waiver Tiers</h1>
        <p className="text-gray-600">
          Configure waiver tier strategies for fuel purchases and fee discounts.
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={handleCreateTier}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Add New Waiver Tier
        </button>
      </div>

      {/* Tiers Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Tier Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Min Fuel (Gallons)</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Discount %</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Applied Rules</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tiers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No waiver tiers found. Create your first tier to get started.
                </td>
              </tr>
            ) : (
              tiers.map((tier) => (
                <tr key={tier.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{tier.tier_name}</td>
                  <td className="px-4 py-3">{tier.minimum_fuel_gallons || 'N/A'}</td>
                  <td className="px-4 py-3">{tier.discount_percentage || 'N/A'}%</td>
                  <td className="px-4 py-3">
                    {tier.applies_to_fee_rule_ids.length} rule(s)
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => handleEditTier(tier)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTier(tier)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isFormOpen && (
        <WaiverTierForm
          tier={editingTier}
          feeRules={feeRules}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsFormOpen(false)
            setEditingTier(null)
          }}
        />
      )}
    </div>
  )
}

// Simple form component for waiver tiers
interface WaiverTierFormProps {
  tier?: WaiverTier | null
  feeRules: FeeRule[]
  onSubmit: (data: CreateWaiverTierRequest | UpdateWaiverTierRequest) => void
  onCancel: () => void
}

function WaiverTierForm({ tier, feeRules, onSubmit, onCancel }: WaiverTierFormProps) {
  const [formData, setFormData] = useState({
    tier_name: tier?.tier_name || '',
    minimum_fuel_gallons: tier?.minimum_fuel_gallons || 0,
    discount_percentage: tier?.discount_percentage || 0,
    applies_to_fee_rule_ids: tier?.applies_to_fee_rule_ids || []
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-4">
          {tier ? 'Edit Waiver Tier' : 'Create Waiver Tier'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tier Name
            </label>
            <input
              type="text"
              value={formData.tier_name}
              onChange={(e) => setFormData(prev => ({ ...prev, tier_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., Gold Tier"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Fuel (Gallons)
              </label>
              <input
                type="number"
                min="0"
                value={formData.minimum_fuel_gallons}
                onChange={(e) => setFormData(prev => ({ ...prev, minimum_fuel_gallons: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Discount Percentage
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.discount_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_percentage: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Applied Fee Rules
            </label>
            <div className="border border-gray-300 rounded-md p-2 max-h-32 overflow-y-auto">
              {feeRules.map(rule => (
                <label key={rule.id} className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={formData.applies_to_fee_rule_ids.includes(rule.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          applies_to_fee_rule_ids: [...prev.applies_to_fee_rule_ids, rule.id]
                        }))
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          applies_to_fee_rule_ids: prev.applies_to_fee_rule_ids.filter(id => id !== rule.id)
                        }))
                      }
                    }}
                    className="mr-2"
                  />
                  {rule.fee_name} ({rule.fee_code})
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {tier ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 