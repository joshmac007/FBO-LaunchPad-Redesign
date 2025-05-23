"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { ArrowLeft, Plane, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { isAuthenticated } from "@/app/services/auth-service"
import { type FuelOrder, getFuelOrder, reviewFuelOrder } from "@/app/services/fuel-order-service"
import Link from "next/link"

export default function FuelOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = Number(params.id)

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fuelOrder, setFuelOrder] = useState<FuelOrder | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")

  useEffect(() => {
    // Check if user is logged in and is CSR
    if (!isAuthenticated()) {
      router.push("/login")
      return
    }

    const userData = localStorage.getItem("fboUser")
    if (userData) {
      const parsedUser = JSON.parse(userData)
      if (!parsedUser.isLoggedIn || parsedUser.role !== "csr") {
        router.push("/login")
        return
      }
    }

    // Load fuel order details
    const loadFuelOrder = async () => {
      try {
        const order = await getFuelOrder(orderId)
        setFuelOrder(order)
        if (order.review_notes) {
          setReviewNotes(order.review_notes)
        }
      } catch (error) {
        console.error("Error loading fuel order:", error)
        setError("Failed to load fuel order details. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    loadFuelOrder()
  }, [router, orderId])

  const handleReviewOrder = async () => {
    if (!fuelOrder) return

    setError(null)
    setIsSubmitting(true)

    try {
      const updatedOrder = await reviewFuelOrder(fuelOrder.id, reviewNotes)
      setFuelOrder(updatedOrder)
    } catch (error) {
      console.error("Error reviewing fuel order:", error)
      setError(error instanceof Error ? error.message : "Failed to review fuel order. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-200">
            Pending
          </Badge>
        )
      case "IN_PROGRESS":
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
            In Progress
          </Badge>
        )
      case "COMPLETED":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
            Completed
          </Badge>
        )
      case "REVIEWED":
        return (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-200">
            Reviewed
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p>Loading fuel order details...</p>
        </div>
      </div>
    )
  }

  if (!fuelOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h2 className="text-2xl font-bold">Fuel Order Not Found</h2>
          <p className="text-muted-foreground">
            The fuel order you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button asChild>
            <Link href="/csr/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container flex h-16 items-center px-4">
          <div className="flex items-center gap-2">
            <Plane className="h-6 w-6 text-primary rotate-45" />
            <span className="text-xl font-bold">FBO LaunchPad</span>
            <span className="bg-blue-500/10 text-blue-500 text-xs px-2 py-1 rounded-md ml-2">CSR</span>
          </div>
        </div>
      </header>

      <main className="container px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/csr/dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Fuel Order #{fuelOrder.id}</CardTitle>
                  <CardDescription>Created on {new Date(fuelOrder.created_at).toLocaleString()}</CardDescription>
                </div>
                <div>{getStatusBadge(fuelOrder.status)}</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Order Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fuel Type:</span>
                      <span className="font-medium">{fuelOrder.fuel_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantity:</span>
                      <span className="font-medium">{fuelOrder.quantity} gallons</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span>{getStatusBadge(fuelOrder.status)}</span>
                    </div>
                    {fuelOrder.notes && (
                      <div className="pt-2">
                        <span className="text-muted-foreground">Notes:</span>
                        <p className="mt-1 text-sm border rounded-md p-2">{fuelOrder.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Assignment</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Aircraft:</span>
                      <span className="font-medium">{fuelOrder.aircraft?.tail_number || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer:</span>
                      <span className="font-medium">{fuelOrder.customer?.name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assigned LST:</span>
                      <span className="font-medium">{fuelOrder.assigned_lst?.name || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Truck ID:</span>
                      <span className="font-medium">{fuelOrder.assigned_truck_id}</span>
                    </div>
                  </div>
                </div>
              </div>

              {fuelOrder.status === "COMPLETED" && (
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium mb-2">Review Order</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    This order has been completed by the LST. Please review and confirm the details.
                  </p>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add review notes (optional)"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      disabled={fuelOrder.status === "REVIEWED"}
                    />
                  </div>
                </div>
              )}

              {fuelOrder.status === "REVIEWED" && fuelOrder.review_notes && (
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium mb-2">Review Notes</h3>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <p className="text-sm">{fuelOrder.review_notes}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Reviewed on {fuelOrder.reviewed_at ? new Date(fuelOrder.reviewed_at).toLocaleString() : "N/A"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link href="/csr/dashboard">Back</Link>
              </Button>

              {fuelOrder.status === "COMPLETED" && (
                <Button onClick={handleReviewOrder} disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? (
                    <>
                      <span>Processing...</span>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark as Reviewed
                    </>
                  )}
                </Button>
              )}

              {fuelOrder.status === "PENDING" && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Waiting for LST to process</span>
                </div>
              )}

              {fuelOrder.status === "IN_PROGRESS" && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Fueling in progress</span>
                </div>
              )}
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
