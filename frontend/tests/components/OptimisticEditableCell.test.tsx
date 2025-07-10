import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OptimisticEditableCell } from '@/components/ui/optimistic-editable-cell'
import { z } from 'zod'

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const mockOnSave = jest.fn()

const testValidationSchema = z.object({
  value: z.string()
    .min(1, "Value is required")
    .max(10, "Value must be 10 characters or less")
})

describe('OptimisticEditableCell', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockOnSave.mockResolvedValue(undefined)
  })

  describe('Display Mode', () => {
    it('should display the value when not editing', () => {
      render(
        <OptimisticEditableCell
          value="Test Value"
          onSave={mockOnSave}
        />
      )
      
      expect(screen.getByText('Test Value')).toBeInTheDocument()
    })

    it('should display currency format for currency type', () => {
      render(
        <OptimisticEditableCell
          value={123.45}
          type="currency"
          onSave={mockOnSave}
        />
      )
      
      expect(screen.getByText('$123.45')).toBeInTheDocument()
    })

    it('should use custom display format when provided', () => {
      render(
        <OptimisticEditableCell
          value={100}
          displayFormat={(val) => `Custom: ${val}`}
          onSave={mockOnSave}
        />
      )
      
      expect(screen.getByText('Custom: 100')).toBeInTheDocument()
    })

    it('should be clickable and have proper accessibility attributes', () => {
      render(
        <OptimisticEditableCell
          value="Test Value"
          onSave={mockOnSave}
        />
      )
      
      const cell = screen.getByRole('button')
      expect(cell).toBeInTheDocument()
      expect(cell).toHaveAttribute('tabIndex', '0')
      expect(cell).toHaveAttribute('aria-label', 'Editable text field with value Test Value. Click to edit.')
    })

    it('should be disabled when disabled prop is true', () => {
      render(
        <OptimisticEditableCell
          value="Test Value"
          onSave={mockOnSave}
          disabled={true}
        />
      )
      
      const cell = screen.getByRole('button')
      expect(cell).toHaveAttribute('tabIndex', '-1')
      expect(cell).toHaveClass('cursor-not-allowed', 'opacity-50')
    })

    it('should show pending state when isPending is true', () => {
      render(
        <OptimisticEditableCell
          value="Test Value"
          onSave={mockOnSave}
          isPending={true}
        />
      )
      
      expect(screen.getByText('Test Value')).toBeInTheDocument()
      expect(screen.getByRole('button')).toHaveClass('opacity-70')
      // Should show loading spinner
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('Edit Mode Activation', () => {
    it('should enter edit mode when clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <OptimisticEditableCell
          value="Test Value"
          onSave={mockOnSave}
        />
      )
      
      await user.click(screen.getByRole('button'))
      
      // Should show input field with current value
      expect(screen.getByDisplayValue('Test Value')).toBeInTheDocument()
      // Should show action buttons
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel changes/i })).toBeInTheDocument()
    })

    it('should enter edit mode when Enter key is pressed', async () => {
      const user = userEvent.setup()
      
      render(
        <OptimisticEditableCell
          value="Test Value"
          onSave={mockOnSave}
        />
      )
      
      const cell = screen.getByRole('button')
      cell.focus()
      await user.keyboard('{Enter}')
      
      expect(screen.getByDisplayValue('Test Value')).toBeInTheDocument()
    })

    it('should enter edit mode when Space key is pressed', async () => {
      const user = userEvent.setup()
      
      render(
        <OptimisticEditableCell
          value="Test Value"
          onSave={mockOnSave}
        />
      )
      
      const cell = screen.getByRole('button')
      cell.focus()
      await user.keyboard(' ')
      
      expect(screen.getByDisplayValue('Test Value')).toBeInTheDocument()
    })

    it('should not enter edit mode when disabled', async () => {
      const user = userEvent.setup()
      
      render(
        <OptimisticEditableCell
          value="Test Value"
          onSave={mockOnSave}
          disabled={true}
        />
      )
      
      await user.click(screen.getByRole('button'))
      
      // Should not show input field
      expect(screen.queryByDisplayValue('Test Value')).not.toBeInTheDocument()
      expect(screen.getByText('Test Value')).toBeInTheDocument()
    })

    it('should not enter edit mode when pending', async () => {
      const user = userEvent.setup()
      
      render(
        <OptimisticEditableCell
          value="Test Value"
          onSave={mockOnSave}
          isPending={true}
        />
      )
      
      await user.click(screen.getByRole('button'))
      
      // Should not show input field
      expect(screen.queryByDisplayValue('Test Value')).not.toBeInTheDocument()
      expect(screen.getByText('Test Value')).toBeInTheDocument()
    })
  })

  describe('Edit Mode Behavior', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      render(
        <OptimisticEditableCell
          value="Test Value"
          onSave={mockOnSave}
          validation={testValidationSchema}
        />
      )
      
      await user.click(screen.getByRole('button'))
    })

    it('should auto-focus the input field when entering edit mode', () => {
      const input = screen.getByDisplayValue('Test Value')
      expect(input).toHaveFocus()
    })

    it('should show prefix and suffix when provided', async () => {
      const user = userEvent.setup()
      
      render(
        <OptimisticEditableCell
          value={100}
          type="currency"
          prefix="$"
          suffix="USD"
          onSave={mockOnSave}
        />
      )
      
      await user.click(screen.getByRole('button'))
      
      expect(screen.getByText('$')).toBeInTheDocument()
      expect(screen.getByText('USD')).toBeInTheDocument()
    })

    it('should apply proper styling for different types', async () => {
      const user = userEvent.setup()
      
      // Test currency type
      render(
        <OptimisticEditableCell
          value={100}
          type="currency"
          onSave={mockOnSave}
        />
      )
      
      await user.click(screen.getByRole('button'))
      
      const input = screen.getByDisplayValue('100')
      expect(input).toHaveClass('w-20') // Currency should be narrower
    })
  })

  describe('Save Functionality', () => {
    it('should save changes when form is submitted', async () => {
      const user = userEvent.setup()
      
      render(
        <OptimisticEditableCell
          value="Original Value"
          onSave={mockOnSave}
        />
      )
      
      await user.click(screen.getByRole('button'))
      
      const input = screen.getByDisplayValue('Original Value')
      await user.clear(input)
      await user.type(input, 'New Value')
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('New Value')
      })
    })

    it('should save changes when input loses focus', async () => {
      const user = userEvent.setup()
      
      render(
        <OptimisticEditableCell
          value="Original Value"
          onSave={mockOnSave}
        />
      )
      
      await user.click(screen.getByRole('button'))
      
      const input = screen.getByDisplayValue('Original Value')
      await user.clear(input)
      await user.type(input, 'New Value')
      await user.tab() // Move focus away to trigger blur
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('New Value')
      })
    })

    it('should save changes when Enter key is pressed', async () => {
      const user = userEvent.setup()
      
      render(
        <OptimisticEditableCell
          value="Original Value"
          onSave={mockOnSave}
        />
      )
      
      await user.click(screen.getByRole('button'))
      
      const input = screen.getByDisplayValue('Original Value')
      await user.clear(input)
      await user.type(input, 'New Value{Enter}')
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('New Value')
      })
    })

    it('should convert to number for number and currency types', async () => {
      const user = userEvent.setup()
      
      render(
        <OptimisticEditableCell
          value={100}
          type="number"
          onSave={mockOnSave}
        />
      )
      
      await user.click(screen.getByRole('button'))
      
      const input = screen.getByDisplayValue('100')
      await user.clear(input)
      await user.type(input, '250{Enter}')
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(250)
      })
    })

    it('should not save if value is unchanged', async () => {
      const user = userEvent.setup()
      
      render(
        <OptimisticEditableCell
          value="Same Value"
          onSave={mockOnSave}
        />
      )
      
      await user.click(screen.getByRole('button'))
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      expect(mockOnSave).not.toHaveBeenCalled()
      // Should exit edit mode
      expect(screen.getByText('Same Value')).toBeInTheDocument()
    })

    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup()
      mockOnSave.mockRejectedValue(new Error('Save failed'))
      
      render(
        <OptimisticEditableCell
          value="Original Value"
          onSave={mockOnSave}
        />
      )
      
      await user.click(screen.getByRole('button'))
      
      const input = screen.getByDisplayValue('Original Value')
      await user.clear(input)
      await user.type(input, 'New Value')
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('New Value')
      })
      
      // Should remain in edit mode after error
      expect(screen.getByDisplayValue('New Value')).toBeInTheDocument()
    })
  })

  describe('Cancel Functionality', () => {
    it('should cancel changes and exit edit mode when cancel button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <OptimisticEditableCell
          value="Original Value"
          onSave={mockOnSave}
        />
      )
      
      await user.click(screen.getByRole('button'))
      
      const input = screen.getByDisplayValue('Original Value')
      await user.clear(input)
      await user.type(input, 'Modified Value')
      
      const cancelButton = screen.getByRole('button', { name: /cancel changes/i })
      await user.click(cancelButton)
      
      // Should not save
      expect(mockOnSave).not.toHaveBeenCalled()
      // Should show original value
      expect(screen.getByText('Original Value')).toBeInTheDocument()
    })

    it('should cancel changes when Escape key is pressed', async () => {
      const user = userEvent.setup()
      
      render(
        <OptimisticEditableCell
          value="Original Value"
          onSave={mockOnSave}
        />
      )
      
      await user.click(screen.getByRole('button'))
      
      const input = screen.getByDisplayValue('Original Value')
      await user.clear(input)
      await user.type(input, 'Modified Value')
      await user.keyboard('{Escape}')
      
      // Should not save
      expect(mockOnSave).not.toHaveBeenCalled()
      // Should show original value
      expect(screen.getByText('Original Value')).toBeInTheDocument()
    })
  })

  describe('Validation', () => {
    it('should show validation errors', async () => {
      const user = userEvent.setup()
      
      render(
        <OptimisticEditableCell
          value="Valid"
          onSave={mockOnSave}
          validation={testValidationSchema}
        />
      )
      
      await user.click(screen.getByRole('button'))
      
      const input = screen.getByDisplayValue('Valid')
      await user.clear(input)
      await user.type(input, 'This is too long')
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText('Value must be 10 characters or less')).toBeInTheDocument()
      })
      
      // Should not call onSave
      expect(mockOnSave).not.toHaveBeenCalled()
    })

    it('should show error for invalid numbers', async () => {
      const user = userEvent.setup()
      
      render(
        <OptimisticEditableCell
          value={100}
          type="number"
          onSave={mockOnSave}
        />
      )
      
      await user.click(screen.getByRole('button'))
      
      const input = screen.getByDisplayValue('100')
      await user.clear(input)
      await user.type(input, 'not-a-number')
      
      const saveButton = screen.getByRole('button', { name: /save changes/i })
      await user.click(saveButton)
      
      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText('Must be a valid number')).toBeInTheDocument()
      })
      
      expect(mockOnSave).not.toHaveBeenCalled()
    })
  })

  describe('External Value Changes', () => {
    it('should exit edit mode when external value changes', async () => {
      const user = userEvent.setup()
      
      const { rerender } = render(
        <OptimisticEditableCell
          value="Original Value"
          onSave={mockOnSave}
        />
      )
      
      await user.click(screen.getByRole('button'))
      expect(screen.getByDisplayValue('Original Value')).toBeInTheDocument()
      
      // External value change
      rerender(
        <OptimisticEditableCell
          value="Updated Externally"
          onSave={mockOnSave}
        />
      )
      
      // Should exit edit mode and show new value
      expect(screen.queryByDisplayValue('Original Value')).not.toBeInTheDocument()
      expect(screen.getByText('Updated Externally')).toBeInTheDocument()
    })
  })
})