"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import Header from "@/components/header"
import Footer from "@/components/footer"
import Image from "next/image"
import { useEffect, useState } from "react"
import { Plane, Send, CheckCircle, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { sendDemoRequestEmail } from "../actions/send-email"

export default function RequestDemo() {
  const router = useRouter()

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const [isVisible, setIsVisible] = useState(false)
  const [formSubmitted, setFormSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    fboName: "",
    email: "",
    message: "",
  })

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Create a new demo request
      const newRequest = {
        id: Date.now().toString(),
        ...formData,
        date: new Date().toISOString(),
        status: "new" as const,
      }

      // Get existing requests from localStorage
      const existingRequests = JSON.parse(localStorage.getItem("demoRequests") || "[]")

      // Add new request and save back to localStorage
      localStorage.setItem("demoRequests", JSON.stringify([...existingRequests, newRequest]))

      // Send email notification
      const emailResult = await sendDemoRequestEmail(formData)

      if (!emailResult.success) {
        console.error("Failed to send email notification:", emailResult.error)
        // We don't show this error to the user since the request was still saved
        // But we log it for debugging purposes
      }

      setIsSubmitting(false)
      setFormSubmitted(true)

      // Reset form after 3 seconds and redirect to home
      setTimeout(() => {
        router.push("/")
      }, 3000)
    } catch (error) {
      setIsSubmitting(false)
      setSubmitError("There was an error submitting your request. Please try again.")
      console.error("Error submitting form:", error)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 relative">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Image
            src="/images/data-flow-background.png"
            alt="Data flow background"
            fill
            style={{ objectFit: "cover" }}
            priority
          />
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
        </div>

        <div className="container px-4 md:px-6 relative z-10 py-12 md:py-24">
          <div className="flex flex-col items-center justify-center space-y-8 text-center">
            <div
              className={`space-y-4 max-w-[600px] mx-auto transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
            >
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/20 text-primary mb-2">
                <Plane className="h-4 w-4 mr-1 rotate-45" />
                <span>Flight Plan Request</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tighter md:text-5xl text-white">Request Your Demo Flight</h1>
              <p className="text-gray-200 md:text-xl/relaxed text-center">
                Ready to see FBO LaunchPad in action? Complete this pre-flight checklist to request your personalized
                demo.
              </p>
            </div>
            <div
              className={`w-full max-w-md mx-auto transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
            >
              {formSubmitted ? (
                <div className="bg-white/10 backdrop-blur-md p-4 md:p-6 rounded-xl shadow-lg card-futuristic flex flex-col items-center">
                  <div className="rounded-full bg-green-500/20 p-4 mb-4">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Request Submitted!</h2>
                  <p className="text-gray-200 text-center mb-6">
                    Thank you for your interest in FBO LaunchPad. Our team will contact you shortly to schedule your
                    personalized demo.
                  </p>
                  <p className="text-gray-300 text-sm">Redirecting you to the homepage in a few seconds...</p>
                </div>
              ) : (
                <form
                  className="grid gap-3 md:gap-4 bg-white/10 backdrop-blur-md p-4 md:p-6 rounded-xl shadow-lg card-futuristic"
                  onSubmit={handleSubmit}
                >
                  {submitError && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3 flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-red-500 text-sm">{submitError}</p>
                    </div>
                  )}

                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-white/80 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Your Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-white/80 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="FBO Name"
                    name="fboName"
                    value={formData.fboName}
                    onChange={handleChange}
                    required
                  />
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-white/80 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Email Address"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  <textarea
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-white/80 px-3 py-2 text-sm ring-offset-background placeholder:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Tell us about your FBO (size, number of aircraft, etc.)"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                  ></textarea>
                  <Button
                    size="lg"
                    className="w-full bg-primary hover:bg-primary/90 glow-effect"
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Request a Demo
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Animated flight path */}
        <div className="absolute bottom-0 left-0 w-full h-12 overflow-hidden">
          <div className="flight-line w-full h-full"></div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
