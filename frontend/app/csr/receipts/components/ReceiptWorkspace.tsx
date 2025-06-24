"use client"

import { useEffect, useReducer, useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Calculator, FileText, CheckCircle, AlertCircle } from "lucide-react"
import ReceiptHeader from "./ReceiptHeader"
import ReceiptLineItemsList from "./ReceiptLineItemsList"
import ReceiptTotals from "./ReceiptTotals"
import AdditionalServicesForm, { type SelectedService } from "./AdditionalServicesForm"
import { useDebounce } from "@/hooks/useDebounce"
import { 
  ExtendedReceipt, 
  getReceiptById, 
  updateDraftReceipt, 
  calculateFeesForReceipt, 
  generateFinalReceipt, 
  markReceiptAsPaid,
  toggleLineItemWaiver
} from "@/app/services/receipt-service"
import { getAvailableServices, type AvailableService } from "@/app/services/fee-service"
import { usePermissions } from "@/hooks/usePermissions"
import type { Customer } from "@/app/services/customer-service"

interface ReceiptWorkspaceProps {
  receiptId: number
}

// State interface for useReducer
interface ReceiptState {
  receipt: ExtendedReceipt | null
  status: 'idle' | 'loading_initial' | 'calculating_fees' | 'generating' | 'marking_paid' | 'error'
  error: string | null
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'error'
  pendingUpdates: Record<string, any>
  selectedServices: SelectedService[]
}

// Action types for useReducer
type ReceiptAction =
  | { type: 'LOADING_INITIAL' }
  | { type: 'LOAD_SUCCESS'; payload: ExtendedReceipt }
  | { type: 'LOAD_ERROR'; payload: string }
  | { type: 'CALCULATING_FEES' }
  | { type: 'CALCULATION_SUCCESS'; payload: ExtendedReceipt }
  | { type: 'CALCULATION_ERROR'; payload: string }
  | { type: 'GENERATING_RECEIPT' }
  | { type: 'GENERATION_SUCCESS'; payload: ExtendedReceipt }
  | { type: 'GENERATION_ERROR'; payload: string }
  | { type: 'MARKING_PAID' }
  | { type: 'MARK_PAID_SUCCESS'; payload: ExtendedReceipt }
  | { type: 'MARK_PAID_ERROR'; payload: string }
  | { type: 'UPDATE_RECEIPT'; payload: Partial<ExtendedReceipt> }
  | { type: 'SET_PENDING_UPDATES'; payload: Record<string, any> }
  | { type: 'CLEAR_PENDING_UPDATES' }
  | { type: 'AUTO_SAVE_START' }
  | { type: 'AUTO_SAVE_SUCCESS' }
  | { type: 'AUTO_SAVE_ERROR' }
  | { type: 'ADD_SERVICE'; payload: SelectedService }
  | { type: 'REMOVE_SERVICE'; payload: string }

// Reducer function
function receiptReducer(state: ReceiptState, action: ReceiptAction): ReceiptState {
  switch (action.type) {
    case 'LOADING_INITIAL':
      return { ...state, status: 'loading_initial', error: null }
    
    case 'LOAD_SUCCESS':
      return { ...state, status: 'idle', receipt: action.payload, error: null }
    
    case 'LOAD_ERROR':
      return { ...state, status: 'error', error: action.payload }
    
    case 'CALCULATING_FEES':
      return { ...state, status: 'calculating_fees', error: null }
    
    case 'CALCULATION_SUCCESS':
      return { ...state, status: 'idle', receipt: action.payload, error: null }
    
    case 'CALCULATION_ERROR':
      return { ...state, status: 'error', error: action.payload }
    
    case 'GENERATING_RECEIPT':
      return { ...state, status: 'generating', error: null }
    
    case 'GENERATION_SUCCESS':
      return { ...state, status: 'idle', receipt: action.payload, error: null }
    
    case 'GENERATION_ERROR':
      return { ...state, status: 'error', error: action.payload }
    
    case 'MARKING_PAID':
      return { ...state, status: 'marking_paid', error: null }
    
    case 'MARK_PAID_SUCCESS':
      return { ...state, status: 'idle', receipt: action.payload, error: null }
    
    case 'MARK_PAID_ERROR':
      return { ...state, status: 'error', error: action.payload }
    
    case 'UPDATE_RECEIPT':
      return { 
        ...state, 
        receipt: state.receipt ? { ...state.receipt, ...action.payload } : null 
      }
    
    case 'SET_PENDING_UPDATES':
      return { 
        ...state, 
        pendingUpdates: { ...state.pendingUpdates, ...action.payload }
      }
    
    case 'CLEAR_PENDING_UPDATES':
      return { ...state, pendingUpdates: {} }
    
    case 'AUTO_SAVE_START':
      return { ...state, autoSaveStatus: 'saving' }
    
    case 'AUTO_SAVE_SUCCESS':
      return { ...state, autoSaveStatus: 'saved', pendingUpdates: {} }
    
    case 'AUTO_SAVE_ERROR':
      return { ...state, autoSaveStatus: 'error' }
    
    case 'ADD_SERVICE':
      return { 
        ...state, 
        selectedServices: [...state.selectedServices, action.payload] 
      }
    
    case 'REMOVE_SERVICE':
      return { 
        ...state, 
        selectedServices: state.selectedServices.filter(s => s.fee_code !== action.payload) 
      }
    
    default:
      return state
  }
}

// Initial state
const initialState: ReceiptState = {
  receipt: null,
  status: 'idle',
  error: null,
  autoSaveStatus: 'idle',
  pendingUpdates: {},
  selectedServices: []
}

export default function ReceiptWorkspace({ receiptId }: ReceiptWorkspaceProps) {
  const [state, dispatch] = useReducer(receiptReducer, initialState)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [availableServices, setAvailableServices] = useState<AvailableService[]>([])
  const [isTogglingWaiver, setIsTogglingWaiver] = useState<number | null>(null)
  const { user } = usePermissions()

  // Debounce pending updates with 1 second delay
  const debouncedPendingUpdates = useDebounce(state.pendingUpdates, 1000)

  // Load initial receipt data
  useEffect(() => {
    const loadReceipt = async () => {
      dispatch({ type: 'LOADING_INITIAL' })
      try {
        const receipt = await getReceiptById(receiptId)
        dispatch({ type: 'LOAD_SUCCESS', payload: receipt })
      } catch (error) {
        dispatch({ type: 'LOAD_ERROR', payload: error instanceof Error ? error.message : 'Failed to load receipt' })
      }
    }

    loadReceipt()
  }, [receiptId])

  // Load available services
  useEffect(() => {
    const loadServices = async () => {
      if (!user?.fbo_id) return
      try {
        const services = await getAvailableServices(user.fbo_id)
        setAvailableServices(services)
      } catch (error) {
        console.error('Error loading available services:', error)
      }
    }

    loadServices()
  }, [user?.fbo_id])

  // Auto-save when debounced pending updates change
  useEffect(() => {
    const performAutoSave = async () => {
      // Only save if there are pending updates and receipt is a draft
      if (Object.keys(debouncedPendingUpdates).length === 0 || 
          !state.receipt || 
          state.receipt.status !== 'DRAFT') {
        return
      }

      dispatch({ type: 'AUTO_SAVE_START' })
      try {
        await updateDraftReceipt(receiptId, debouncedPendingUpdates)
        dispatch({ type: 'AUTO_SAVE_SUCCESS' })
        
        // Clear saved status after 2 seconds
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current)
        }
        autoSaveTimeoutRef.current = setTimeout(() => {
          dispatch({ type: 'AUTO_SAVE_SUCCESS' })
        }, 2000)
      } catch (error) {
        console.error('Auto-save failed:', error)
        dispatch({ type: 'AUTO_SAVE_ERROR' })
      }
    }

    performAutoSave()
  }, [debouncedPendingUpdates, receiptId, state.receipt])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  // Helper function to queue updates for debounced auto-save
  const queueAutoSave = useCallback((updates: Record<string, any>) => {
    if (state.receipt?.status === 'DRAFT') {
      dispatch({ type: 'SET_PENDING_UPDATES', payload: updates })
    }
  }, [state.receipt?.status])

  // Event handlers
  const handleCustomerSelected = (customer: Customer) => {
    dispatch({ type: 'UPDATE_RECEIPT', payload: { customerId: customer.id, customer: customer.name } })
    queueAutoSave({ customerId: customer.id })
  }

  const handleAircraftTypeChange = (aircraftType: string) => {
    dispatch({ type: 'UPDATE_RECEIPT', payload: { aircraftTypeAtReceiptTime: aircraftType } })
    queueAutoSave({ aircraftType: aircraftType })
  }

  const handleNotesChange = (notes: string) => {
    dispatch({ type: 'UPDATE_RECEIPT', payload: { notes } })
    queueAutoSave({ notes: notes })
  }

  const handleAddService = async (serviceCode: string, description: string) => {
    const service = availableServices.find(s => s.code === serviceCode)
    if (!service) return

    // Check if service is already selected
    const existingService = state.selectedServices.find(s => s.fee_code === serviceCode)
    if (existingService) {
      // Increase quantity if already selected
      const updatedService = { ...existingService, quantity: existingService.quantity + 1 }
      dispatch({ type: 'REMOVE_SERVICE', payload: serviceCode })
      dispatch({ type: 'ADD_SERVICE', payload: updatedService })
    } else {
      // Add new service
      const selectedService: SelectedService = {
        fee_code: serviceCode,
        description: service.description,
        quantity: 1,
        price: service.price
      }
      dispatch({ type: 'ADD_SERVICE', payload: selectedService })
    }
  }

  const handleRemoveService = (serviceCode: string) => {
    dispatch({ type: 'REMOVE_SERVICE', payload: serviceCode })
  }

  const handleToggleWaiver = async (lineItemId: number) => {
    if (!state.receipt) return

    setIsTogglingWaiver(lineItemId)
    try {
      const updatedReceipt = await toggleLineItemWaiver(receiptId, lineItemId)
      dispatch({ type: 'CALCULATION_SUCCESS', payload: updatedReceipt })
    } catch (error) {
      console.error('Error toggling waiver:', error)
      // You could add a toast notification here or show an error state
    } finally {
      setIsTogglingWaiver(null)
    }
  }

  const handleCalculateFees = async () => {
    if (!state.receipt) return

    dispatch({ type: 'CALCULATING_FEES' })
    try {
      // Convert selected services to the format expected by the API
      const additionalServices = state.selectedServices.map(service => ({
        fee_code: service.fee_code,
        quantity: service.quantity
      }))

      const calculatedReceipt = await calculateFeesForReceipt(receiptId, additionalServices)
      dispatch({ type: 'CALCULATION_SUCCESS', payload: calculatedReceipt })
    } catch (error) {
      dispatch({ type: 'CALCULATION_ERROR', payload: error instanceof Error ? error.message : 'Fee calculation failed' })
    }
  }

  const handleGenerateReceipt = async () => {
    if (!state.receipt) return

    dispatch({ type: 'GENERATING_RECEIPT' })
    try {
      const generatedReceipt = await generateFinalReceipt(receiptId)
      dispatch({ type: 'GENERATION_SUCCESS', payload: generatedReceipt })
    } catch (error) {
      dispatch({ type: 'GENERATION_ERROR', payload: error instanceof Error ? error.message : 'Receipt generation failed' })
    }
  }

  const handleMarkAsPaid = async () => {
    if (!state.receipt) return

    dispatch({ type: 'MARKING_PAID' })
    try {
      const paidReceipt = await markReceiptAsPaid(receiptId)
      dispatch({ type: 'MARK_PAID_SUCCESS', payload: paidReceipt })
    } catch (error) {
      dispatch({ type: 'MARK_PAID_ERROR', payload: error instanceof Error ? error.message : 'Failed to mark as paid' })
    }
  }

  // Loading state
  if (state.status === 'loading_initial') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading receipt...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (state.status === 'error' || !state.receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription data-cy="error-message">
            {state.error || 'Failed to load receipt'}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const isReadOnly = state.receipt.status !== 'DRAFT'
  const canCalculateFees = state.receipt.status === 'DRAFT'
  const canGenerateReceipt = state.receipt.grand_total_amount !== undefined && parseFloat(state.receipt.grand_total_amount) > 0
  const canMarkAsPaid = state.receipt.status === 'GENERATED'

  return (
    <div className="container mx-auto px-4 py-6 space-y-6" data-testid="receipt-workspace">
      {/* Auto-save indicator */}
      {state.autoSaveStatus === 'saving' && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-blue-100 border border-blue-200 rounded-md px-3 py-2 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-blue-700">Saving...</span>
          </div>
        </div>
      )}
      
      {state.autoSaveStatus === 'saved' && (
        <div className="fixed top-4 right-4 z-50" data-cy="auto-save-indicator">
          <div className="bg-green-100 border border-green-200 rounded-md px-3 py-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">Saved</span>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription data-cy="error-message">
            {state.error}
          </AlertDescription>
        </Alert>
      )}

      {/* Receipt Header */}
      <ReceiptHeader
        receipt={state.receipt}
        onCustomerSelected={handleCustomerSelected}
        onAircraftTypeChange={handleAircraftTypeChange}
        isReadOnly={isReadOnly}
      />

      {/* Additional Services */}
      <AdditionalServicesForm
        onAddService={handleAddService}
        selectedServices={state.selectedServices}
        onRemoveService={handleRemoveService}
        isReadOnly={isReadOnly}
        isLoading={state.status === 'calculating_fees'}
      />

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={handleCalculateFees}
              disabled={!canCalculateFees || state.status === 'calculating_fees'}
              data-cy="calculate-fees-btn"
              className="flex-1 min-w-[200px]"
            >
              {state.status === 'calculating_fees' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" data-cy="calculating-fees-spinner" data-testid="calculating-fees-spinner" />
                  Calculating Fees...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate Fees
                </>
              )}
            </Button>

            <Button
              onClick={handleGenerateReceipt}
              disabled={!canGenerateReceipt || state.status === 'generating'}
              data-cy="generate-receipt-btn"
              variant="default"
              className="flex-1 min-w-[200px]"
            >
              {state.status === 'generating' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Receipt
                </>
              )}
            </Button>

            {canMarkAsPaid && (
              <Button
                onClick={handleMarkAsPaid}
                disabled={state.status === 'marking_paid'}
                data-cy="mark-as-paid-btn"
                variant="outline"
                className="flex-1 min-w-[200px]"
              >
                {state.status === 'marking_paid' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Marking as Paid...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark as Paid
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Line Items and Totals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReceiptLineItemsList 
          lineItems={state.receipt.lineItems || []} 
          availableServices={availableServices}
          receiptStatus={state.receipt.status}
          onToggleWaiver={handleToggleWaiver}
          isTogglingWaiver={isTogglingWaiver}
        />
        <ReceiptTotals receipt={state.receipt} />
      </div>

      {/* Notes Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              data-cy="receipt-notes"
              value={state.receipt.notes || ''}
              onChange={(e) => handleNotesChange(e.target.value)}
              disabled={isReadOnly}
              placeholder="Add any additional notes about this receipt..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 