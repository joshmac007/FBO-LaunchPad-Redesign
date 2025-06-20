import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ReceiptWorkspace from '../../app/csr/receipts/components/ReceiptWorkspace'
import * as receiptService from '../../app/services/receipt-service'

// Mock the receipt service
jest.mock('../../app/services/receipt-service', () => ({
  getReceiptById: jest.fn(),
  calculateFeesForReceipt: jest.fn(),
  updateDraftReceipt: jest.fn(),
  generateFinalReceipt: jest.fn(),
  markReceiptAsPaid: jest.fn(),
}))

const mockReceiptService = receiptService as jest.Mocked<typeof receiptService>

// Mock receipt data
const mockDraftReceipt = {
  id: 1,
  receiptNumber: '',
  fuelOrderId: 123,
  tailNumber: 'N123AB',
  customer: 'Test Customer',
  fuelType: 'Jet A',
  quantity: 100,
  amount: 500.00,
  paymentMethod: '',
  status: 'DRAFT' as const,
  createdAt: '2024-01-01T10:00:00Z',
  fuelerName: 'Test Fueler',
  location: 'Test Location',
  fuelSubtotal: 500.00,
  totalFeesAmount: 0,
  totalWaiversAmount: 0,
  taxAmount: 0,
  grandTotalAmount: 0,
  lineItems: []
}

const mockCalculatedReceipt = {
  ...mockDraftReceipt,
  totalFeesAmount: 150.00,
  totalWaiversAmount: -50.00,
  taxAmount: 60.00,
  grandTotalAmount: 660.00,
  lineItems: [
    { id: 1, receiptId: 1, lineItemType: 'FUEL' as const, description: 'Jet A Fuel', quantity: 100, unitPrice: 5.00, amount: 500.00 },
    { id: 2, receiptId: 1, lineItemType: 'FEE' as const, description: 'Ramp Fee', quantity: 1, unitPrice: 100.00, amount: 100.00 },
    { id: 3, receiptId: 1, lineItemType: 'FEE' as const, description: 'GPU Service', quantity: 1, unitPrice: 50.00, amount: 50.00 },
    { id: 4, receiptId: 1, lineItemType: 'WAIVER' as const, description: 'Fuel Uplift Waiver (Ramp Fee)', quantity: 1, unitPrice: -50.00, amount: -50.00 },
    { id: 5, receiptId: 1, lineItemType: 'TAX' as const, description: 'Tax', quantity: 1, unitPrice: 60.00, amount: 60.00 }
  ]
}

describe('ReceiptWorkspace', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial State Test', () => {
    it('should correctly render pre-filled data from mocked getReceiptById service call', async () => {
      mockReceiptService.getReceiptById.mockResolvedValue(mockDraftReceipt)

      render(<ReceiptWorkspace receiptId={1} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('N123AB')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Jet A')).toBeInTheDocument()
        expect(screen.getByRole('combobox', { name: /customer/i })).toBeInTheDocument()
      })

      expect(mockReceiptService.getReceiptById).toHaveBeenCalledWith(1)
    })

    it('should show loading state initially', () => {
      mockReceiptService.getReceiptById.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<ReceiptWorkspace receiptId={1} />)

      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })
  })

  describe('Fee Calculation Interaction Test', () => {
    it('should handle fee calculation workflow correctly', async () => {
      mockReceiptService.getReceiptById.mockResolvedValue(mockDraftReceipt)
      mockReceiptService.calculateFeesForReceipt.mockResolvedValue(mockCalculatedReceipt)

      render(<ReceiptWorkspace receiptId={1} />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByDisplayValue('N123AB')).toBeInTheDocument()
      })

      // Click the "Calculate Fees" button
      const calculateFeesBtn = screen.getByRole('button', { name: /calculate fees/i })
      fireEvent.click(calculateFeesBtn)

      // Assert that the service function was called with correct receipt_id
      expect(mockReceiptService.calculateFeesForReceipt).toHaveBeenCalledWith(1)

      // Wait for the component state to update and re-render
      await waitFor(() => {
        expect(screen.getByText('Ramp Fee')).toBeInTheDocument()
        expect(screen.getByText('GPU Service')).toBeInTheDocument()
        expect(screen.getByText('Fuel Uplift Waiver (Ramp Fee)')).toBeInTheDocument()
        expect(screen.getByText('$660.00')).toBeInTheDocument() // Grand total
      })
    })

    it('should disable Calculate Fees button during calculation', async () => {
      mockReceiptService.getReceiptById.mockResolvedValue(mockDraftReceipt)
      mockReceiptService.calculateFeesForReceipt.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<ReceiptWorkspace receiptId={1} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('N123AB')).toBeInTheDocument()
      })

      const calculateFeesBtn = screen.getByRole('button', { name: /calculate fees/i })
      fireEvent.click(calculateFeesBtn)

      // Button should be disabled and show loading state
      expect(calculateFeesBtn).toBeDisabled()
      expect(screen.getByTestId('calculating-fees-spinner')).toBeInTheDocument()
    })
  })

  describe('Error State Test', () => {
    it('should display user-friendly error message when fee calculation fails', async () => {
      mockReceiptService.getReceiptById.mockResolvedValue(mockDraftReceipt)
      mockReceiptService.calculateFeesForReceipt.mockRejectedValue(new Error('Fee calculation failed'))

      render(<ReceiptWorkspace receiptId={1} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('N123AB')).toBeInTheDocument()
      })

      const calculateFeesBtn = screen.getByRole('button', { name: /calculate fees/i })
      fireEvent.click(calculateFeesBtn)

      await waitFor(() => {
        expect(screen.getByText(/fee calculation failed/i)).toBeInTheDocument()
      })
    })
  })

  describe('Button State Test', () => {
    it('should have Generate Receipt button disabled on initial load', async () => {
      mockReceiptService.getReceiptById.mockResolvedValue(mockDraftReceipt)

      render(<ReceiptWorkspace receiptId={1} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('N123AB')).toBeInTheDocument()
      })

      const generateReceiptBtn = screen.getByRole('button', { name: /generate receipt/i })
      expect(generateReceiptBtn).toBeDisabled()
    })

    it('should enable Generate Receipt button after successful fee calculation', async () => {
      mockReceiptService.getReceiptById.mockResolvedValue(mockDraftReceipt)
      mockReceiptService.calculateFeesForReceipt.mockResolvedValue(mockCalculatedReceipt)

      render(<ReceiptWorkspace receiptId={1} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('N123AB')).toBeInTheDocument()
      })

      const calculateFeesBtn = screen.getByRole('button', { name: /calculate fees/i })
      fireEvent.click(calculateFeesBtn)

      await waitFor(() => {
        const generateReceiptBtn = screen.getByRole('button', { name: /generate receipt/i })
        expect(generateReceiptBtn).toBeEnabled()
      })
    })
  })

  describe('Auto-save functionality', () => {
    it('should call updateDraftReceipt when notes field loses focus', async () => {
      mockReceiptService.getReceiptById.mockResolvedValue(mockDraftReceipt)
      mockReceiptService.updateDraftReceipt.mockResolvedValue(mockDraftReceipt)

      render(<ReceiptWorkspace receiptId={1} />)

      await waitFor(() => {
        expect(screen.getByDisplayValue('N123AB')).toBeInTheDocument()
      })

      const notesField = screen.getByLabelText(/notes/i)
      fireEvent.change(notesField, { target: { value: 'Test notes' } })
      fireEvent.blur(notesField)

      await waitFor(() => {
        expect(mockReceiptService.updateDraftReceipt).toHaveBeenCalledWith(1, {
          notes: 'Test notes'
        })
      })
    })
  })
}) 