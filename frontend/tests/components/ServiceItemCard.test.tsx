// frontend/app/csr/receipts/components/ServiceItemCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import ServiceItemCard from '@/app/csr/receipts/components/ServiceItemCard'; // This import will fail.

// Mock test data helpers
const mockFeeLineItem = {
  id: 1,
  line_item_type: 'FEE',
  description: 'Ramp Fee',
  amount: '50.00',
  fee_code_applied: 'RAMP_FEE',
  is_manually_waivable: true,
  waiver_source: null
};

const mockWaiverLineItem = {
  id: 2,
  line_item_type: 'WAIVER',
  description: 'Manual Waiver (Ramp Fee)',
  amount: '-50.00',
  fee_code_applied: 'RAMP_FEE',
  waiver_source: 'MANUAL'
};

const mockAutoWaiverLineItem = {
  id: 3,
  line_item_type: 'WAIVER',
  description: 'Fuel Uplift Waiver (Ramp Fee)',
  amount: '-50.00',
  fee_code_applied: 'RAMP_FEE',
  waiver_source: 'AUTOMATIC'
};

const mockNonWaivableFeeLineItem = {
  id: 4,
  line_item_type: 'FEE',
  description: 'Non-waivable Fee',
  amount: '25.00',
  fee_code_applied: 'NON_WAIVABLE',
  is_manually_waivable: false,
  waiver_source: null
};

describe('ServiceItemCard Waiver Controls', () => {
  const mockOnToggleWaiver = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the (Waive) link when the fee is manually waivable', () => {
    render(
      <ServiceItemCard 
        lineItem={mockFeeLineItem}
        relatedWaiver={null}
        onToggleWaiver={mockOnToggleWaiver}
      />
    );
    
    // Should show the waive link for manually waivable fees
    expect(screen.getByText('(Waive)')).toBeInTheDocument();
    expect(screen.getByText('(Waive)')).toBeInstanceOf(HTMLButtonElement);
  });

  it('renders nothing when the fee is not manually waivable and not waived', () => {
    render(
      <ServiceItemCard 
        lineItem={mockNonWaivableFeeLineItem}
        relatedWaiver={null}
        onToggleWaiver={mockOnToggleWaiver}
      />
    );
    
    // Should not show any waiver controls
    expect(screen.queryByText('(Waive)')).not.toBeInTheDocument();
    expect(screen.queryByText('[⛽ Auto-waived]')).not.toBeInTheDocument();
    expect(screen.queryByText('[👤 Manually Waived]')).not.toBeInTheDocument();
  });

  it('renders a static [Auto-waived] badge for automatic waivers', () => {
    render(
      <ServiceItemCard 
        lineItem={mockFeeLineItem}
        relatedWaiver={mockAutoWaiverLineItem}
        onToggleWaiver={mockOnToggleWaiver}
      />
    );
    
    // Should show static auto-waived badge (not clickable)
    const autoWaivedElement = screen.getByText('[⛽ Auto-waived]');
    expect(autoWaivedElement).toBeInTheDocument();
    expect(autoWaivedElement).not.toBeInstanceOf(HTMLButtonElement);
  });

  it('renders a clickable [Manually Waived] badge for manual waivers and calls prop on click', () => {
    render(
      <ServiceItemCard 
        lineItem={mockFeeLineItem}
        relatedWaiver={mockWaiverLineItem}
        onToggleWaiver={mockOnToggleWaiver}
      />
    );
    
    // Should show clickable manually waived badge
    const manualWaivedElement = screen.getByText('[👤 Manually Waived]');
    expect(manualWaivedElement).toBeInTheDocument();
    expect(manualWaivedElement).toBeInstanceOf(HTMLButtonElement);
    
    // Should call onToggleWaiver when clicked
    fireEvent.click(manualWaivedElement);
    expect(mockOnToggleWaiver).toHaveBeenCalledWith(mockFeeLineItem.id);
  });

  it('shows fee amount and description correctly', () => {
    render(
      <ServiceItemCard 
        lineItem={mockFeeLineItem}
        relatedWaiver={null}
        onToggleWaiver={mockOnToggleWaiver}
      />
    );
    
    expect(screen.getByText('Ramp Fee')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
  });
});