import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import "@testing-library/jest-dom"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { toast } from "sonner"

import { 
  MoveAircraftDialog, 
  type ClassificationOption, 
  type AircraftToMove, 
  type MoveAircraftDialogProps 
} from "../../../app/admin/fbo-config/fee-management/components/MoveAircraftDialog"
import * as adminFeeConfigService from "../../../app/services/admin-fee-config-service"

// Mock the admin fee config service
jest.mock('../../../app/services/admin-fee-config-service', () => ({
  updateAircraftClassificationMapping: jest.fn(),
}))

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Helper function to create a query client for each test
const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Test data
const mockClassifications: ClassificationOption[] = [
  { id: 1, name: 'Piston' },
  { id: 2, name: 'Light Jet' },
  { id: 3, name: 'Heavy Jet' },
  { id: 4, name: 'Helicopter' },
]

const mockAircraftToMove: AircraftToMove = {
  aircraft_type_id: 1,
  aircraft_type_name: 'Cessna 172',
  current_classification_id: 1,
  current_classification_name: 'Piston',
}

const defaultProps: MoveAircraftDialogProps = {
  open: true,
  onOpenChange: jest.fn(),
  aircraft: mockAircraftToMove,
  availableClassifications: mockClassifications,
  fboId: 1,
  onSuccess: jest.fn(),
}

describe('MoveAircraftDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('Component Rendering', () => {
    it('renders dialog with correct title and aircraft information', () => {
      render(
        <TestWrapper>
          <MoveAircraftDialog {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Move Aircraft' })).toBeInTheDocument()
      expect(screen.getByText('Cessna 172')).toBeInTheDocument()
      expect(screen.getByText('Piston')).toBeInTheDocument()
    })

    it('does not render when aircraft is null', () => {
      render(
        <TestWrapper>
          <MoveAircraftDialog {...defaultProps} aircraft={null} />
        </TestWrapper>
      )

      expect(screen.queryByText('Move Aircraft')).not.toBeInTheDocument()
    })

    it('displays available classifications excluding current classification', () => {
      render(
        <TestWrapper>
          <MoveAircraftDialog {...defaultProps} />
        </TestWrapper>
      )

      // Click the select trigger to open dropdown
      const selectTrigger = screen.getByRole('combobox')
      fireEvent.click(selectTrigger)

      // Should show all classifications except the current one (Piston)
      const lightJetOptions = screen.getAllByText('Light Jet')
      const heavyJetOptions = screen.getAllByText('Heavy Jet')
      const helicopterOptions = screen.getAllByText('Helicopter')
      
      expect(lightJetOptions.length).toBeGreaterThan(0)
      expect(heavyJetOptions.length).toBeGreaterThan(0)
      expect(helicopterOptions.length).toBeGreaterThan(0)
      
      // Piston should only appear in the description, not as a selectable option
      const pistonOptions = screen.queryAllByText('Piston')
      // There should be exactly 1 occurrence (in the description text), not in the select options
      expect(pistonOptions.length).toBe(1)
    })
  })

  describe('User Interactions', () => {
    it('allows user to select a new classification', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <MoveAircraftDialog {...defaultProps} />
        </TestWrapper>
      )

      // Click the select trigger to open dropdown
      const selectTrigger = screen.getByRole('combobox')
      await user.click(selectTrigger)

      // Select Light Jet
      const lightJetOptions = screen.getAllByText('Light Jet')
      await user.click(lightJetOptions[0])

      // Verify selection is made
      expect(selectTrigger).toHaveTextContent('Light Jet')
    })

    it('calls onOpenChange when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const mockOnOpenChange = jest.fn()
      
      render(
        <TestWrapper>
          <MoveAircraftDialog {...defaultProps} onOpenChange={mockOnOpenChange} />
        </TestWrapper>
      )

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('submits form when Move Aircraft button is clicked', async () => {
      const user = userEvent.setup()
      const mockUpdateMapping = jest.mocked(adminFeeConfigService.updateAircraftClassificationMapping)
      mockUpdateMapping.mockResolvedValueOnce({
        aircraft_type_id: 1,
        aircraft_type_name: 'Cessna 172',
        classification_id: 2,
        classification_name: 'Light Jet',
        updated_at: '2025-06-28T12:00:00Z',
      })
      
      render(
        <TestWrapper>
          <MoveAircraftDialog {...defaultProps} />
        </TestWrapper>
      )

      // Select a new classification
      const selectTrigger = screen.getByRole('combobox')
      await user.click(selectTrigger)
      
      const lightJetOptions = screen.getAllByText('Light Jet')
      await user.click(lightJetOptions[0])

      // Click Move Aircraft button
      const moveButton = screen.getByRole('button', { name: 'Move Aircraft' })
      await user.click(moveButton)

      // Verify API call
      expect(mockUpdateMapping).toHaveBeenCalledWith(1, 1, {
        classification_id: 2,
      })
    })
  })

  describe('API Integration', () => {
    it('calls updateAircraftClassificationMapping with correct parameters', async () => {
      const user = userEvent.setup()
      const mockUpdateMapping = jest.mocked(adminFeeConfigService.updateAircraftClassificationMapping)
      mockUpdateMapping.mockResolvedValueOnce({
        aircraft_type_id: 1,
        aircraft_type_name: 'Cessna 172',
        classification_id: 3,
        classification_name: 'Heavy Jet',
        updated_at: '2025-06-28T12:00:00Z',
      })
      
      render(
        <TestWrapper>
          <MoveAircraftDialog {...defaultProps} />
        </TestWrapper>
      )

      // Select Heavy Jet
      const selectTrigger = screen.getByRole('combobox')
      await user.click(selectTrigger)
      
      const heavyJetOptions = screen.getAllByText('Heavy Jet')
      await user.click(heavyJetOptions[0])

      // Submit form
      const moveButton = screen.getByRole('button', { name: 'Move Aircraft' })
      await user.click(moveButton)

      expect(mockUpdateMapping).toHaveBeenCalledWith(
        1, // fboId
        1, // aircraft_type_id
        { classification_id: 3 } // request data
      )
    })

    it('handles successful API response correctly', async () => {
      const user = userEvent.setup()
      const mockOnOpenChange = jest.fn()
      const mockOnSuccess = jest.fn()
      const mockUpdateMapping = jest.mocked(adminFeeConfigService.updateAircraftClassificationMapping)
      
      mockUpdateMapping.mockResolvedValueOnce({
        aircraft_type_id: 1,
        aircraft_type_name: 'Cessna 172',
        classification_id: 2,
        classification_name: 'Light Jet',
        updated_at: '2025-06-28T12:00:00Z',
      })
      
      render(
        <TestWrapper>
          <MoveAircraftDialog 
            {...defaultProps} 
            onOpenChange={mockOnOpenChange}
            onSuccess={mockOnSuccess}
          />
        </TestWrapper>
      )

      // Select and submit
      const selectTrigger = screen.getByRole('combobox')
      await user.click(selectTrigger)
      await user.click(screen.getByText('Light Jet'))
      await user.click(screen.getByText('Move Aircraft'))

      // Wait for async operations
      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
        expect(mockOnSuccess).toHaveBeenCalled()
        expect(toast.success).toHaveBeenCalledWith(
          'Successfully moved Cessna 172 to new classification'
        )
      })
    })

    it('handles API error correctly and displays toast notification', async () => {
      const user = userEvent.setup()
      const mockUpdateMapping = jest.mocked(adminFeeConfigService.updateAircraftClassificationMapping)
      
      const errorMessage = 'Aircraft type not found'
      mockUpdateMapping.mockRejectedValueOnce(new Error(errorMessage))
      
      render(
        <TestWrapper>
          <MoveAircraftDialog {...defaultProps} />
        </TestWrapper>
      )

      // Select and submit
      const selectTrigger = screen.getByRole('combobox')
      await user.click(selectTrigger)
      await user.click(screen.getByText('Light Jet'))
      await user.click(screen.getByText('Move Aircraft'))

      // Wait for error handling
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(`Error: ${errorMessage}`)
      })
    })

    it('shows loading state during API call', async () => {
      const user = userEvent.setup()
      const mockUpdateMapping = jest.mocked(adminFeeConfigService.updateAircraftClassificationMapping)
      
      // Create a promise that we can control
      let resolvePromise: (value: any) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockUpdateMapping.mockReturnValueOnce(pendingPromise)
      
      render(
        <TestWrapper>
          <MoveAircraftDialog {...defaultProps} />
        </TestWrapper>
      )

      // Select and submit
      const selectTrigger = screen.getByRole('combobox')
      await user.click(selectTrigger)
      await user.click(screen.getByText('Light Jet'))
      
      const moveButton = screen.getByRole('button', { name: 'Move Aircraft' })
      await user.click(moveButton)

      // Check loading state
      expect(screen.getByText('Moving...')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeDisabled()

      // Resolve the promise to clean up
      resolvePromise!({
        aircraft_type_id: 1,
        aircraft_type_name: 'Cessna 172',
        classification_id: 2,
        classification_name: 'Light Jet',
        updated_at: '2025-06-28T12:00:00Z',
      })
    })
  })

  describe('Form Validation', () => {
    it('prevents submission when no classification is selected', async () => {
      const user = userEvent.setup()
      const mockUpdateMapping = jest.mocked(adminFeeConfigService.updateAircraftClassificationMapping)
      
      render(
        <TestWrapper>
          <MoveAircraftDialog {...defaultProps} />
        </TestWrapper>
      )

      // Try to submit without selecting a classification
      const moveButton = screen.getByRole('button', { name: 'Move Aircraft' })
      await user.click(moveButton)

      // Should not call API
      expect(mockUpdateMapping).not.toHaveBeenCalled()
    })

    it('resets form when aircraft changes', () => {
      const { rerender } = render(
        <TestWrapper>
          <MoveAircraftDialog {...defaultProps} />
        </TestWrapper>
      )

      // Change aircraft
      const newAircraft: AircraftToMove = {
        aircraft_type_id: 2,
        aircraft_type_name: 'King Air 350',
        current_classification_id: 2,
        current_classification_name: 'Light Jet',
      }

      rerender(
        <TestWrapper>
          <MoveAircraftDialog {...defaultProps} aircraft={newAircraft} />
        </TestWrapper>
      )

      // Verify new aircraft information is displayed
      expect(screen.getByText('King Air 350')).toBeInTheDocument()
      expect(screen.getByText('Light Jet')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty classifications list', () => {
      render(
        <TestWrapper>
          <MoveAircraftDialog {...defaultProps} availableClassifications={[]} />
        </TestWrapper>
      )

      const selectTrigger = screen.getByRole('combobox')
      fireEvent.click(selectTrigger)

      // Should show placeholder text
      expect(screen.getByText('Select a classification')).toBeInTheDocument()
    })

    it('handles case where aircraft current classification is not in available list', () => {
      const limitedClassifications: ClassificationOption[] = [
        { id: 2, name: 'Light Jet' },
        { id: 3, name: 'Heavy Jet' },
      ]

      render(
        <TestWrapper>
          <MoveAircraftDialog 
            {...defaultProps} 
            availableClassifications={limitedClassifications}
          />
        </TestWrapper>
      )

      const selectTrigger = screen.getByRole('combobox')
      fireEvent.click(selectTrigger)

      // Should show both available options since current classification is not in the list
      expect(screen.getByText('Light Jet')).toBeInTheDocument()
      expect(screen.getByText('Heavy Jet')).toBeInTheDocument()
    })
  })
})