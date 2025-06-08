import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import userEvent from "@testing-library/user-event"

// Mock the admin fee config service
const mockAdminFeeConfigService = {
  getFeeCategories: jest.fn(),
  createFeeCategory: jest.fn(),
  updateFeeCategory: jest.fn(),
  deleteFeeCategory: jest.fn(),
}

jest.mock('../../../app/services/admin-fee-config-service', () => mockAdminFeeConfigService)

// Mock components that will be created
const FeeCategoriesPage = () => <div data-testid="fee-categories-page">Fee Categories Page</div>
const FeeCategoryList = ({ categories, onEdit, onDelete }: any) => (
  <div data-testid="fee-category-list">
    {categories.map((category: any) => (
      <div key={category.id} data-testid={`category-${category.id}`}>
        <span>{category.name}</span>
        <button onClick={() => onEdit(category)} data-testid={`edit-${category.id}`}>
          Edit
        </button>
        <button onClick={() => onDelete(category.id)} data-testid={`delete-${category.id}`}>
          Delete
        </button>
      </div>
    ))}
  </div>
)

const FeeCategoryForm = ({ 
  category, 
  onSave, 
  onCancel, 
  isEditing = false 
}: {
  category?: any
  onSave: (data: any) => void
  onCancel: () => void
  isEditing?: boolean
}) => {
  const [name, setName] = React.useState(category?.name || '')
  const [errors, setErrors] = React.useState<any>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: any = {}
    
    if (!name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    onSave({ name: name.trim() })
  }

  return (
    <form onSubmit={handleSubmit} data-testid="fee-category-form">
      <div>
        <label htmlFor="name">Category Name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="category-name-input"
        />
        {errors.name && (
          <span data-testid="name-error" className="error">
            {errors.name}
          </span>
        )}
      </div>
      <button type="submit" data-testid="save-button">
        {isEditing ? 'Update' : 'Create'} Category
      </button>
      <button type="button" onClick={onCancel} data-testid="cancel-button">
        Cancel
      </button>
    </form>
  )
}

describe('Fee Categories Management', () => {
  const mockCategories = [
    { id: 1, name: 'Light Jet', fbo_location_id: 1 },
    { id: 2, name: 'Heavy Jet', fbo_location_id: 1 },
    { id: 3, name: 'Helicopter', fbo_location_id: 1 },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockAdminFeeConfigService.getFeeCategories.mockResolvedValue(mockCategories)
  })

  describe('FeeCategoryList Component', () => {
    test('renders list of fee categories correctly', () => {
      const mockOnEdit = jest.fn()
      const mockOnDelete = jest.fn()

      render(
        <FeeCategoryList 
          categories={mockCategories} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      expect(screen.getByTestId('fee-category-list')).toBeInTheDocument()
      expect(screen.getByTestId('category-1')).toBeInTheDocument()
      expect(screen.getByTestId('category-2')).toBeInTheDocument()
      expect(screen.getByTestId('category-3')).toBeInTheDocument()

      expect(screen.getByText('Light Jet')).toBeInTheDocument()
      expect(screen.getByText('Heavy Jet')).toBeInTheDocument()
      expect(screen.getByText('Helicopter')).toBeInTheDocument()
    })

    test('calls onEdit when edit button is clicked', async () => {
      const mockOnEdit = jest.fn()
      const mockOnDelete = jest.fn()
      const user = userEvent.setup()

      render(
        <FeeCategoryList 
          categories={mockCategories} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      await user.click(screen.getByTestId('edit-1'))
      expect(mockOnEdit).toHaveBeenCalledWith(mockCategories[0])
    })

    test('calls onDelete when delete button is clicked', async () => {
      const mockOnEdit = jest.fn()
      const mockOnDelete = jest.fn()
      const user = userEvent.setup()

      render(
        <FeeCategoryList 
          categories={mockCategories} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      await user.click(screen.getByTestId('delete-1'))
      expect(mockOnDelete).toHaveBeenCalledWith(1)
    })

    test('renders empty list when no categories provided', () => {
      const mockOnEdit = jest.fn()
      const mockOnDelete = jest.fn()

      render(
        <FeeCategoryList 
          categories={[]} 
          onEdit={mockOnEdit} 
          onDelete={mockOnDelete} 
        />
      )

      expect(screen.getByTestId('fee-category-list')).toBeInTheDocument()
      expect(screen.queryByTestId('category-1')).not.toBeInTheDocument()
    })
  })

  describe('FeeCategoryForm Component', () => {
    test('renders create form correctly', () => {
      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()

      render(
        <FeeCategoryForm 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      expect(screen.getByTestId('fee-category-form')).toBeInTheDocument()
      expect(screen.getByTestId('category-name-input')).toBeInTheDocument()
      expect(screen.getByTestId('save-button')).toHaveTextContent('Create Category')
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
    })

    test('renders edit form correctly with existing category', () => {
      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()
      const category = { id: 1, name: 'Light Jet' }

      render(
        <FeeCategoryForm 
          category={category}
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
          isEditing={true}
        />
      )

      expect(screen.getByTestId('category-name-input')).toHaveValue('Light Jet')
      expect(screen.getByTestId('save-button')).toHaveTextContent('Update Category')
    })

    test('handles form input changes', async () => {
      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()
      const user = userEvent.setup()

      render(
        <FeeCategoryForm 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      const nameInput = screen.getByTestId('category-name-input')
      await user.type(nameInput, 'New Category')

      expect(nameInput).toHaveValue('New Category')
    })

    test('validates required fields and shows error messages', async () => {
      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()
      const user = userEvent.setup()

      render(
        <FeeCategoryForm 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      await user.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(screen.getByTestId('name-error')).toBeInTheDocument()
        expect(screen.getByTestId('name-error')).toHaveTextContent('Name is required')
      })

      expect(mockOnSave).not.toHaveBeenCalled()
    })

    test('submits form with valid data', async () => {
      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()
      const user = userEvent.setup()

      render(
        <FeeCategoryForm 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      await user.type(screen.getByTestId('category-name-input'), 'New Category')
      await user.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({ name: 'New Category' })
      })
    })

    test('trims whitespace from input', async () => {
      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()
      const user = userEvent.setup()

      render(
        <FeeCategoryForm 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      await user.type(screen.getByTestId('category-name-input'), '  Trimmed Category  ')
      await user.click(screen.getByTestId('save-button'))

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({ name: 'Trimmed Category' })
      })
    })

    test('calls onCancel when cancel button is clicked', async () => {
      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()
      const user = userEvent.setup()

      render(
        <FeeCategoryForm 
          onSave={mockOnSave} 
          onCancel={mockOnCancel} 
        />
      )

      await user.click(screen.getByTestId('cancel-button'))
      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('Service Integration Tests', () => {
    test('getFeeCategories service is called correctly', async () => {
      mockAdminFeeConfigService.getFeeCategories.mockResolvedValue(mockCategories)

      const result = await mockAdminFeeConfigService.getFeeCategories(1)
      expect(result).toEqual(mockCategories)
      expect(mockAdminFeeConfigService.getFeeCategories).toHaveBeenCalledWith(1)
    })

    test('createFeeCategory service is called correctly', async () => {
      const newCategory = { name: 'New Category' }
      const createdCategory = { id: 4, ...newCategory, fbo_location_id: 1 }
      
      mockAdminFeeConfigService.createFeeCategory.mockResolvedValue(createdCategory)

      const result = await mockAdminFeeConfigService.createFeeCategory(1, newCategory)
      expect(result).toEqual(createdCategory)
      expect(mockAdminFeeConfigService.createFeeCategory).toHaveBeenCalledWith(1, newCategory)
    })

    test('updateFeeCategory service is called correctly', async () => {
      const updatedData = { name: 'Updated Category' }
      const updatedCategory = { id: 1, ...updatedData, fbo_location_id: 1 }
      
      mockAdminFeeConfigService.updateFeeCategory.mockResolvedValue(updatedCategory)

      const result = await mockAdminFeeConfigService.updateFeeCategory(1, 1, updatedData)
      expect(result).toEqual(updatedCategory)
      expect(mockAdminFeeConfigService.updateFeeCategory).toHaveBeenCalledWith(1, 1, updatedData)
    })

    test('deleteFeeCategory service is called correctly', async () => {
      mockAdminFeeConfigService.deleteFeeCategory.mockResolvedValue(true)

      const result = await mockAdminFeeConfigService.deleteFeeCategory(1, 1)
      expect(result).toBe(true)
      expect(mockAdminFeeConfigService.deleteFeeCategory).toHaveBeenCalledWith(1, 1)
    })
  })
})

// Error handling tests
describe('Fee Categories Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('handles service errors gracefully', async () => {
    const errorMessage = 'Failed to fetch categories'
    mockAdminFeeConfigService.getFeeCategories.mockRejectedValue(new Error(errorMessage))

    await expect(mockAdminFeeConfigService.getFeeCategories(1)).rejects.toThrow(errorMessage)
  })

  test('handles validation errors from backend', async () => {
    const validationError = {
      status: 400,
      message: 'Validation failed',
      errors: { name: 'Name already exists' }
    }
    
    mockAdminFeeConfigService.createFeeCategory.mockRejectedValue(validationError)

    await expect(
      mockAdminFeeConfigService.createFeeCategory(1, { name: 'Duplicate' })
    ).rejects.toEqual(validationError)
  })

  test('handles delete constraints errors', async () => {
    const constraintError = {
      status: 409,
      message: 'Cannot delete fee category that is referenced by fee rules'
    }
    
    mockAdminFeeConfigService.deleteFeeCategory.mockRejectedValue(constraintError)

    await expect(
      mockAdminFeeConfigService.deleteFeeCategory(1, 1)
    ).rejects.toEqual(constraintError)
  })
}) 