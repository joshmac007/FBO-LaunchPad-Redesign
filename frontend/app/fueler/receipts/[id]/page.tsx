"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Plane, ArrowLeft, Printer, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import Link from "next/link"

export default function FuelingReceipt() {
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [order, setOrder] = useState<any>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    // Check if user is logged in and is Fueler
    const userData = localStorage.getItem("fboUser")
    if (!userData) {
      router.push("/login")
      return
    }

    const parsedUser = JSON.parse(userData)
    if (!parsedUser.isLoggedIn || parsedUser.role !== "fueler") {
      router.push("/login")
      return
    }

    setUser(parsedUser)

    // Load fuel order
    const orderId = params.id
    const storedOrders = localStorage.getItem("fboFuelOrders")

    if (storedOrders) {
      const orders = JSON.parse(storedOrders)
      const foundOrder = orders.find((o: any) => o.id.toString() === orderId)

      if (foundOrder) {
        setOrder(foundOrder)
      } else {
        setNotFound(true)
      }
    } else {
      setNotFound(true)
    }

    setIsLoading(false)
  }, [router, params.id])

  const handlePrint = () => {
    window.print()
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

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-500 text-2xl">!</span>
          </div>
          <h1 className="text-2xl font-bold">Receipt Not Found</h1>
          <p className="text-muted-foreground">The requested fueling receipt could not be found.</p>
          <Button asChild>
            <Link href="/fueler/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - hidden when printing */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-40 print:hidden">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary rotate-45" />
            <span className="text-xl font-bold">FBO LaunchPad</span>
            <span className="bg-green-500/10 text-green-500 text-xs px-2 py-1 rounded-md ml-2">Fueler</span>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push("/fueler/dashboard")} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              <span className="hidden md:inline-block">Print</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between print:hidden">
            <h1 className="text-3xl font-bold">Fueling Receipt</h1>
            <div className="text-sm text-muted-foreground">Receipt #{order.id}</div>
          </div>

          <Card className="border-2">
            {/* Receipt Header */}
            <CardHeader className="border-b bg-muted/30">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Plane className="h-8 w-8 text-primary rotate-45" />
                  <div>
                    <CardTitle className="text-2xl">FBO LaunchPad</CardTitle>
                    <CardDescription>Fueling Receipt</CardDescription>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-xl font-bold">Receipt #{order.id}</div>
                  <div className="text-sm text-muted-foreground">{new Date(order.completedAt).toLocaleString()}</div>
                </div>
              </div>
            </CardHeader>

            {/* Receipt Content */}
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Status Banner */}
                <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="font-medium text-green-800">Fueling Completed</p>
                    <p className="text-sm text-green-700">
                      Fueling was completed on {new Date(order.completedAt).toLocaleDateString()} at{" "}
                      {new Date(order.completedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Aircraft Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Aircraft Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-md p-4 bg-muted/10">
                    <div>
                      <p className="text-sm text-muted-foreground">Tail Number</p>
                      <p className="font-medium">{order.tailNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Aircraft Type</p>
                      <p className="font-medium">{order.aircraftType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium">{order.customer}</p>
                    </div>
                  </div>
                </div>

                {/* Fueling Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Fueling Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded-md p-4 bg-muted/10">
                    <div>
                      <p className="text-sm text-muted-foreground">Fuel Type</p>
                      <p className="font-medium">{order.fuelType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Requested Quantity</p>
                      <p className="font-medium">{order.requestedQuantity} gallons</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Actual Quantity</p>
                      <p className="font-medium">{order.actualQuantity} gallons</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">{order.gate}</p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {(order.notes || order.completionNotes) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Notes</h3>
                    <div className="border rounded-md p-4 bg-muted/10">
                      {order.notes && (
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground">Order Notes</p>
                          <p>{order.notes}</p>
                        </div>
                      )}
                      {order.completionNotes && (
                        <div>
                          <p className="text-sm text-muted-foreground">Completion Notes</p>
                          <p>{order.completionNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Fueler Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Fueler Information</h3>
                  <div className="border rounded-md p-4 bg-muted/10">
                    <div>
                      <p className="text-sm text-muted-foreground">Fueler</p>
                      <p className="font-medium">{order.fuelerName || user?.name || "Fueler"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="border-t bg-muted/30 flex justify-between">
              <div className="text-sm text-muted-foreground">
                This receipt was generated automatically by FBO LaunchPad
              </div>
              <div className="text-sm font-medium">Receipt ID: {order.id}</div>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
