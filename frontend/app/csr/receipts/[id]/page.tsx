"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { ArrowLeft, Plane } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import ReceiptWorkspace from "../components/ReceiptWorkspace"
import ReceiptDetailView from "../../receipts/components/ReceiptDetailView"
import { getReceiptById, ExtendedReceipt } from "@/app/services/receipt-service"
import { getFuelOrder, type FuelOrderDisplay } from "@/app/services/fuel-order-service"

export default function ReceiptDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [receipt, setReceipt] = useState<ExtendedReceipt | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReceipt()
  }, [params.id, searchParams])

  const loadReceipt = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const id = params.id as string
      
      if (id === 'new') {
        // Check for fuel_order_id query parameter
        const fuelOrderId = searchParams.get('fuel_order_id')
        
        if (fuelOrderId) {
          // Pre-populate receipt with fuel order data
          try {
            const fuelOrder = await getFuelOrder(parseInt(fuelOrderId, 10))
            
            // Create default receipt pre-populated with fuel order data
            const defaultReceipt: ExtendedReceipt = {
              id: null, // null indicates this is not yet saved
              receipt_number: null,
              fuel_order_id: fuelOrder.id,
              customer_id: fuelOrder.customer?.id || 100, // Use fuel order customer or default to Walk-in
              customer_name: fuelOrder.customer?.name || 'Walk-in Customer',
              fuel_order_tail_number: fuelOrder.aircraft?.tail_number || null,
              aircraft_type_at_receipt_time: fuelOrder.aircraft?.aircraft_type || null,
              fuel_type_at_receipt_time: fuelOrder.fuel_type || null,
              fuel_quantity_gallons_at_receipt_time: fuelOrder.gallons_dispensed?.toString() || fuelOrder.quantity || null,
              fuel_unit_price_at_receipt_time: null, // Will need to be set manually
              fuel_subtotal: '0.00',
              total_fees_amount: '0.00',
              total_waivers_amount: '0.00',
              tax_amount: '0.00',
              grand_total_amount: '0.00',
              status: 'DRAFT',
              notes: fuelOrder.notes || null,
              generated_at: null,
              paid_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              created_by_user_id: null,
              updated_by_user_id: null,
              line_items: []
            }
            setReceipt(defaultReceipt)
            return
          } catch (fuelOrderError) {
            console.error("Error loading fuel order:", fuelOrderError)
            setError("Failed to load fuel order data")
            return
          }
        }
        
        // Create a default client-side receipt for new receipt creation (no fuel order)
        const defaultReceipt: ExtendedReceipt = {
          id: null, // null indicates this is not yet saved
          receipt_number: null,
          fuel_order_id: null,
          customer_id: 100, // Default to Walk-in Customer
          customer_name: 'Walk-in Customer',
          fuel_order_tail_number: null,
          aircraft_type_at_receipt_time: null,
          fuel_type_at_receipt_time: null,
          fuel_quantity_gallons_at_receipt_time: null,
          fuel_unit_price_at_receipt_time: null,
          fuel_subtotal: '0.00',
          total_fees_amount: '0.00',
          total_waivers_amount: '0.00',
          tax_amount: '0.00',
          grand_total_amount: '0.00',
          status: 'DRAFT',
          notes: null,
          generated_at: null,
          paid_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by_user_id: null,
          updated_by_user_id: null,
          line_items: []
        }
        setReceipt(defaultReceipt)
        return
      }
      
      const receiptId = parseInt(id, 10)
      
      if (isNaN(receiptId)) {
        setError("Invalid receipt ID")
        return
      }

      const receiptData = await getReceiptById(receiptId)
      setReceipt(receiptData)
    } catch (error) {
      console.error("Error loading receipt:", error)
      setError("Failed to load receipt")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p>Loading receipt...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-500 text-2xl">!</span>
          </div>
          <h1 className="text-2xl font-bold">Error Loading Receipt</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button asChild>
            <Link href="/csr/receipts">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Receipts
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!receipt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center">
            <span className="text-yellow-500 text-2xl">?</span>
          </div>
          <h1 className="text-2xl font-bold">Receipt Not Found</h1>
          <p className="text-muted-foreground">The requested receipt could not be found.</p>
          <Button asChild>
            <Link href="/csr/receipts">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Receipts
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    if (receipt.status === 'DRAFT') {
      // Render the Receipt Workspace/Edit UI for draft receipts (both new and existing)
      return <ReceiptWorkspace receiptId={receipt.id} />
    } else {
      // Render the Read-Only Detail View for generated, paid, or void receipts
      return <ReceiptDetailView receipt={receipt} onReceiptUpdate={loadReceipt} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary rotate-45" />
            <span className="text-xl font-bold">FBO LaunchPad</span>
            <span className="bg-blue-500/10 text-blue-500 text-xs px-2 py-1 rounded-md ml-2">CSR</span>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push("/csr/receipts")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Receipts</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {renderContent()}
      </main>
    </div>
  )
}
