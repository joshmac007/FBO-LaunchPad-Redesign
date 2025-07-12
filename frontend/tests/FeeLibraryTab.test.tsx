import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeeLibraryTab } from '@/app/admin/fbo-config/fee-management/components/FeeLibraryTab';
import { FeeRule, AircraftClassification } from '@/app/services/admin-fee-config-service';
import { UserPreferencesProvider } from '@/app/contexts/user-preferences-context';

// Mock the API services
jest.mock('@/app/services/admin-fee-config-service', () => ({
  getFeeRules: jest.fn(),
  getAircraftClassifications: jest.fn(),
  createFeeRule: jest.fn(),
  updateFeeRule: jest.fn(),
  deleteFeeRule: jest.fn(),
}));

// Mock the useUserPreferences hook
jest.mock('@/app/contexts/user-preferences-context', () => ({
  ...jest.requireActual('@/app/contexts/user-preferences-context'),
  useUserPreferences: () => ({
    preferences: { highlight_overrides: true, fee_schedule_column_codes: [] },
    updatePreferences: jest.fn(),
  }),
}));

// Mock data factories
const createMockFeeRule = (overrides?: Partial<FeeRule>): FeeRule => ({
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
  has_caa_override: false,
  caa_override_amount: undefined,
  caa_waiver_strategy_override: undefined,
  caa_simple_waiver_multiplier_override: undefined,
  is_primary_fee: true,
  created_at: '2023-01-01',
  updated_at: '2023-01-01',
  ...overrides,
});

const createMockGlobalFeeRule = (): FeeRule => createMockFeeRule({
  id: 2,
  fee_name: 'Handling Fee',
  fee_code: 'HANDLE',
  applies_to_classification_id: null, // Global fee
  amount: 50,
  is_primary_fee: false,
});

const createMockClassifications = (): AircraftClassification[] => [
  {
    id: 1,
    name: 'Light Aircraft',
  },
  {
    id: 2,
    name: 'Heavy Aircraft',
  },
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
      <UserPreferencesProvider>
        {component}
      </UserPreferencesProvider>
    </QueryClientProvider>
  );
};

describe('FeeLibraryTab', () => {
  const mockGetFeeRules = require('@/app/services/admin-fee-config-service').getFeeRules;
  const mockGetAircraftClassifications = require('@/app/services/admin-fee-config-service').getAircraftClassifications;
  const mockUpdateFeeRule = require('@/app/services/admin-fee-config-service').updateFeeRule;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFeeRules.mockResolvedValue([createMockFeeRule(), createMockGlobalFeeRule()]);
    mockGetAircraftClassifications.mockResolvedValue(createMockClassifications());
    mockUpdateFeeRule.mockResolvedValue(createMockFeeRule({ fee_name: 'Updated Ramp Fee' }));
  });

  describe('Fee Rule Editing', () => {
    it('should prefill form with existing fee rule data when editing', async () => {
      renderWithQueryClient(<FeeLibraryTab />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Ramp Fee')).toBeInTheDocument();
      });

      // Find and click the edit button for the first fee rule
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(button => 
        button.querySelector('.lucide-pencil') !== null
      );
      expect(editButton).toBeInTheDocument();
      
      fireEvent.click(editButton!);

      // Dialog should open with "Edit Fee Type" title
      await waitFor(() => {
        expect(screen.getByText('Edit Fee Type')).toBeInTheDocument();
      });

      // Check that form fields are prefilled with existing data
      const feeNameInput = screen.getByDisplayValue('Ramp Fee');
      const feeCodeInput = screen.getByDisplayValue('RAMP');
      const amountInput = screen.getByDisplayValue('100');
      
      expect(feeNameInput).toBeInTheDocument();
      expect(feeCodeInput).toBeInTheDocument();
      expect(amountInput).toBeInTheDocument();

      // Check that aircraft classification is selected (should show "Light Aircraft")
      const classificationSelect = screen.getByLabelText('Aircraft Classification');
      expect(classificationSelect).toHaveTextContent('Light Aircraft');

      // Check that switches are set correctly
      const taxableSwitch = screen.getByRole('switch', { name: /taxable/i });
      const waivableSwitch = screen.getByRole('switch', { name: /can be waived/i });
      const primaryFeeSwitch = screen.getByRole('switch', { name: /show as main column/i });
      
      expect(taxableSwitch).toBeChecked();
      expect(waivableSwitch).toBeChecked();
      expect(primaryFeeSwitch).toBeChecked();
    });

    it('should prefill form with global fee rule data correctly', async () => {
      renderWithQueryClient(<FeeLibraryTab />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Handling Fee')).toBeInTheDocument();
      });

      // Find the row for the global fee (Handling Fee) and click its edit button
      const rows = screen.getAllByRole('row');
      const handlingFeeRow = rows.find(row => row.textContent?.includes('Handling Fee'));
      expect(handlingFeeRow).toBeInTheDocument();
      
      const editButton = handlingFeeRow!.querySelector('button[aria-label*="edit"], button:has(.lucide-pencil)');
      expect(editButton).toBeInTheDocument();
      
      fireEvent.click(editButton!);

      // Dialog should open
      await waitFor(() => {
        expect(screen.getByText('Edit Fee Type')).toBeInTheDocument();
      });

      // Check that form fields are prefilled
      expect(screen.getByDisplayValue('Handling Fee')).toBeInTheDocument();
      expect(screen.getByDisplayValue('HANDLE')).toBeInTheDocument();
      expect(screen.getByDisplayValue('50')).toBeInTheDocument();

      // For global fees, the classification should show "Global Fee (applies to all aircraft)"
      const classificationSelect = screen.getByLabelText('Aircraft Classification');
      expect(classificationSelect).toHaveTextContent('Global Fee (applies to all aircraft)');

      // Check that primary fee switch is NOT checked for this fee
      const primaryFeeSwitch = screen.getByRole('switch', { name: /show as main column/i });
      expect(primaryFeeSwitch).not.toBeChecked();
    });

    it('should maintain form state when editing and show Update button', async () => {
      renderWithQueryClient(<FeeLibraryTab />);

      // Wait for data to load and open edit dialog
      await waitFor(() => {
        expect(screen.getByText('Ramp Fee')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(button => 
        button.querySelector('.lucide-pencil') !== null
      );
      fireEvent.click(editButton!);

      await waitFor(() => {
        expect(screen.getByText('Edit Fee Type')).toBeInTheDocument();
      });

      // Should show "Update" button instead of "Create"
      expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /create/i })).not.toBeInTheDocument();
    });

    it('should successfully update fee rule when Update button is clicked', async () => {
      renderWithQueryClient(<FeeLibraryTab />);

      // Wait for data to load and open edit dialog
      await waitFor(() => {
        expect(screen.getByText('Ramp Fee')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(button => 
        button.querySelector('.lucide-pencil') !== null
      );
      fireEvent.click(editButton!);

      await waitFor(() => {
        expect(screen.getByText('Edit Fee Type')).toBeInTheDocument();
      });

      // Modify the fee name
      const feeNameInput = screen.getByDisplayValue('Ramp Fee');
      fireEvent.change(feeNameInput, { target: { value: 'Updated Ramp Fee' } });

      // Check that the update button is enabled and clickable
      const updateButton = screen.getByRole('button', { name: /update/i });
      expect(updateButton).not.toBeDisabled();
      
      // Click Update button
      fireEvent.click(updateButton);

      // Verify the update API was called with correct data
      await waitFor(() => {
        expect(mockUpdateFeeRule).toHaveBeenCalledTimes(1);
      }, { timeout: 3000 });
      
      expect(mockUpdateFeeRule).toHaveBeenCalledWith(1, expect.objectContaining({
        fee_name: 'Updated Ramp Fee',
        fee_code: 'RAMP',
        applies_to_classification_id: 1,
        amount: 100,
        currency: 'USD',
        is_taxable: true,
        is_manually_waivable: true,
        calculation_basis: 'FIXED_PRICE',
        waiver_strategy: 'SIMPLE_MULTIPLIER',
        simple_waiver_multiplier: 1.5,
        has_caa_override: false,
        is_primary_fee: true,
      }));
    });

    it('should successfully update global fee rule with null classification', async () => {
      renderWithQueryClient(<FeeLibraryTab />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Handling Fee')).toBeInTheDocument();
      });

      // Find the row for the global fee (Handling Fee) and click its edit button
      const rows = screen.getAllByRole('row');
      const handlingFeeRow = rows.find(row => row.textContent?.includes('Handling Fee'));
      expect(handlingFeeRow).toBeInTheDocument();
      
      const editButton = handlingFeeRow!.querySelector('button[aria-label*="edit"], button:has(.lucide-pencil)');
      expect(editButton).toBeInTheDocument();
      
      fireEvent.click(editButton!);

      await waitFor(() => {
        expect(screen.getByText('Edit Fee Type')).toBeInTheDocument();
      });

      // Modify the amount
      const amountInput = screen.getByDisplayValue('50');
      fireEvent.change(amountInput, { target: { value: '75' } });

      // Click Update button
      const updateButton = screen.getByRole('button', { name: /update/i });
      fireEvent.click(updateButton);

      // Verify the update API was called with correct data including null for global fee
      await waitFor(() => {
        expect(mockUpdateFeeRule).toHaveBeenCalledWith(2, expect.objectContaining({
          fee_name: 'Handling Fee',
          fee_code: 'HANDLE',
          applies_to_classification_id: null, // Should be null for global fees
          amount: 75,
          currency: 'USD',
        }));
      });
    });
  });

  describe('New Fee Creation', () => {
    it('should show empty form when creating new fee', async () => {
      renderWithQueryClient(<FeeLibraryTab />);

      // Wait for component to load and click "Add Fee" button
      await waitFor(() => {
        expect(screen.getByText('Add Fee')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Add Fee'));

      // Dialog should open with "Create New Fee Type" title
      await waitFor(() => {
        expect(screen.getByText('Create New Fee Type')).toBeInTheDocument();
      });

      // Form fields should be empty/default
      const feeNameInput = screen.getByPlaceholderText('e.g., Ramp Fee');
      const feeCodeInput = screen.getByPlaceholderText('e.g., RAMP');
      const amountInput = screen.getByDisplayValue('0');
      
      expect(feeNameInput).toHaveValue('');
      expect(feeCodeInput).toHaveValue('');
      expect(amountInput).toBeInTheDocument();

      // Should show "Create" button
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /update/i })).not.toBeInTheDocument();
    });
  });

  describe('Inline Editing', () => {
    it('should enable inline editing for fee name', async () => {
      renderWithQueryClient(<FeeLibraryTab />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Ramp Fee')).toBeInTheDocument();
      });

      // Find the fee name cell and click it to edit
      const feeNameCell = screen.getByText('Ramp Fee');
      fireEvent.click(feeNameCell);

      // Should show input field with current value
      await waitFor(() => {
        expect(screen.getByDisplayValue('Ramp Fee')).toBeInTheDocument();
      });

      // Edit the value
      const input = screen.getByDisplayValue('Ramp Fee');
      fireEvent.change(input, { target: { value: 'Updated Ramp Fee' } });

      // Submit by pressing Enter
      fireEvent.keyDown(input, { key: 'Enter' });

      // Should call update API with debouncing
      await waitFor(() => {
        expect(mockUpdateFeeRule).toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('should enable inline editing for fee code', async () => {
      renderWithQueryClient(<FeeLibraryTab />);

      await waitFor(() => {
        expect(screen.getByText('RAMP')).toBeInTheDocument();
      });

      const feeCodeCell = screen.getByText('RAMP');
      fireEvent.click(feeCodeCell);

      await waitFor(() => {
        expect(screen.getByDisplayValue('RAMP')).toBeInTheDocument();
      });

      const input = screen.getByDisplayValue('RAMP');
      fireEvent.change(input, { target: { value: 'RAMP_NEW' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockUpdateFeeRule).toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('should enable inline editing for amount with currency formatting', async () => {
      renderWithQueryClient(<FeeLibraryTab />);

      await waitFor(() => {
        expect(screen.getByText('$100.00')).toBeInTheDocument();
      });

      const amountCell = screen.getByText('$100.00');
      fireEvent.click(amountCell);

      // Should show input with just the number
      await waitFor(() => {
        expect(screen.getByDisplayValue('100')).toBeInTheDocument();
      });

      const input = screen.getByDisplayValue('100');
      fireEvent.change(input, { target: { value: '150' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      await waitFor(() => {
        expect(mockUpdateFeeRule).toHaveBeenCalledWith(
          1, 
          expect.objectContaining({ amount: 150 })
        );
      }, { timeout: 1000 });
    });

    it('should enable toggle for waivable status', async () => {
      renderWithQueryClient(<FeeLibraryTab />);

      await waitFor(() => {
        expect(screen.getByText('Ramp Fee')).toBeInTheDocument();
      });

      // Find the waivable switch and toggle it
      const switches = screen.getAllByRole('switch');
      const waivableSwitch = switches.find(s => 
        s.closest('tr')?.textContent?.includes('Ramp Fee')
      );
      
      expect(waivableSwitch).toBeInTheDocument();
      expect(waivableSwitch).toBeChecked(); // Initially true from mock data

      fireEvent.click(waivableSwitch!);

      await waitFor(() => {
        expect(mockUpdateFeeRule).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ 
            is_manually_waivable: false 
          })
        );
      }, { timeout: 1000 });
    });

    it('should show validation errors for invalid input', async () => {
      renderWithQueryClient(<FeeLibraryTab />);

      await waitFor(() => {
        expect(screen.getByText('RAMP')).toBeInTheDocument();
      });

      const feeCodeCell = screen.getByText('RAMP');
      fireEvent.click(feeCodeCell);

      await waitFor(() => {
        expect(screen.getByDisplayValue('RAMP')).toBeInTheDocument();
      });

      const input = screen.getByDisplayValue('RAMP');
      fireEvent.change(input, { target: { value: 'invalid-code-with-dashes' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/must contain only uppercase letters/i)).toBeInTheDocument();
      });

      // Should not call API
      expect(mockUpdateFeeRule).not.toHaveBeenCalled();
    });

    it('should cancel edit on Escape key', async () => {
      renderWithQueryClient(<FeeLibraryTab />);

      await waitFor(() => {
        expect(screen.getByText('Ramp Fee')).toBeInTheDocument();
      });

      const feeNameCell = screen.getByText('Ramp Fee');
      fireEvent.click(feeNameCell);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Ramp Fee')).toBeInTheDocument();
      });

      const input = screen.getByDisplayValue('Ramp Fee');
      fireEvent.change(input, { target: { value: 'Modified Name' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      // Should revert to original value
      await waitFor(() => {
        expect(screen.getByText('Ramp Fee')).toBeInTheDocument();
        expect(screen.queryByDisplayValue('Modified Name')).not.toBeInTheDocument();
      });

      // Should not call API
      expect(mockUpdateFeeRule).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockUpdateFeeRule.mockRejectedValue(new Error('Network error'));
      
      renderWithQueryClient(<FeeLibraryTab />);

      await waitFor(() => {
        expect(screen.getByText('Ramp Fee')).toBeInTheDocument();
      });

      const feeNameCell = screen.getByText('Ramp Fee');
      fireEvent.click(feeNameCell);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Ramp Fee')).toBeInTheDocument();
      });

      const input = screen.getByDisplayValue('Ramp Fee');
      fireEvent.change(input, { target: { value: 'Updated Name' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // Should handle error and revert optimistic update
      await waitFor(() => {
        expect(mockUpdateFeeRule).toHaveBeenCalled();
      }, { timeout: 1000 });
      
      // Should return to edit mode after error
      await waitFor(() => {
        expect(screen.getByDisplayValue('Updated Name')).toBeInTheDocument();
      });
    });

    it('should prevent editing when mutations are pending', async () => {
      // Mock a slow API call
      mockUpdateFeeRule.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      renderWithQueryClient(<FeeLibraryTab />);

      await waitFor(() => {
        expect(screen.getByText('Ramp Fee')).toBeInTheDocument();
      });

      const feeNameCell = screen.getByText('Ramp Fee');
      fireEvent.click(feeNameCell);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Ramp Fee')).toBeInTheDocument();
      });

      const input = screen.getByDisplayValue('Ramp Fee');
      fireEvent.change(input, { target: { value: 'Updated Name' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      // Should show pending state
      await waitFor(() => {
        expect(mockUpdateFeeRule).toHaveBeenCalled();
      });

      // Try to click another cell while pending
      const anotherCell = screen.getByText('RAMP');
      fireEvent.click(anotherCell);

      // Should not enter edit mode due to pending state
      expect(screen.queryByDisplayValue('RAMP')).not.toBeInTheDocument();
    });
  });
});