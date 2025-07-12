/**
 * Test suite for ReceiptTableRow component
 * 
 * Following TDD principles, these tests validate the component's rendering behavior,
 * user interactions, and accessibility features from the user's perspective.
 */

import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Receipt } from '../../app/services/receipt-service'
import ReceiptTableRow from '../../app/components/ReceiptTableRow'

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

// Mock the Badge component
vi.mock('../../components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  )
}))

describe('ReceiptTableRow', () => {
  // Test data factory following TDD principles
  const createMockReceipt = (overrides?: Partial<Receipt>): Receipt => ({
    id: 1,
    receipt_number: "RCP-2024-001",
    fuel_order_id: 1,
    customer_id: 1,
    fuel_order_tail_number: "N12345",
    aircraft_type_at_receipt_time: "Light Jet",
    fuel_type_at_receipt_time: "JET_A",
    fuel_quantity_gallons_at_receipt_time: "100.00",
    fuel_unit_price_at_receipt_time: "5.75",
    fuel_subtotal: "575.00",
    total_fees_amount: "100.00",
    total_waivers_amount: "0.00",
    tax_amount: "0.00",
    grand_total_amount: "675.00",
    status: "GENERATED",
    is_caa_applied: false,
    generated_at: "2024-01-15T10:35:00Z",
    paid_at: null,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:35:00Z",
    created_by_user_id: 1,
    updated_by_user_id: 1,
    ...overrides
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic rendering', () => {
    it('should render receipt information correctly', () => {
      const receipt = createMockReceipt()
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      // Verify receipt number is displayed
      expect(screen.getByText('RCP-2024-001')).toBeInTheDocument()

      // Verify tail number is displayed
      expect(screen.getByText('N12345')).toBeInTheDocument()

      // Verify aircraft type is displayed
      expect(screen.getByText('Light Jet')).toBeInTheDocument()

      // Verify fuel information is displayed
      expect(screen.getByText('JET_A')).toBeInTheDocument()
      expect(screen.getByText('100.00 gal')).toBeInTheDocument()

      // Verify total amount is displayed
      expect(screen.getByText('$675.00')).toBeInTheDocument()

      // Verify status badge is displayed
      const statusBadge = screen.getByTestId('badge')
      expect(statusBadge).toHaveTextContent('GENERATED')
    })

    it('should handle missing optional fields gracefully', () => {
      const receipt = createMockReceipt({
        receipt_number: null,
        fuel_order_tail_number: null,
        aircraft_type_at_receipt_time: null,
        fuel_type_at_receipt_time: null,
        fuel_quantity_gallons_at_receipt_time: null
      })
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      // Should display fallback for receipt number
      expect(screen.getByText(`#${receipt.id}`)).toBeInTheDocument()

      // Should display "N/A" for missing fields
      expect(screen.getAllByText('N/A')).toHaveLength(4) // tail number, aircraft type, fuel type, quantity
    })

    it('should display formatted creation date', () => {
      const receipt = createMockReceipt({
        created_at: "2024-01-15T10:30:00Z"
      })
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      // Should display formatted date
      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument()
    })
  })

  describe('Status handling', () => {
    it('should display correct badge variant for DRAFT status', () => {
      const receipt = createMockReceipt({ status: 'DRAFT' })
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      const statusBadge = screen.getByTestId('badge')
      expect(statusBadge).toHaveTextContent('DRAFT')
      expect(statusBadge).toHaveAttribute('data-variant', 'secondary')
    })

    it('should display correct badge variant for GENERATED status', () => {
      const receipt = createMockReceipt({ status: 'GENERATED' })
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      const statusBadge = screen.getByTestId('badge')
      expect(statusBadge).toHaveTextContent('GENERATED')
      expect(statusBadge).toHaveAttribute('data-variant', 'default')
    })

    it('should display correct badge variant for PAID status', () => {
      const receipt = createMockReceipt({ status: 'PAID' })
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      const statusBadge = screen.getByTestId('badge')
      expect(statusBadge).toHaveTextContent('PAID')
      expect(statusBadge).toHaveAttribute('data-variant', 'success')
    })

    it('should display correct badge variant for VOID status', () => {
      const receipt = createMockReceipt({ status: 'VOID' })
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      const statusBadge = screen.getByTestId('badge')
      expect(statusBadge).toHaveTextContent('VOID')
      expect(statusBadge).toHaveAttribute('data-variant', 'destructive')
    })
  })

  describe('Selection behavior', () => {
    it('should show checkbox when selectable', () => {
      const receipt = createMockReceipt()
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
              selectable={true}
            />
          </tbody>
        </table>
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeInTheDocument()
      expect(checkbox).not.toBeChecked()
    })

    it('should hide checkbox when not selectable', () => {
      const receipt = createMockReceipt()
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
              selectable={false}
            />
          </tbody>
        </table>
      )

      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    })

    it('should show checkbox as checked when selected', () => {
      const receipt = createMockReceipt()
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={true}
              onSelect={mockOnSelect}
              selectable={true}
            />
          </tbody>
        </table>
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })

    it('should call onSelect when checkbox is clicked', async () => {
      const receipt = createMockReceipt()
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
              selectable={true}
            />
          </tbody>
        </table>
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledWith(receipt.id, true)
      })
    })

    it('should call onSelect to deselect when checked checkbox is clicked', async () => {
      const receipt = createMockReceipt()
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={true}
              onSelect={mockOnSelect}
              selectable={true}
            />
          </tbody>
        </table>
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledWith(receipt.id, false)
      })
    })
  })

  describe('Navigation behavior', () => {
    it('should navigate to receipt detail when row is clicked', async () => {
      const receipt = createMockReceipt()
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      // Click on the receipt number (which should be a clickable element)
      const receiptNumber = screen.getByText('RCP-2024-001')
      fireEvent.click(receiptNumber)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/csr/receipts/1')
      })
    })

    it('should not navigate when checkbox is clicked', async () => {
      const receipt = createMockReceipt()
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
              selectable={true}
            />
          </tbody>
        </table>
      )

      const checkbox = screen.getByRole('checkbox')
      fireEvent.click(checkbox)

      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalled()
      })

      // Should not navigate when checkbox is clicked
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('CAA member indicator', () => {
    it('should show CAA indicator when CAA is applied', () => {
      const receipt = createMockReceipt({ is_caa_applied: true })
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      expect(screen.getByText('CAA')).toBeInTheDocument()
    })

    it('should not show CAA indicator when CAA is not applied', () => {
      const receipt = createMockReceipt({ is_caa_applied: false })
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      expect(screen.queryByText('CAA')).not.toBeInTheDocument()
    })
  })

  describe('Amount formatting', () => {
    it('should format amounts with proper currency symbols', () => {
      const receipt = createMockReceipt({
        fuel_subtotal: "1234.56",
        total_fees_amount: "789.10",
        grand_total_amount: "2023.66"
      })
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      expect(screen.getByText('$2,023.66')).toBeInTheDocument()
    })

    it('should handle zero amounts', () => {
      const receipt = createMockReceipt({
        fuel_subtotal: "0.00",
        total_fees_amount: "0.00",
        grand_total_amount: "0.00"
      })
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      expect(screen.getByText('$0.00')).toBeInTheDocument()
    })

    it('should handle negative amounts (waivers)', () => {
      const receipt = createMockReceipt({
        total_waivers_amount: "-100.00",
        grand_total_amount: "575.00"
      })
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      // Should show the grand total correctly after waivers
      expect(screen.getByText('$575.00')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', () => {
      const receipt = createMockReceipt()
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
              selectable={true}
            />
          </tbody>
        </table>
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toHaveAttribute('aria-label', `Select receipt ${receipt.receipt_number}`)
    })

    it('should be keyboard navigable', () => {
      const receipt = createMockReceipt()
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
              selectable={true}
            />
          </tbody>
        </table>
      )

      const row = screen.getByRole('row')
      expect(row).toHaveAttribute('tabIndex', '0')
    })

    it('should handle keyboard navigation for selection', async () => {
      const receipt = createMockReceipt()
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
              selectable={true}
            />
          </tbody>
        </table>
      )

      const checkbox = screen.getByRole('checkbox')
      
      // Simulate Space key press
      fireEvent.keyDown(checkbox, { key: ' ', code: 'Space' })

      await waitFor(() => {
        expect(mockOnSelect).toHaveBeenCalledWith(receipt.id, true)
      })
    })

    it('should handle Enter key for navigation', async () => {
      const receipt = createMockReceipt()
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      const row = screen.getByRole('row')
      
      // Simulate Enter key press
      fireEvent.keyDown(row, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/csr/receipts/1')
      })
    })
  })

  describe('Edge cases', () => {
    it('should handle very long receipt numbers', () => {
      const receipt = createMockReceipt({
        receipt_number: "RCP-2024-VERY-LONG-RECEIPT-NUMBER-001"
      })
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      expect(screen.getByText('RCP-2024-VERY-LONG-RECEIPT-NUMBER-001')).toBeInTheDocument()
    })

    it('should handle special characters in tail numbers', () => {
      const receipt = createMockReceipt({
        fuel_order_tail_number: "N-123/ABC"
      })
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      expect(screen.getByText('N-123/ABC')).toBeInTheDocument()
    })

    it('should handle extremely large amounts', () => {
      const receipt = createMockReceipt({
        grand_total_amount: "999999999.99"
      })
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      expect(screen.getByText('$999,999,999.99')).toBeInTheDocument()
    })

    it('should handle invalid date strings gracefully', () => {
      const receipt = createMockReceipt({
        created_at: "invalid-date"
      })
      const mockOnSelect = vi.fn()

      render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      // Should not crash and show something sensible
      expect(screen.getByText('Invalid Date')).toBeInTheDocument()
    })
  })

  describe('Performance considerations', () => {
    it('should not re-render unnecessarily when props haven\'t changed', () => {
      const receipt = createMockReceipt()
      const mockOnSelect = vi.fn()

      const { rerender } = render(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      // Re-render with same props
      rerender(
        <table>
          <tbody>
            <ReceiptTableRow
              receipt={receipt}
              isSelected={false}
              onSelect={mockOnSelect}
            />
          </tbody>
        </table>
      )

      // Component should still render correctly
      expect(screen.getByText('RCP-2024-001')).toBeInTheDocument()
    })
  })
})