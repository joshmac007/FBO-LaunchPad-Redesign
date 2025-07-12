"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { BarChart3, Clock, CheckCircle, AlertCircle, FileText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getFuelOrders, getFuelOrderStats, type FuelOrderDisplay, transformToDisplay, type FuelOrderBackend } from "@/app/services/fuel-order-service"
import { getRecentReceipts, type Receipt } from "@/app/services/receipt-service"
import PermissionDebug from "@/app/components/permission-debug"
import NewFuelOrderDialog from "@/app/csr/fuel-orders/components/NewFuelOrderDialog"

export default function CSRDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [fuelOrders, setFuelOrders] = useState<FuelOrderDisplay[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [currentDate, setCurrentDate] = useState<string>("")
  const [recentReceipts, setRecentReceipts] = useState<Receipt[]>([])
  const [receiptsLoading, setReceiptsLoading] = useState(false)
  const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false)

  useEffect(() => {
    // Set current date
    const now = new Date()
    setCurrentDate(
      now.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    )

    // Get user data
    const userData = localStorage.getItem("fboUser")
    if (userData) {
      setUser(JSON.parse(userData))
    }

    loadFuelOrders()
    loadRecentReceipts()
  }, [])

  const loadFuelOrders = async () => {
    try {
      setOrdersLoading(true)
      setError(null)

      // Load fuel orders from backend API
      const response = await getFuelOrders()
      const transformedOrders = await Promise.all(
        (response.orders || []).map((order: FuelOrderBackend) => transformToDisplay(order))
      );
      setFuelOrders(transformedOrders)
    } catch (error) {
      console.error("Error loading fuel orders:", error)
      setError("Failed to load fuel orders. Please try again.")
      setFuelOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }

  const loadRecentReceipts = async () => {
    try {
      setReceiptsLoading(true)
      
      // Load recent receipts from backend API
      const receipts = await getRecentReceipts(3) // Get last 3 receipts for dashboard
      setRecentReceipts(receipts)
    } catch (error) {
      console.error("Error loading recent receipts:", error)
      setRecentReceipts([])
    } finally {
      setReceiptsLoading(false)
    }
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  const getFilteredOrders = () => {
    // Safety check to ensure fuelOrders is an array
    if (!Array.isArray(fuelOrders)) {
      return []
    }
    
    switch (activeTab) {
      case "pending":
        return fuelOrders.filter((o) => o.status === "Pending")
      case "in_progress":
        return fuelOrders.filter((o) => o.status === "In Progress")
      case "completed":
        return fuelOrders.filter((o) => o.status === "Completed")
      default:
        return fuelOrders
    }
  }

  // Get counts for quick statistics
  const getOrderCounts = () => {
    // Safety check to ensure fuelOrders is an array
    if (!Array.isArray(fuelOrders)) {
      return { pending: 0, inProgress: 0, completed: 0, total: 0 }
    }
    
    const pending = fuelOrders.filter((o) => o.status === "Pending").length
    const inProgress = fuelOrders.filter((o) => o.status === "In Progress").length
    const completed = fuelOrders.filter((o) => o.status === "Completed").length

    return { pending, inProgress, completed, total: fuelOrders.length }
  }

  const handleViewFuelOrderDetails = (orderId: number) => {
    // Navigate to order details page
    router.push(`/csr/fuel-orders/${orderId}`)
  }

  const handleViewReceiptDetails = (receiptId: number) => {
    // Store the receipt details in localStorage for the detail page
    const receipt = recentReceipts.find((r) => r.id === receiptId)
    if (receipt) {
      localStorage.setItem(`receipt_${receiptId}`, JSON.stringify(receipt))
      router.push(`/csr/receipts/${receiptId}`)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-warning dark:bg-warning"></div>
            <span className="text-foreground text-sm font-medium">Pending</span>
          </div>
        )
      case "In Progress":
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary dark:bg-primary"></div>
            <span className="text-foreground text-sm font-medium">In Progress</span>
          </div>
        )
      case "Completed":
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success dark:bg-success"></div>
            <span className="text-foreground text-sm font-medium">Completed</span>
          </div>
        )
      default:
        return <span className="text-foreground text-sm font-medium">{status}</span>
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.round(diffMs / 60000)
    const diffHours = Math.round(diffMs / 3600000)

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Framer Motion variants for animations
  const cardVariants = {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 25,
      },
    },
    hover: {
      y: -5,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 20,
      },
    },
    tap: {
      scale: 0.98,
      transition: {
        type: "spring" as const,
        stiffness: 500,
        damping: 20,
      },
    },
  }

  const buttonVariants = {
    initial: { scale: 1 },
    hover: {
      scale: 1.05,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 10,
      },
    },
    tap: {
      scale: 0.95,
      transition: {
        type: "spring" as const,
        stiffness: 400,
        damping: 15,
      },
    },
  }

  const listItemVariants = {
    initial: { opacity: 0, x: -5 },
    animate: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
      },
    }),
    hover: {
      x: 2,
      backgroundColor: "rgba(240, 242, 245, 0.5)",
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 20,
      },
    },
  }

  const statCardVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 20,
      },
    },
    hover: {
      y: -5,
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 20,
      },
    },
  }

  const orderCounts = getOrderCounts()

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">CSR Dashboard</h2>
          <p className="text-muted-foreground">{currentDate}</p>
        </div>
        <div className="flex items-center space-x-2">
            <Button onClick={() => setIsNewOrderDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Fuel Order
            </Button>
        </div>
      </div>

      {/* Quick Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div className="bg-muted p-4 rounded-lg border" variants={statCardVariants} whileHover="hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{orderCounts.total}</h3>
            </div>
            <div className="p-2 bg-primary/10 rounded-full">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
          </div>
        </motion.div>

        <motion.div className="bg-muted p-4 rounded-lg border" variants={statCardVariants} whileHover="hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{orderCounts.pending}</h3>
            </div>
            <div className="p-2 bg-warning/10 rounded-full">
              <AlertCircle className="h-6 w-6 text-warning" />
            </div>
          </div>
        </motion.div>

        <motion.div className="bg-muted p-4 rounded-lg border" variants={statCardVariants} whileHover="hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">In Progress</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{orderCounts.inProgress}</h3>
            </div>
            <div className="p-2 bg-primary/10 rounded-full">
              <Clock className="h-6 w-6 text-primary" />
            </div>
          </div>
        </motion.div>

        <motion.div className="bg-muted p-4 rounded-lg border" variants={statCardVariants} whileHover="hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completed</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{orderCounts.completed}</h3>
            </div>
            <div className="p-2 bg-success/10 rounded-full">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
          </div>
        </motion.div>
      </div>

      <PermissionDebug />
      <NewFuelOrderDialog 
        isOpen={isNewOrderDialogOpen}
        onOpenChange={setIsNewOrderDialogOpen}
        onOrderCreated={loadFuelOrders}
      />

      {/* Fuel Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Fuel Orders</CardTitle>
            <CardDescription>Manage and track all fuel orders</CardDescription>
          </div>
          <Button variant="outline" onClick={() => router.push("/csr/fuel-orders")}>
            <FileText className="mr-2 h-4 w-4" />
            View All Orders
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}
          {ordersLoading ? (
            <div className="flex justify-center items-center py-8">
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
              ></motion.div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tail Number
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Fuel Type
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Quantity (gal)
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredOrders()
                    .slice(0, 5)
                    .map((order, index) => (
                      <motion.tr
                        key={order.id}
                        custom={index}
                        variants={listItemVariants}
                        initial="initial"
                        animate="animate"
                        whileHover="hover"
                        className="cursor-pointer border-b"
                        onClick={() => handleViewFuelOrderDetails(order.id)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">{order.id}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                          {order.aircraft_tail_number}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{order.customer_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{order.fuel_type}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{order.quantity}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(order.status)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewFuelOrderDetails(order.id)
                            }}
                          >
                            View Details
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Receipts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Receipts</CardTitle>
            <CardDescription>View and manage recent transaction receipts</CardDescription>
          </div>
          <Button variant="outline" onClick={() => router.push("/csr/receipts")}>
            <FileText className="mr-2 h-4 w-4" />
            View All Receipts
          </Button>
        </CardHeader>
        <CardContent>
          {receiptsLoading ? (
            <div className="flex justify-center items-center py-8">
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
              ></motion.div>
            </div>
          ) : recentReceipts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent receipts found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Receipt ID
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Tail Number
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentReceipts.map((receipt, index) => (
                    <motion.tr
                      key={receipt.id}
                      custom={index}
                      variants={listItemVariants}
                      initial="initial"
                      animate="animate"
                      whileHover="hover"
                      className="cursor-pointer border-b"
                      onClick={() => handleViewReceiptDetails(receipt.id)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{receipt.receipt_number || `DRAFT-${receipt.id}`}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{receipt.fuel_order_tail_number}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{receipt.customer_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{formatCurrency(parseFloat(receipt.grand_total_amount))}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{formatTimestamp(receipt.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewReceiptDetails(receipt.id)
                          }}
                        >
                          View Receipt
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
