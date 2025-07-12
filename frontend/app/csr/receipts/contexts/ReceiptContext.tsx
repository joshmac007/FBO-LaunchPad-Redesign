"use client";

import { createContext, useContext } from 'react';
import type { ExtendedReceipt, ReceiptLineItem } from '@/app/services/receipt-service';
import type { AvailableService } from '@/app/services/fee-service';
import type { Customer } from '@/app/services/customer-service';

// This will be the return type of the useReceipt hook
export interface ReceiptContextType {
  // State
  receipt: ExtendedReceipt | null;
  status: 'idle' | 'loading_initial' | 'calculating_fees' | 'generating' | 'marking_paid' | 'error';
  error: string | null;
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error';
  availableServices: AvailableService[];
  isTogglingWaiver: number | null;
  isReadOnly: boolean;
  isManualReceipt: boolean;

  // Derived state
  canCalculateFees: boolean;
  canGenerateReceipt: boolean;
  canMarkAsPaid: boolean;
  missingFields: string[];

  // Handlers
  handleCustomerSelected: (customer: Customer) => void;
  handleAircraftTypeChange: (aircraftType: string) => void;
  handleFuelTypeChange: (fuelType: string) => void;
  handleFuelQuantityChange: (quantity: string) => void;
  handleFuelPriceChange: (price: string) => void;
  handleNotesChange: (notes: string) => void;
  handleToggleWaiver: (lineItemId: number) => Promise<void>;
  addLineItem: (serviceCode: string, quantity: number) => Promise<void>;
  removeLineItem: (lineItemId: number) => Promise<void>;
  updateLineItemQuantity: (lineItemId: number, newQuantity: number) => Promise<void>;
  updateLineItemUnitPrice: (lineItemId: number, newUnitPrice: number) => Promise<void>;
  handleGenerateReceipt: () => Promise<void>;
  handleMarkAsPaid: () => Promise<void>;
}

export const ReceiptContext = createContext<ReceiptContextType | undefined>(undefined);

export function useReceiptContext() {
  const context = useContext(ReceiptContext);
  if (context === undefined) {
    throw new Error('useReceiptContext must be used within a ReceiptProvider');
  }
  return context;
} 