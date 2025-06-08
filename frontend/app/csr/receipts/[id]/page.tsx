"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Plane } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import ReceiptWorkspace from "../components/ReceiptWorkspace"
import ReceiptDetailView from "../../receipts/components/ReceiptDetailView"
import { getReceiptById, ExtendedReceipt } from "@/app/services/receipt-service"

export default function ReceiptDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [receipt, setReceipt] = useState<ExtendedReceipt | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReceipt()
  }, [params.id])

  const loadReceipt = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const receiptId = parseInt(params.id as string, 10)
      
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
      // Render the Receipt Workspace/Edit UI for draft receipts
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
