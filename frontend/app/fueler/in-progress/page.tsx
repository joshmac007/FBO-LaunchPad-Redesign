"use client"

import { useEffect, useState } from "react"
import { Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"

// Local storage key for fuel orders
const FUEL_ORDERS_STORAGE_KEY = "fboFuelOrders"

export default function InProgressOrdersPage() {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [inProgressOrders, setInProgressOrders] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isCompletingOrder, setIsCompletingOrder] = useState(false)
  const [actualQuantity, setActualQuantity] = useState("")
  const [completionNotes, setCompletionNotes] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    // Check if user is logged in and is Fueler
    const userData = localStorage.getItem("fboUser")
    if (!userData) {
      return
    }

    const parsedUser = JSON.parse(userData)
    if (!parsedUser.isLoggedIn || parsedUser.role !== "fueler") {
      return
    }

    setUser(parsedUser)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!isLoading) {
      // Load fuel orders from localStorage
      const storedOrders = localStorage.getItem(FUEL_ORDERS_STORAGE_KEY)
      if (storedOrders) {
        const allOrders = JSON.parse(storedOrders)
        setInProgressOrders(allOrders.filter((order: any) => order.status === "IN_PROGRESS"))
      }
    }
  }, [isLoading])

  const openCompletionDialog = (order: any) => {
    setSelectedOrder(order)
    setActualQuantity(order.requestedQuantity)
    setCompletionNotes("")
    setError("")
    setIsCompletingOrder(true)
  }

  const completeFueling = () => {
    if (!actualQuantity || Number.parseFloat(actualQuantity) <= 0) {
      setError("Please enter a valid fuel quantity")
      return
    }

    // Update order status to COMPLETED
    const storedOrders = localStorage.getItem(FUEL_ORDERS_STORAGE_KEY)
    if (storedOrders) {
      const allOrders = JSON.parse(storedOrders)
      const now = new Date().toISOString()
      const updatedOrders = allOrders.map((o: any) =>
        o.id === selectedOrder.id
          ? {
              ...o,
              status: "COMPLETED",
              completedAt: now,
              actualQuantity,
              completionNotes,
              fuelerId: user?.id || 1,
              fuelerName: user?.name || "Fueler",
            }
          : o,
      )

      localStorage.setItem(FUEL_ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders))

      // Update local state
      setInProgressOrders(updatedOrders.filter((order: any) => order.status === "IN_PROGRESS"))
    }

    setIsCompletingOrder(false)
    setSelectedOrder(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p>Loading in-progress orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">In Progress Fuel Orders</h1>
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-blue-500" />
          <span className="font-medium">{inProgressOrders.length} orders in progress</span>
        </div>
      </div>

      {inProgressOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Truck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">No Orders In Progress</h3>
            <p className="text-muted-foreground text-center max-w-md">
              There are currently no fuel orders in progress. Check pending orders to start fueling.
            </p>
            <div className="flex gap-4 mt-6">
              <Button asChild variant="outline">
                <Link href="/fueler/dashboard">Return to Dashboard</Link>
              </Button>
              <Button asChild>
                <Link href="/fueler/pending-orders">View Pending Orders</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {inProgressOrders
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="pb-2 bg-muted/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">Tail Number: {order.tailNumber}</CardTitle>
                      <CardDescription>{order.aircraftType}</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
                      In Progress
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm font-medium">Customer:</div>
                      <div className="text-sm">{order.customer}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm font-medium">Fuel Type:</div>
                      <div className="text-sm">{order.fuelType}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm font-medium">Requested Quantity:</div>
                      <div className="text-sm">{order.requestedQuantity} gallons</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm font-medium">Location:</div>
                      <div className="text-sm">{order.gate}</div>
                    </div>
                    {order.notes && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm font-medium">Notes:</div>
                        <div className="text-sm">{order.notes}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/30 flex justify-between">
                  <div className="text-sm text-muted-foreground">
                    Started: {new Date(order.createdAt).toLocaleString()}
                  </div>
                  <Button size="sm" onClick={() => openCompletionDialog(order)}>
                    Complete Fueling
                  </Button>
                </CardFooter>
              </Card>
            ))}
        </div>
      )}

      {/* Complete Fueling Dialog */}
      <Dialog open={isCompletingOrder} onOpenChange={setIsCompletingOrder}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Complete Fueling</DialogTitle>
            <DialogDescription>Enter the actual amount of fuel dispensed and any notes.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="aircraft" className="text-right">
                Aircraft
              </Label>
              <div className="col-span-3">
                <p className="text-sm font-medium">{selectedOrder?.tailNumber}</p>
                <p className="text-xs text-muted-foreground">{selectedOrder?.aircraftType}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="requested" className="text-right">
                Requested
              </Label>
              <div className="col-span-3">
                <p className="text-sm">{selectedOrder?.requestedQuantity} gallons</p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="actual-quantity" className="text-right">
                Actual Quantity
              </Label>
              <div className="col-span-3 flex items-center">
                <Input
                  id="actual-quantity"
                  type="number"
                  step="0.1"
                  min="0"
                  value={actualQuantity}
                  onChange={(e) => setActualQuantity(e.target.value)}
                  className="flex-1"
                />
                <span className="ml-2">gallons</span>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Any notes about the fueling operation"
                className="col-span-3"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompletingOrder(false)}>
              Cancel
            </Button>
            <Button onClick={completeFueling}>Complete Fueling</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
