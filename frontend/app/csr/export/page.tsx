"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Plane,
  Download,
  Calendar,
  Filter,
  WifiOff,
  FileText,
  Receipt,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { isOfflineMode } from "@/app/services/utils"
import Link from "next/link"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  exportFuelOrdersUrl,
  getFuelOrders,
  convertFuelOrdersToCSV,
  filterFuelOrders,
  downloadCSV,
} from "@/app/services/fuel-order-service"

// Mock receipt data for export
const mockReceipts = [
  {
    id: 1,
    receiptNumber: "RCP-2024-001",
    fuelOrderId: 1,
    tailNumber: "N123AB",
    customer: "Delta Airlines",
    fuelType: "Jet A",
    quantity: 500,
    amount: 2750.0,
    paymentMethod: "Corporate Account",
    status: "PAID",
    createdAt: "2024-01-15T10:30:00Z",
    fuelerName: "Mike Johnson",
    location: "Gate A1",
  },
  {
    id: 2,
    receiptNumber: "RCP-2024-002",
    fuelOrderId: 2,
    tailNumber: "N456CD",
    customer: "United Airlines",
    fuelType: "Jet A",
    quantity: 750,
    amount: 4125.0,
    paymentMethod: "Credit Card",
    status: "PAID",
    createdAt: "2024-01-15T14:45:00Z",
    fuelerName: "Sarah Wilson",
    location: "Gate B3",
  },
  {
    id: 3,
    receiptNumber: "RCP-2024-003",
    fuelOrderId: 3,
    tailNumber: "N789EF",
    customer: "American Airlines",
    fuelType: "Jet A",
    quantity: 300,
    amount: 1650.0,
    paymentMethod: "Corporate Account",
    status: "PENDING",
    createdAt: "2024-01-16T09:15:00Z",
    fuelerName: "Tom Davis",
    location: "Gate C2",
  },
]

export default function ExportDataPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [exportStatus, setExportStatus] = useState<"idle" | "processing" | "success" | "error">("idle")

  // Form state for fuel orders
  const [fuelOrderStartDate, setFuelOrderStartDate] = useState("")
  const [fuelOrderEndDate, setFuelOrderEndDate] = useState("")
  const [fuelOrderStatus, setFuelOrderStatus] = useState("")

  // Form state for receipts
  const [receiptStartDate, setReceiptStartDate] = useState("")
  const [receiptEndDate, setReceiptEndDate] = useState("")
  const [receiptStatus, setReceiptStatus] = useState("")
  const [receiptPaymentMethod, setReceiptPaymentMethod] = useState("")

  // Statistics
  const [fuelOrderStats, setFuelOrderStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  })

  const [receiptStats, setReceiptStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    totalAmount: 0,
  })

  useEffect(() => {
    // Load statistics
    loadStatistics()
    setIsLoading(false)
  }, [])

  const loadStatistics = async () => {
    try {
      // Load fuel order statistics
      const fuelOrdersResponse = await getFuelOrders()
      const fuelOrders = fuelOrdersResponse.items || []
      const fuelStats = {
        total: fuelOrders.length,
        pending: fuelOrders.filter((order: any) => order.status === "PENDING").length,
        inProgress: fuelOrders.filter((order: any) => order.status === "IN_PROGRESS").length,
        completed: fuelOrders.filter((order: any) => order.status === "COMPLETED").length,
      }
      setFuelOrderStats(fuelStats)

      // Load receipt statistics
      const receiptStats = {
        total: mockReceipts.length,
        paid: mockReceipts.filter((receipt) => receipt.status === "PAID").length,
        pending: mockReceipts.filter((receipt) => receipt.status === "PENDING").length,
        totalAmount: mockReceipts.reduce((sum, receipt) => sum + receipt.amount, 0),
      }
      setReceiptStats(receiptStats)
    } catch (error) {
      console.error("Error loading statistics:", error)
    }
  }

  const simulateProgress = () => {
    setExportProgress(0)
    const interval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const handleExportFuelOrders = async () => {
    setIsExporting(true)
    setExportStatus("processing")
    simulateProgress()

    try {
      if (isOfflineMode()) {
        // Get local fuel orders
        const allFuelOrdersResponse = await getFuelOrders()
        const allFuelOrders = allFuelOrdersResponse.items || []

        // Filter based on criteria
        const filteredOrders = filterFuelOrders(
          allFuelOrders,
          fuelOrderStartDate || undefined,
          fuelOrderEndDate || undefined,
          fuelOrderStatus || undefined,
        )

        // Convert to CSV
        const csvContent = convertFuelOrdersToCSV(filteredOrders)

        // Generate filename with current date
        const date = new Date().toISOString().split("T")[0]
        const filename = `fuel-orders-export-${date}.csv`

        // Simulate processing time
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Download the CSV
        downloadCSV(csvContent, filename)
        setExportStatus("success")
      } else {
        // Use the online export method
        const exportUrl = exportFuelOrdersUrl(fuelOrderStartDate, fuelOrderEndDate, fuelOrderStatus)
        window.open(exportUrl, "_blank")
        setExportStatus("success")
      }
    } catch (error) {
      console.error("Export error:", error)
      setExportStatus("error")
    } finally {
      setIsExporting(false)
      setTimeout(() => {
        setExportStatus("idle")
        setExportProgress(0)
      }, 3000)
    }
  }

  const handleExportReceipts = async () => {
    setIsExporting(true)
    setExportStatus("processing")
    simulateProgress()

    try {
      // Filter receipts based on criteria
      let filteredReceipts = mockReceipts

      if (receiptStartDate) {
        filteredReceipts = filteredReceipts.filter(
          (receipt) => new Date(receipt.createdAt) >= new Date(receiptStartDate),
        )
      }

      if (receiptEndDate) {
        const endDateTime = new Date(receiptEndDate)
        endDateTime.setHours(23, 59, 59, 999)
        filteredReceipts = filteredReceipts.filter((receipt) => new Date(receipt.createdAt) <= endDateTime)
      }

      if (receiptStatus && receiptStatus !== "ALL") {
        filteredReceipts = filteredReceipts.filter((receipt) => receipt.status === receiptStatus)
      }

      if (receiptPaymentMethod && receiptPaymentMethod !== "ALL") {
        filteredReceipts = filteredReceipts.filter((receipt) => receipt.paymentMethod === receiptPaymentMethod)
      }

      // Convert to CSV
      const csvContent = convertReceiptsToCSV(filteredReceipts)

      // Generate filename with current date
      const date = new Date().toISOString().split("T")[0]
      const filename = `receipts-export-${date}.csv`

      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Download the CSV
      downloadCSV(csvContent, filename)
      setExportStatus("success")
    } catch (error) {
      console.error("Export error:", error)
      setExportStatus("error")
    } finally {
      setIsExporting(false)
      setTimeout(() => {
        setExportStatus("idle")
        setExportProgress(0)
      }, 3000)
    }
  }

  const convertReceiptsToCSV = (receipts: any[]): string => {
    if (receipts.length === 0) {
      return ""
    }

    // Define CSV headers
    const headers = [
      "Receipt ID",
      "Receipt Number",
      "Fuel Order ID",
      "Tail Number",
      "Customer",
      "Fuel Type",
      "Quantity (Gallons)",
      "Amount",
      "Payment Method",
      "Status",
      "Created At",
      "Fueler Name",
      "Location",
    ]

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...receipts.map((receipt) =>
        [
          receipt.id,
          receipt.receiptNumber,
          receipt.fuelOrderId,
          receipt.tailNumber,
          receipt.customer,
          receipt.fuelType,
          receipt.quantity,
          receipt.amount,
          receipt.paymentMethod,
          receipt.status,
          receipt.createdAt,
          receipt.fuelerName,
          receipt.location,
        ].join(","),
      ),
    ].join("\n")

    return csvContent
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full"
            animate={{
              rotate: 360,
              transition: {
                repeat: Number.POSITIVE_INFINITY,
                duration: 1,
                ease: "linear",
              },
            }}
          />
          <p className="text-muted-foreground">Loading...</p>
        </motion.div>
      </div>
    )
  }

  const offline = isOfflineMode()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container flex h-16 items-center px-4 justify-between">
          <div className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary rotate-45" />
            <span className="text-xl font-bold text-foreground">FBO LaunchPad</span>
            <Badge variant="secondary" className="bg-primary/10 text-primary ml-2">
              CSR
            </Badge>
          </div>
          {offline && (
            <motion.div
              className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3 py-1 rounded-md"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <WifiOff className="h-4 w-4" />
              <span className="text-xs font-medium">Offline Mode</span>
            </motion.div>
          )}
        </div>
      </header>

      <main className="container px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col gap-6 max-w-6xl mx-auto">
          {/* Navigation */}
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Button variant="ghost" size="sm" asChild>
              <Link href="/csr/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
              </Link>
            </Button>
          </motion.div>

          {/* Page Header */}
          <motion.div
            className="text-center space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h1 className="text-3xl font-bold text-foreground">Export Data</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Export fuel orders and receipts data in CSV format. Use filters to customize your export and download data
              for analysis.
            </p>
          </motion.div>

          {/* Export Status */}
          {exportStatus !== "idle" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-md mx-auto"
            >
              <Card className="border-l-4 border-l-primary">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    {exportStatus === "processing" && (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">Processing export...</p>
                          <div className="w-full bg-muted rounded-full h-2 mt-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${exportProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{exportProgress}% complete</p>
                        </div>
                      </>
                    )}
                    {exportStatus === "success" && (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                          Export completed successfully!
                        </p>
                      </>
                    )}
                    {exportStatus === "error" && (
                      <>
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <p className="text-sm font-medium text-destructive">
                          Export failed. Please try again.
                        </p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Export Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Tabs defaultValue="fuel-orders" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                <TabsTrigger value="fuel-orders" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Fuel Orders
                </TabsTrigger>
                <TabsTrigger value="receipts" className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Receipts
                </TabsTrigger>
              </TabsList>

              {/* Fuel Orders Export */}
              <TabsContent value="fuel-orders" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Statistics Cards */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">
                              {fuelOrderStats.total}
                            </p>
                            <p className="text-sm text-muted-foreground">Total Orders</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Clock className="h-5 w-5 text-amber-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">
                              {fuelOrderStats.pending}
                            </p>
                            <p className="text-sm text-muted-foreground">Pending</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Loader2 className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">
                              {fuelOrderStats.inProgress}
                            </p>
                            <p className="text-sm text-muted-foreground">In Progress</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-500/10 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">
                              {fuelOrderStats.completed}
                            </p>
                            <p className="text-sm text-muted-foreground">Completed</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Export Form */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Export Fuel Orders
                      </CardTitle>
                      <CardDescription>
                        {offline
                          ? "Download fuel order data as CSV (offline mode - using local data)"
                          : "Download fuel order data as CSV"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="fuel_start_date">Start Date</Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="fuel_start_date"
                              type="date"
                              className="pl-10"
                              value={fuelOrderStartDate}
                              onChange={(e) => setFuelOrderStartDate(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="fuel_end_date">End Date</Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="fuel_end_date"
                              type="date"
                              className="pl-10"
                              value={fuelOrderEndDate}
                              onChange={(e) => setFuelOrderEndDate(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="fuel_status">Order Status</Label>
                          <div className="relative">
                            <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Select value={fuelOrderStatus} onValueChange={setFuelOrderStatus}>
                              <SelectTrigger className="pl-10">
                                <SelectValue placeholder="All statuses" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">All statuses</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                                <SelectItem value="REVIEWED">Reviewed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button variant="outline" asChild>
                        <Link href="/csr/dashboard">Cancel</Link>
                      </Button>
                      <Button onClick={handleExportFuelOrders} className="gap-2" disabled={isExporting}>
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Export Fuel Orders
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* Receipts Export */}
              <TabsContent value="receipts" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Statistics Cards */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Receipt className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">
                              {receiptStats.total}
                            </p>
                            <p className="text-sm text-muted-foreground">Total Receipts</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-500/10 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">{receiptStats.paid}</p>
                            <p className="text-sm text-muted-foreground">Paid</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Clock className="h-5 w-5 text-amber-500" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">
                              {receiptStats.pending}
                            </p>
                            <p className="text-sm text-muted-foreground">Pending</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.4 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <span className="text-emerald-500 font-bold text-lg">$</span>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-foreground">
                              ${receiptStats.totalAmount.toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">Total Revenue</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Export Form */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-primary" />
                        Export Receipts
                      </CardTitle>
                      <CardDescription>Download receipt data as CSV with filtering options</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="receipt_start_date">Start Date</Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="receipt_start_date"
                              type="date"
                              className="pl-10"
                              value={receiptStartDate}
                              onChange={(e) => setReceiptStartDate(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="receipt_end_date">End Date</Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="receipt_end_date"
                              type="date"
                              className="pl-10"
                              value={receiptEndDate}
                              onChange={(e) => setReceiptEndDate(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="receipt_status">Receipt Status</Label>
                          <div className="relative">
                            <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Select value={receiptStatus} onValueChange={setReceiptStatus}>
                              <SelectTrigger className="pl-10">
                                <SelectValue placeholder="All statuses" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">All statuses</SelectItem>
                                <SelectItem value="PAID">Paid</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="payment_method">Payment Method</Label>
                          <div className="relative">
                            <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Select value={receiptPaymentMethod} onValueChange={setReceiptPaymentMethod}>
                              <SelectTrigger className="pl-10">
                                <SelectValue placeholder="All methods" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">All methods</SelectItem>
                                <SelectItem value="Corporate Account">Corporate Account</SelectItem>
                                <SelectItem value="Credit Card">Credit Card</SelectItem>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Check">Check</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                      <Button variant="outline" asChild>
                        <Link href="/csr/dashboard">Cancel</Link>
                      </Button>
                      <Button onClick={handleExportReceipts} className="gap-2" disabled={isExporting}>
                        {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Export Receipts
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Instructions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-blue-800 dark:text-blue-200 text-lg">Export Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">📊 Data Filtering</h4>
                    <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                      <li>• Use date ranges to filter by creation date</li>
                      <li>• Filter by status to focus on specific order types</li>
                      <li>• Leave filters empty to export all data</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">💾 File Format</h4>
                    <ul className="space-y-1 text-blue-700 dark:text-blue-300">
                      <li>• Files are exported in CSV format</li>
                      <li>• Compatible with Excel, Google Sheets</li>
                      <li>• Includes all relevant data fields</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
