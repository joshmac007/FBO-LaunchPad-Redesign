"use client";

import { useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  getReceiptById, 
  updateDraftReceipt, 
  calculateFeesForReceipt, 
  generateFinalReceipt, 
  markReceiptAsPaid,
  toggleLineItemWaiver,
  type ExtendedReceipt,
  type DraftUpdatePayload,
} from '@/app/services/receipt-service';
import { getAvailableServices, type AvailableService } from '@/app/services/fee-service';
import type { Customer } from '@/app/services/customer-service';

// --- STATE AND REDUCER ---

interface ReceiptState {
  receipt: ExtendedReceipt | null;
  status: 'idle' | 'loading_initial' | 'calculating_fees' | 'generating' | 'marking_paid' | 'error';
  error: string | null;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  pendingUpdates: Partial<DraftUpdatePayload>;
  availableServices: AvailableService[];
  isTogglingWaiver: number | null;
}

type ReceiptAction =
  | { type: 'LOADING_INITIAL' }
  | { type: 'LOAD_SUCCESS'; payload: ExtendedReceipt }
  | { type: 'LOAD_ERROR'; payload: string }
  | { type: 'ACTION_START'; payload: 'calculating_fees' | 'generating' | 'marking_paid' }
  | { type: 'ACTION_SUCCESS'; payload: ExtendedReceipt }
  | { type: 'ACTION_ERROR'; payload: string }
  | { type: 'UPDATE_OPTIMISTIC'; payload: Partial<ExtendedReceipt> }
  | { type: 'SET_PENDING_UPDATES'; payload: Partial<DraftUpdatePayload> }
  | { type: 'AUTO_SAVE_START' }
  | { type: 'AUTO_SAVE_SUCCESS'; payload: ExtendedReceipt }
  | { type: 'AUTO_SAVE_ERROR' }
  | { type: 'SET_AVAILABLE_SERVICES'; payload: AvailableService[] }
  | { type: 'SET_TOGGLING_WAIVER'; payload: number | null };

const initialState: ReceiptState = {
  receipt: null,
  status: 'idle',
  error: null,
  autoSaveStatus: 'idle',
  pendingUpdates: {},
  availableServices: [],
  isTogglingWaiver: null,
};

function receiptReducer(state: ReceiptState, action: ReceiptAction): ReceiptState {
  switch (action.type) {
    case 'LOADING_INITIAL':
      return { ...initialState, status: 'loading_initial' };
    case 'LOAD_SUCCESS':
      return { ...state, status: 'idle', receipt: action.payload, error: null };
    case 'LOAD_ERROR':
      return { ...state, status: 'error', error: action.payload };
    case 'ACTION_START':
      return { ...state, status: action.payload, error: null };
    case 'ACTION_SUCCESS':
      return { ...state, status: 'idle', receipt: action.payload, error: null };
    case 'ACTION_ERROR':
      return { ...state, status: 'error', error: action.payload };
    case 'UPDATE_OPTIMISTIC':
      return {
        ...state,
        receipt: state.receipt ? { ...state.receipt, ...action.payload } : null,
      };
    case 'SET_PENDING_UPDATES':
      return {
        ...state,
        pendingUpdates: { ...state.pendingUpdates, ...action.payload },
      };
    case 'AUTO_SAVE_START':
      return { ...state, autoSaveStatus: 'saving' };
    case 'AUTO_SAVE_SUCCESS':
         return {
        ...state,
        autoSaveStatus: 'saved',
        pendingUpdates: {},
        receipt: action.payload, // Update receipt with saved data
      };
    case 'AUTO_SAVE_ERROR':
      return { ...state, autoSaveStatus: 'error' };
    case 'SET_AVAILABLE_SERVICES':
      return { ...state, availableServices: action.payload };
    case 'SET_TOGGLING_WAIVER':
      return { ...state, isTogglingWaiver: action.payload };
    default:
      return state;
  }
}

// --- THE HOOK ---

export function useReceipt(receiptId: number) {
  const [state, dispatch] = useReducer(receiptReducer, initialState);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedPendingUpdates = useDebounce(state.pendingUpdates, 1500);

  // --- DATA FETCHING EFFECTS ---

  useEffect(() => {
    const loadReceipt = async () => {
      dispatch({ type: 'LOADING_INITIAL' });
      try {
        const receipt = await getReceiptById(receiptId);
        dispatch({ type: 'LOAD_SUCCESS', payload: receipt });
      } catch (error) {
        dispatch({ type: 'LOAD_ERROR', payload: error instanceof Error ? error.message : 'Failed to load receipt' });
      }
    };
    loadReceipt();
  }, [receiptId]);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const services = await getAvailableServices();
        dispatch({ type: 'SET_AVAILABLE_SERVICES', payload: services });
      } catch (error) {
        console.error('Error loading available services:', error);
      }
    };
    loadServices();
  }, []);

  // --- AUTO-SAVE EFFECT ---

  useEffect(() => {
    const performAutoSave = async () => {
      if (Object.keys(debouncedPendingUpdates).length === 0 || !state.receipt || state.receipt.status !== 'DRAFT') {
        return;
      }

      dispatch({ type: 'AUTO_SAVE_START' });
      try {
        const updatedReceipt = await updateDraftReceipt(receiptId, debouncedPendingUpdates);
        dispatch({ type: 'AUTO_SAVE_SUCCESS', payload: updatedReceipt });

        if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = setTimeout(() => {
          // Logic to fade out 'saved' status can be handled in UI component based on autoSaveStatus
        }, 2000);

      } catch (error) {
        console.error('Auto-save failed:', error);
        dispatch({ type: 'AUTO_SAVE_ERROR' });
      }
    };
    performAutoSave();
  }, [debouncedPendingUpdates, receiptId]);

  // Cleanup timeout
  useEffect(() => () => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
  }, []);

  // --- PRIVATE INTERNAL FUNCTIONS ---

  const recalculateWithUpdates = useCallback(async (services?: DraftUpdatePayload['additional_services']) => {
    if (!state.receipt) return;
    
    dispatch({ type: 'ACTION_START', payload: 'calculating_fees' });
    try {
      const calculatedReceipt = await calculateFeesForReceipt(receiptId, services || []);
      dispatch({ type: 'ACTION_SUCCESS', payload: calculatedReceipt });
    } catch (error) {
      dispatch({ type: 'ACTION_ERROR', payload: error instanceof Error ? error.message : 'Fee calculation failed' });
    }
  }, [receiptId, state.receipt]);

  // --- HANDLERS ---

  const queueAutoSave = useCallback((updates: Partial<DraftUpdatePayload>) => {
    if (state.receipt?.status === 'DRAFT') {
      dispatch({ type: 'SET_PENDING_UPDATES', payload: updates });
    }
  }, [state.receipt?.status]);

  const handleCustomerSelected = useCallback((customer: Customer) => {
    dispatch({ type: 'UPDATE_OPTIMISTIC', payload: { customer_id: customer.id, customer_name: customer.name } });
    queueAutoSave({ customer_id: customer.id });
  }, [queueAutoSave]);
  
  const handleAircraftTypeChange = useCallback((aircraftType: string) => {
    dispatch({ type: 'UPDATE_OPTIMISTIC', payload: { aircraft_type_at_receipt_time: aircraftType } });
    queueAutoSave({ aircraft_type_at_receipt_time: aircraftType });
  }, [queueAutoSave]);

  const handleFuelTypeChange = useCallback((fuelType: string) => {
    dispatch({ type: 'UPDATE_OPTIMISTIC', payload: { fuel_type_at_receipt_time: fuelType } });
    queueAutoSave({ fuel_type_at_receipt_time: fuelType });
  }, [queueAutoSave]);

  const handleFuelQuantityChange = useCallback((quantity: string) => {
    const numericQuantity = parseFloat(quantity) || 0;
    dispatch({ type: 'UPDATE_OPTIMISTIC', payload: { fuel_quantity_gallons_at_receipt_time: quantity } });
    queueAutoSave({ fuel_quantity_gallons_at_receipt_time: numericQuantity });
  }, [queueAutoSave]);
  
  const handleFuelPriceChange = useCallback((price: string) => {
    const numericPrice = parseFloat(price) || 0;
    dispatch({ type: 'UPDATE_OPTIMISTIC', payload: { fuel_unit_price_at_receipt_time: price } });
    queueAutoSave({ fuel_unit_price_at_receipt_time: numericPrice });
  }, [queueAutoSave]);

  const handleNotesChange = useCallback((notes: string) => {
    dispatch({ type: 'UPDATE_OPTIMISTIC', payload: { notes } });
    queueAutoSave({ notes });
  }, [queueAutoSave]);

  const handleToggleWaiver = useCallback(async (lineItemId: number) => {
    dispatch({ type: 'SET_TOGGLING_WAIVER', payload: lineItemId });
    try {
      const updatedReceipt = await toggleLineItemWaiver(receiptId, lineItemId);
      dispatch({ type: 'ACTION_SUCCESS', payload: updatedReceipt });
    } catch (error) {
      dispatch({ type: 'ACTION_ERROR', payload: error instanceof Error ? error.message : 'Failed to toggle waiver' });
    } finally {
      dispatch({ type: 'SET_TOGGLING_WAIVER', payload: null });
    }
  }, [receiptId]);

  const addLineItem = useCallback(async (serviceCode: string, quantity: number) => {
    if (!state.receipt) return;
    
    // Read current line items and construct service list
    const currentFeeItems = state.receipt.line_items
      .filter(item => item.line_item_type === 'FEE')
      .map(item => ({ 
        fee_code: item.fee_code_applied || '', 
        quantity: parseFloat(item.quantity) 
      }));
    
    // Append the new service
    const newServicesList = [...currentFeeItems, { fee_code: serviceCode, quantity }];
    
    // Trigger recalculation
    await recalculateWithUpdates(newServicesList);
  }, [state.receipt, recalculateWithUpdates]);

  const removeLineItem = useCallback(async (lineItemId: number) => {
    if (!state.receipt) return;
    
    // Read current line items and construct service list excluding the item to remove
    const filteredFeeItems = state.receipt.line_items
      .filter(item => item.line_item_type === 'FEE' && item.id !== lineItemId)
      .map(item => ({ 
        fee_code: item.fee_code_applied || '', 
        quantity: parseFloat(item.quantity) 
      }));
    
    // Trigger recalculation
    await recalculateWithUpdates(filteredFeeItems);
  }, [state.receipt, recalculateWithUpdates]);

  const updateLineItemQuantity = useCallback(async (lineItemId: number, newQuantity: number) => {
    if (!state.receipt) return;
    
    const targetItem = state.receipt.line_items.find(item => item.id === lineItemId);
    if (!targetItem) return;
    
    if (targetItem.line_item_type === 'FEE') {
      // For FEE items, update the service list and recalculate
      const updatedFeeItems = state.receipt.line_items
        .filter(item => item.line_item_type === 'FEE')
        .map(item => ({ 
          fee_code: item.fee_code_applied || '', 
          quantity: item.id === lineItemId ? newQuantity : parseFloat(item.quantity) 
        }));
      
      await recalculateWithUpdates(updatedFeeItems);
    } else if (targetItem.line_item_type === 'FUEL') {
      // For FUEL items, update via the fuel quantity handler
      handleFuelQuantityChange(newQuantity.toString());
    }
  }, [state.receipt, recalculateWithUpdates, handleFuelQuantityChange]);

  const updateLineItemUnitPrice = useCallback(async (lineItemId: number, newUnitPrice: number) => {
    if (!state.receipt) return;
    
    const targetItem = state.receipt.line_items.find(item => item.id === lineItemId);
    if (!targetItem) return;
    
    if (targetItem.line_item_type === 'FUEL') {
      // Only fuel items can have their unit price updated
      handleFuelPriceChange(newUnitPrice.toString());
    }
    // FEE items get their prices from the service definitions, not user input
  }, [state.receipt, handleFuelPriceChange]);

  const handleGenerateReceipt = useCallback(async () => {
    if (!state.receipt) return;
    dispatch({ type: 'ACTION_START', payload: 'generating' });
    try {
      const generatedReceipt = await generateFinalReceipt(receiptId);
      dispatch({ type: 'ACTION_SUCCESS', payload: generatedReceipt });
    } catch (error) {
      dispatch({ type: 'ACTION_ERROR', payload: error instanceof Error ? error.message : 'Receipt generation failed' });
    }
  }, [receiptId, state.receipt]);

  const handleMarkAsPaid = useCallback(async () => {
    if (!state.receipt) return;
    dispatch({ type: 'ACTION_START', payload: 'marking_paid' });
    try {
      const paidReceipt = await markReceiptAsPaid(receiptId);
      dispatch({ type: 'ACTION_SUCCESS', payload: paidReceipt });
    } catch (error) {
      dispatch({ type: 'ACTION_ERROR', payload: error instanceof Error ? error.message : 'Failed to mark as paid' });
    }
  }, [receiptId, state.receipt]);

  // --- DERIVED STATE ---

  const isReadOnly = useMemo(() => state.receipt?.status !== 'DRAFT', [state.receipt?.status]);
  const isManualReceipt = useMemo(() => state.receipt?.fuel_order_id === null, [state.receipt?.fuel_order_id]);
  
  const missingFields = useMemo(() => {
    if (!isManualReceipt || !state.receipt) return [];
    const missing: string[] = [];
    if (state.receipt.customer_name === 'Walk-in Customer') missing.push('customer');
    if (!state.receipt.aircraft_type_at_receipt_time) missing.push('aircraft type');
    if (!state.receipt.fuel_quantity_gallons_at_receipt_time || parseFloat(state.receipt.fuel_quantity_gallons_at_receipt_time) <= 0) missing.push('fuel quantity');
    if (!state.receipt.fuel_unit_price_at_receipt_time || parseFloat(state.receipt.fuel_unit_price_at_receipt_time) <= 0) missing.push('fuel price');
    return missing;
  }, [isManualReceipt, state.receipt]);

  const canCalculateFees = useMemo(() => state.receipt?.status === 'DRAFT' && (isManualReceipt ? missingFields.length === 0 : true), [state.receipt?.status, isManualReceipt, missingFields]);
  const canGenerateReceipt = useMemo(() => state.receipt?.grand_total_amount !== undefined && parseFloat(state.receipt.grand_total_amount) > 0, [state.receipt?.grand_total_amount]);
  const canMarkAsPaid = useMemo(() => state.receipt?.status === 'GENERATED', [state.receipt?.status]);

  return {
    // State
    receipt: state.receipt,
    status: state.status,
    error: state.error,
    autoSaveStatus: state.autoSaveStatus,
    availableServices: state.availableServices,
    isTogglingWaiver: state.isTogglingWaiver,
    
    // Derived State
    isReadOnly,
    isManualReceipt,
    missingFields,
    canCalculateFees,
    canGenerateReceipt,
    canMarkAsPaid,

    // Handlers
    handleCustomerSelected,
    handleAircraftTypeChange,
    handleFuelTypeChange,
    handleFuelQuantityChange,
    handleFuelPriceChange,
    handleNotesChange,
    handleToggleWaiver,
    addLineItem,
    removeLineItem,
    updateLineItemQuantity,
    updateLineItemUnitPrice,
    handleGenerateReceipt,
    handleMarkAsPaid,
  };
} 