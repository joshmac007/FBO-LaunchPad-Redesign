import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeeScheduleTable } from '@/app/admin/fbo-config/fee-management/components/FeeScheduleTable';
import { GlobalFeeSchedule, GlobalFeeRule } from '@/app/services/admin-fee-config-service';

// Mock data factory for testing
const createMockFeeSchedule = (): GlobalFeeSchedule => ({
  schedule: [
    {
      id: 1,
      name: 'Light Aircraft',
      aircraft_types: [
        {
          id: 1,
          name: 'Cessna 172',
          classification_id: 1,
          base_min_fuel_gallons_for_waiver: 50,
          fees: {
            '1': {
              fee_rule_id: 1,
              final_display_value: 100,
              is_aircraft_override: false,
              revert_to_value: 100,
              classification_default: 100,
              global_default: 100,
              final_caa_display_value: 120,
              is_caa_aircraft_override: false,
              revert_to_caa_value: 120,
            },
            '2': {
              fee_rule_id: 2,
              final_display_value: 25,
              is_aircraft_override: false,
              revert_to_value: 25,
              classification_default: 25,
              global_default: 25,
              final_caa_display_value: 30,
              is_caa_aircraft_override: false,
              revert_to_caa_value: 30,
            }
          },
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
        }
      ],
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
    }
  ],
  fee_rules: [
    {
      id: 1,
      fee_name: 'Ramp Fee',
      fee_code: 'RAMP',
      applies_to_classification_id: 1,
      amount: 100,
      currency: 'USD',
      is_taxable: true,
      is_manually_waivable: true,
      calculation_basis: 'FIXED_PRICE',
      waiver_strategy: 'SIMPLE_MULTIPLIER',
      simple_waiver_multiplier: 1.5,
      has_caa_override: true,
      caa_override_amount: 120,
      is_primary_fee: true,
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
    },
    {
      id: 2,
      fee_name: 'Parking Fee',
      fee_code: 'PARK',
      applies_to_classification_id: 1,
      amount: 25,
      currency: 'USD',
      is_taxable: false,
      is_manually_waivable: false,
      calculation_basis: 'FIXED_PRICE',
      waiver_strategy: 'NONE',
      has_caa_override: true,
      caa_override_amount: 30,
      is_primary_fee: false,
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
    }
  ],
  overrides: []
});

const mockPrimaryFeeRules: GlobalFeeRule[] = [
  {
    id: 1,
    fee_name: 'Ramp Fee',
    fee_code: 'RAMP',
    applies_to_classification_id: 1,
    amount: 100,
    currency: 'USD',
    is_taxable: true,
    is_manually_waivable: true,
    calculation_basis: 'FIXED_PRICE',
    waiver_strategy: 'SIMPLE_MULTIPLIER',
    simple_waiver_multiplier: 1.5,
    has_caa_override: true,
    caa_override_amount: 120,
    is_primary_fee: true,
    created_at: '2023-01-01',
    updated_at: '2023-01-01',
  },
  {
    id: 2,
    fee_name: 'Parking Fee',
    fee_code: 'PARK',
    applies_to_classification_id: 1,
    amount: 25,
    currency: 'USD',
    is_taxable: false,
    is_manually_waivable: false,
    calculation_basis: 'FIXED_PRICE',
    waiver_strategy: 'NONE',
    has_caa_override: true,
    caa_override_amount: 30,
    is_primary_fee: false,
    created_at: '2023-01-01',
    updated_at: '2023-01-01',
  }
];

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('FeeScheduleTable', () => {
  const defaultProps = {
    viewMode: 'standard' as const,
    searchTerm: '',
    primaryFeeRules: mockPrimaryFeeRules,
    globalData: createMockFeeSchedule(),
  };

  describe('Responsive Table with View Details', () => {
    it('should render aircraft rows with view details in actions menu', () => {
      renderWithQueryClient(<FeeScheduleTable {...defaultProps} />);
      
      // Should show the aircraft name
      expect(screen.getByText('Cessna 172')).toBeInTheDocument();
      
      // Should show actions dropdown button for aircraft row
      const actionsButtons = screen.getAllByRole('button');
      const aircraftActionsButton = actionsButtons.find(button => 
        button.querySelector('.lucide-ellipsis') !== null
      );
      expect(aircraftActionsButton).toBeInTheDocument();
    });

    it('should hide fee columns on mobile screens', () => {
      renderWithQueryClient(<FeeScheduleTable {...defaultProps} />);
      
      // The fee columns should have the responsive CSS classes
      const rampFeeHeader = screen.getByText('Ramp Fee').closest('th');
      const parkingFeeHeader = screen.getByText('Parking Fee').closest('th');
      
      expect(rampFeeHeader).toHaveClass('hidden', 'md:table-cell');
      expect(parkingFeeHeader).toHaveClass('hidden', 'md:table-cell');
    });

    it('should open view details dialog when View Details is clicked', async () => {
      renderWithQueryClient(<FeeScheduleTable {...defaultProps} />);
      
      // Find and click the actions dropdown
      const actionsButtons = screen.getAllByRole('button');
      const aircraftActionsButton = actionsButtons.find(button => 
        button.querySelector('.lucide-ellipsis') !== null
      );
      
      fireEvent.click(aircraftActionsButton!);
      
      // Wait for dropdown to appear and find View Details option
      const viewDetailsButton = await screen.findByText('View Details');
      expect(viewDetailsButton).toBeInTheDocument();
      
      // Click View Details
      fireEvent.click(viewDetailsButton);
      
      // Dialog should open with aircraft details
      expect(await screen.findByText('Aircraft Details - Cessna 172')).toBeInTheDocument();
    });

    it('should render classification groupings with aircraft counts', () => {
      renderWithQueryClient(<FeeScheduleTable {...defaultProps} />);
      
      // Should show the classification header
      expect(screen.getByText('Light Aircraft')).toBeInTheDocument();
      expect(screen.getByText('(1 aircraft)')).toBeInTheDocument();
      
      // Should show the aircraft under the classification
      expect(screen.getByText('Cessna 172')).toBeInTheDocument();
    });

    it('should have classification toggle button', () => {
      renderWithQueryClient(<FeeScheduleTable {...defaultProps} />);
      
      // Should have classification toggle button
      const buttons = screen.getAllByRole('button');
      const classificationToggleButton = buttons.find(button => 
        button.getAttribute('aria-label')?.includes('classification')
      );
      
      expect(classificationToggleButton).toBeInTheDocument();
    });
  });
});