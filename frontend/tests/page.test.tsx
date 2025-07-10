// frontend/app/csr/receipts/[id]/page.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReceiptDetailPage from '@/app/csr/receipts/[id]/page';
import * as receiptService from '@/app/services/receipt-service';

jest.mock('@/app/services/receipt-service');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useParams: () => ({ id: '1024' }),
}));
jest.mock('../app/csr/receipts/components/ReceiptDetailView', () => {
  return function MockReceiptDetailView() {
    return <div>Receipt Detail View</div>;
  };
});
jest.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    user: { id: 1, name: 'Test User' },
    hasPermission: () => true,
  }),
}));
jest.mock('@/app/services/fee-service', () => ({
  getAvailableServices: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/app/services/customer-service', () => ({}));
// Mock useDebounce to simulate immediate value change for fuel quantity 
// but keep original debouncing for other updates
jest.mock('@/hooks/useDebounce', () => {
  const actual = jest.requireActual('@/hooks/useDebounce');
  return {
    useDebounce: jest.fn().mockImplementation((value: any, delay: number) => {
      // For the test, return value immediately for fuel quantity changes
      // This simulates the debounce completing
      return value;
    }),
  };
});

const mockedReceiptService = receiptService as jest.Mocked<typeof receiptService>;

describe('ReceiptDetailPage Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
  });

  it('should call calculateFeesForReceipt after a user edits a field that triggers recalculation', async () => {
    // 1. Setup: Mock initial API response for getReceiptById.
    const initialReceipt = {
      id: 1024,
      status: 'DRAFT',
      fuel_quantity_gallons_at_receipt_time: '500.00',
      line_items: [
        {
          id: 1,
          line_item_type: 'FUEL',
          description: 'JET_A Fuel',
          amount: '2875.00',
          quantity: '500.00',
          unit_price: '5.75'
        },
        {
          id: 2,
          line_item_type: 'FEE',
          description: 'Ramp Fee',
          amount: '100.00',
          quantity: '1.00',
          unit_price: '100.00',
          is_manually_waivable: true,
          fee_code_applied: 'RAMP_FEE'
        }
      ],
      grand_total_amount: '2975.00'
    };
    
    const updatedReceipt = { 
      ...initialReceipt, 
      fuel_quantity_gallons_at_receipt_time: '600.00',
      grand_total_amount: '5000.00',
      line_items: [
        {
          id: 1,
          line_item_type: 'FUEL',
          description: 'JET_A Fuel',
          amount: '3450.00',
          quantity: '600.00',
          unit_price: '5.75'
        },
        {
          id: 2,
          line_item_type: 'FEE',
          description: 'Ramp Fee',
          amount: '100.00',
          quantity: '1.00',
          unit_price: '100.00',
          is_manually_waivable: true,
          fee_code_applied: 'RAMP_FEE'
        },
        // Automatic waiver added due to higher fuel quantity
        {
          id: 3,
          line_item_type: 'WAIVER',
          description: 'Fuel Uplift Waiver (Ramp Fee)',
          amount: '-100.00',
          quantity: '1.00',
          unit_price: '-100.00',
          fee_code_applied: 'RAMP_FEE',
          waiver_source: 'AUTOMATIC'
        }
      ]
    };
    
    mockedReceiptService.getReceiptById.mockResolvedValue(initialReceipt as any);
    mockedReceiptService.calculateFeesForReceipt.mockResolvedValue(updatedReceipt as any);

    render(<ReceiptDetailPage />);
    
    // Wait for initial load - look for draft status since that's when 2-column layout shows
    await waitFor(() => {
      expect(screen.getByTestId('receipt-workspace')).toBeInTheDocument();
      expect(screen.getByText('DRAFT')).toBeInTheDocument();
    });
    
    // Find the fuel quantity input
    const quantityInput = screen.getByTestId('fuel-quantity-input');

    // 2. Action: Simulate user typing.
    await userEvent.clear(quantityInput);
    await userEvent.type(quantityInput, '600');

    // 3. Assert (pre-interaction): API has not been called yet.
    expect(mockedReceiptService.calculateFeesForReceipt).not.toHaveBeenCalled();

    // 4. Wait a moment for React to process the change and trigger the effect
    await waitFor(() => {
      expect(mockedReceiptService.calculateFeesForReceipt).toHaveBeenCalledTimes(1);
    }, { timeout: 3000 });

    // 5. Assert UI update: The preview now shows the new total.
    expect(await screen.findByText('$5,000.00')).toBeInTheDocument();
    
    // 6. Assert that automatic waiver is shown in the preview
    expect(await screen.findByText('[⛽ Auto-waived]')).toBeInTheDocument();
  });

  it('should handle receipt loading states correctly', async () => {
    // Test loading state
    mockedReceiptService.getReceiptById.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<ReceiptDetailPage />);
    
    expect(screen.getByText('Loading receipt...')).toBeInTheDocument();
  });

  it('should handle receipt not found error', async () => {
    mockedReceiptService.getReceiptById.mockRejectedValue(new Error('Receipt not found'));

    render(<ReceiptDetailPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Error Loading Receipt')).toBeInTheDocument();
      expect(screen.getByText('Failed to load receipt')).toBeInTheDocument();
    });
  });
});