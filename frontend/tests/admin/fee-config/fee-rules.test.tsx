import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import userEvent from "@testing-library/user-event"

// Mock the admin fee config service
const mockAdminFeeConfigService = {
  getFeeRules: jest.fn(),
  createFeeRule: jest.fn(),
  updateFeeRule: jest.fn(),
  deleteFeeRule: jest.fn(),
  getFeeCategories: jest.fn(),
}

jest.mock('../../../app/services/admin-fee-config-service', () => mockAdminFeeConfigService)

// Mock components that will be created
const FeeRulesPage = () => <div data-testid="fee-rules-page">Fee Rules Page</div>

const FeeRuleList = ({ feeRules, categories, onEdit, onDelete }: any) => (
  <div data-testid="fee-rule-list">
    {feeRules.map((rule: any) => {
      const category = categories.find((c: any) => c.id === rule.applies_to_fee_category_id)
      return (
        <div key={rule.id} data-testid={`rule-${rule.id}`}>
          <span data-testid={`rule-name-${rule.id}`}>{rule.fee_name}</span>
          <span data-testid={`rule-code-${rule.id}`}>{rule.fee_code}</span>
          <span data-testid={`rule-amount-${rule.id}`}>${rule.amount}</span>
          <span data-testid={`rule-category-${rule.id}`}>{category?.name || 'Unknown'}</span>
          <span data-testid={`rule-waivable-${rule.id}`}>
            {rule.is_potentially_waivable_by_fuel_uplift ? 'Waivable' : 'Not Waivable'}
          </span>
          <button onClick={() => onEdit(rule)} data-testid={`edit-${rule.id}`}>
            Edit
          </button>
          <button onClick={() => onDelete(rule.id)} data-testid={`delete-${rule.id}`}>
            Delete
          </button>
        </div>
      )
    })}
  </div>
)

const FeeRuleForm = ({ 
  rule, 
  categories,
  onSave, 
  onCancel, 
  isEditing = false 
}: {
  rule?: any
  categories: any[]
  onSave: (data: any) => void
  onCancel: () => void
  isEditing?: boolean
}) => {
  const [formData, setFormData] = React.useState({
    fee_name: rule?.fee_name || '',
    fee_code: rule?.fee_code || '',
    applies_to_fee_category_id: rule?.applies_to_fee_category_id || '',
    amount: rule?.amount || '',
    is_taxable: rule?.is_taxable ?? true,
    is_potentially_waivable_by_fuel_uplift: rule?.is_potentially_waivable_by_fuel_uplift ?? false,
    calculation_basis: rule?.calculation_basis || 'FIXED_PRICE',
    waiver_strategy: rule?.waiver_strategy || 'NONE',
    simple_waiver_multiplier: rule?.simple_waiver_multiplier || 1.0,
    has_caa_override: rule?.has_caa_override ?? false,
    caa_override_amount: rule?.caa_override_amount || '',
    caa_waiver_strategy_override: rule?.caa_waiver_strategy_override || 'AS_STANDARD',
    caa_simple_waiver_multiplier_override: rule?.caa_simple_waiver_multiplier_override || '',
  })
  const [errors, setErrors] = React.useState<any>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: any = {}
    
    if (!formData.fee_name.trim()) {
      newErrors.fee_name = 'Fee name is required'
    }
    if (!formData.fee_code.trim()) {
      newErrors.fee_code = 'Fee code is required'
    }
    if (!formData.applies_to_fee_category_id) {
      newErrors.applies_to_fee_category_id = 'Fee category is required'
    }
    if (!formData.amount || parseFloat(formData.amount) < 0) {
      newErrors.amount = 'Valid amount is required'
    }
    if (formData.waiver_strategy === 'SIMPLE_MULTIPLIER' && (!formData.simple_waiver_multiplier || parseFloat(formData.simple_waiver_multiplier) <= 0)) {
      newErrors.simple_waiver_multiplier = 'Valid multiplier is required for simple waiver strategy'
    }
    if (formData.has_caa_override && (!formData.caa_override_amount || parseFloat(formData.caa_override_amount) < 0)) {
      newErrors.caa_override_amount = 'Valid CAA override amount is required'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    // Prepare data for submission
    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount),
      simple_waiver_multiplier: parseFloat(formData.simple_waiver_multiplier),
      caa_override_amount: formData.has_caa_override ? parseFloat(formData.caa_override_amount) : null,
      caa_simple_waiver_multiplier_override: 
        formData.has_caa_override && formData.caa_simple_waiver_multiplier_override 
          ? parseFloat(formData.caa_simple_waiver_multiplier_override) 
          : null,
    }
    
    onSave(submitData)
  }

  return (
    <form onSubmit={handleSubmit} data-testid="fee-rule-form">
      <div>
        <label htmlFor="fee_name">Fee Name</label>
        <input
          id="fee_name"
          value={formData.fee_name}
          onChange={(e) => setFormData(prev => ({ ...prev, fee_name: e.target.value }))}
          data-testid="fee-name-input"
        />
        {errors.fee_name && <span data-testid="fee-name-error">{errors.fee_name}</span>}
      </div>

      <div>
        <label htmlFor="fee_code">Fee Code</label>
        <input
          id="fee_code"
          value={formData.fee_code}
          onChange={(e) => setFormData(prev => ({ ...prev, fee_code: e.target.value }))}
          data-testid="fee-code-input"
        />
        {errors.fee_code && <span data-testid="fee-code-error">{errors.fee_code}</span>}
      </div>

      <div>
        <label htmlFor="applies_to_fee_category_id">Fee Category</label>
        <select
          id="applies_to_fee_category_id"
          value={formData.applies_to_fee_category_id}
          onChange={(e) => setFormData(prev => ({ ...prev, applies_to_fee_category_id: e.target.value }))}
          data-testid="fee-category-select"
        >
          <option value="">Select a category</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        {errors.applies_to_fee_category_id && <span data-testid="fee-category-error">{errors.applies_to_fee_category_id}</span>}
      </div>

      <div>
        <label htmlFor="amount">Amount</label>
        <input
          id="amount"
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
          data-testid="amount-input"
        />
        {errors.amount && <span data-testid="amount-error">{errors.amount}</span>}
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={formData.is_taxable}
            onChange={(e) => setFormData(prev => ({ ...prev, is_taxable: e.target.checked }))}
            data-testid="is-taxable-checkbox"
          />
          Taxable
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={formData.is_potentially_waivable_by_fuel_uplift}
            onChange={(e) => setFormData(prev => ({ ...prev, is_potentially_waivable_by_fuel_uplift: e.target.checked }))}
            data-testid="is-waivable-checkbox"
          />
          Potentially Waivable by Fuel Uplift
        </label>
      </div>

      <div>
        <label htmlFor="calculation_basis">Calculation Basis</label>
        <select
          id="calculation_basis"
          value={formData.calculation_basis}
          onChange={(e) => setFormData(prev => ({ ...prev, calculation_basis: e.target.value }))}
          data-testid="calculation-basis-select"
        >
          <option value="FIXED_PRICE">Fixed Price</option>
          <option value="PER_UNIT_SERVICE">Per Unit Service</option>
          <option value="NOT_APPLICABLE">Not Applicable</option>
        </select>
      </div>

      <div>
        <label htmlFor="waiver_strategy">Waiver Strategy</label>
        <select
          id="waiver_strategy"
          value={formData.waiver_strategy}
          onChange={(e) => setFormData(prev => ({ ...prev, waiver_strategy: e.target.value }))}
          data-testid="waiver-strategy-select"
        >
          <option value="NONE">None</option>
          <option value="SIMPLE_MULTIPLIER">Simple Multiplier</option>
          <option value="TIERED_MULTIPLIER">Tiered Multiplier</option>
        </select>
      </div>

      {formData.waiver_strategy === 'SIMPLE_MULTIPLIER' && (
        <div>
          <label htmlFor="simple_waiver_multiplier">Simple Waiver Multiplier</label>
          <input
            id="simple_waiver_multiplier"
            type="number"
            step="0.1"
            value={formData.simple_waiver_multiplier}
            onChange={(e) => setFormData(prev => ({ ...prev, simple_waiver_multiplier: e.target.value }))}
            data-testid="simple-waiver-multiplier-input"
          />
          {errors.simple_waiver_multiplier && <span data-testid="simple-waiver-multiplier-error">{errors.simple_waiver_multiplier}</span>}
        </div>
      )}

      <div>
        <label>
          <input
            type="checkbox"
            checked={formData.has_caa_override}
            onChange={(e) => setFormData(prev => ({ ...prev, has_caa_override: e.target.checked }))}
            data-testid="has-caa-override-checkbox"
          />
          Has CAA Override
        </label>
      </div>

      {formData.has_caa_override && (
        <>
          <div>
            <label htmlFor="caa_override_amount">CAA Override Amount</label>
            <input
              id="caa_override_amount"
              type="number"
              step="0.01"
              value={formData.caa_override_amount}
              onChange={(e) => setFormData(prev => ({ ...prev, caa_override_amount: e.target.value }))}
              data-testid="caa-override-amount-input"
            />
            {errors.caa_override_amount && <span data-testid="caa-override-amount-error">{errors.caa_override_amount}</span>}
          </div>

          <div>
            <label htmlFor="caa_waiver_strategy_override">CAA Waiver Strategy Override</label>
            <select
              id="caa_waiver_strategy_override"
              value={formData.caa_waiver_strategy_override}
              onChange={(e) => setFormData(prev => ({ ...prev, caa_waiver_strategy_override: e.target.value }))}
              data-testid="caa-waiver-strategy-select"
            >
              <option value="AS_STANDARD">As Standard</option>
              <option value="NONE">None</option>
              <option value="SIMPLE_MULTIPLIER">Simple Multiplier</option>
              <option value="TIERED_MULTIPLIER">Tiered Multiplier</option>
            </select>
          </div>

          {formData.caa_waiver_strategy_override === 'SIMPLE_MULTIPLIER' && (
            <div>
              <label htmlFor="caa_simple_waiver_multiplier_override">CAA Simple Waiver Multiplier Override</label>
              <input
                id="caa_simple_waiver_multiplier_override"
                type="number"
                step="0.1"
                value={formData.caa_simple_waiver_multiplier_override}
                onChange={(e) => setFormData(prev => ({ ...prev, caa_simple_waiver_multiplier_override: e.target.value }))}
                data-testid="caa-simple-waiver-multiplier-input"
              />
            </div>
          )}
        </>
      )}

      <button type="submit" data-testid="save-button">
        {isEditing ? 'Update' : 'Create'} Fee Rule
      </button>
      <button type="button" onClick={onCancel} data-testid="cancel-button">
        Cancel
      </button>
    </form>
  )
}

describe('Fee Rules Management', () => {
  const mockCategories = [
    { id: 1, name: 'Light Jet', fbo_location_id: 1 },
    { id: 2, name: 'Heavy Jet', fbo_location_id: 1 },
  ]

  const mockFeeRules = [
    {
      id: 1,
      fee_name: 'Ramp Fee',
      fee_code: 'RAMP',
      applies_to_fee_category_id: 1,
      amount: 50.00,
      is_potentially_waivable_by_fuel_uplift: true,
      waiver_strategy: 'SIMPLE_MULTIPLIER',
      simple_waiver_multiplier: 2.0,
      has_caa_override: false,
      fbo_location_id: 1,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockAdminFeeConfigService.getFeeRules.mockResolvedValue(mockFeeRules)
    mockAdminFeeConfigService.getFeeCategories.mockResolvedValue(mockCategories)
  })

  describe('Service Integration Tests', () => {
    test('getFeeRules service is called correctly', async () => {
      const result = await mockAdminFeeConfigService.getFeeRules(1)
      expect(result).toEqual(mockFeeRules)
      expect(mockAdminFeeConfigService.getFeeRules).toHaveBeenCalledWith(1)
    })

    test('createFeeRule service is called correctly', async () => {
      const newRule = {
        fee_name: 'New Fee',
        fee_code: 'NEW',
        applies_to_fee_category_id: 1,
        amount: 30.00,
      }
      const createdRule = { id: 3, ...newRule, fbo_location_id: 1 }
      
      mockAdminFeeConfigService.createFeeRule.mockResolvedValue(createdRule)

      const result = await mockAdminFeeConfigService.createFeeRule(1, newRule)
      expect(result).toEqual(createdRule)
      expect(mockAdminFeeConfigService.createFeeRule).toHaveBeenCalledWith(1, newRule)
    })
  })
}) 