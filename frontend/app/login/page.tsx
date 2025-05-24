"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Header from "@/components/header"
import Footer from "@/components/footer"
import Image from "next/image"
import { useEffect, useState } from "react"
import { Plane, Lock, User, Eye, EyeOff, AlertCircle, Users } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { login } from "@/app/services/auth-service"

export default function LoginPage() {
  const router = useRouter()

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const [isVisible, setIsVisible] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Use the login service
      const loginResponse = await login({ email, password })

      // Redirect to appropriate dashboard based on role
      // The user object is directly available from loginResponse.user
      // and also stored in localStorage by the auth-service
      const user = loginResponse.user
      if (user && user.roles) {
        if (user.roles.includes("admin")) {
          router.push("/admin/dashboard")
        } else if (user.roles.includes("csr")) {
          router.push("/csr/dashboard")
        } else if (user.roles.includes("fueler")) {
          router.push("/fueler/dashboard")
        } else if (user.roles.includes("member")) {
          router.push("/member/dashboard")
        } else {
          // Fallback if no specific role dashboard matches
          router.push("/") // Or handle error appropriately
        }
      } else {
        // This case should ideally not happen if login is successful
        // and backend provides roles.
        console.error("Login successful but no user data or roles found.")
        setError("Login failed: User data is missing or incomplete.")
        router.push("/") // Fallback redirect
      }
    } catch (error) {
      console.error("Login error:", error)
      if (error instanceof Error) {
        setError(error.message || "Invalid email or password")
      } else {
        setError("Invalid email or password")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 relative">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Image
            src="/images/aviation-data-background.png"
            alt="Aviation data background"
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
                <span>Secure Access</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tighter md:text-5xl text-white">Member Login</h1>
              <p className="text-gray-200 md:text-xl/relaxed text-center">
                Access your FBO LaunchPad dashboard to monitor your aircraft fleet.
              </p>
            </div>
            <div
              className={`w-full max-w-md mx-auto transition-all duration-1000 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
            >
              <Card className="bg-white/10 backdrop-blur-md border-gray-800/20 shadow-lg card-futuristic">
                <CardHeader>
                  <CardTitle className="text-white">Log in to your account</CardTitle>
                  <CardDescription className="text-gray-300">
                    Enter your credentials to access your dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-3 md:gap-4" onSubmit={handleLogin}>
                    {error && (
                      <div className="bg-red-500/10 border border-red-500/50 rounded-md p-3 flex items-start gap-2">
                        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-red-500 text-sm">{error}</p>
                      </div>
                    )}
                    <div className="grid gap-2">
                      <Label htmlFor="email" className="text-white">
                        Email
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          placeholder="name@example.com"
                          type="email"
                          className="pl-10 bg-white/80 text-gray-900"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-white">
                          Password
                        </Label>
                        <Link href="#" className="text-sm text-primary underline-offset-4 hover:underline">
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          className="pl-10 pr-10 bg-white/80 text-gray-900"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                        </button>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 glow-effect"
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <span className="mr-2">Logging in</span>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </>
                      ) : (
                        <span className="flex items-center justify-center">Log In</span>
                      )}
                    </Button>
                  </form>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                  <div className="text-sm text-gray-300 text-center">
                    Don&apos;t have an account?{" "}
                    <Link href="/request-demo" className="text-primary hover:underline">
                      Contact FBO LaunchPad
                    </Link>
                  </div>

                  <div className="border-t border-gray-700 w-full my-2 pt-4">
                    <p className="text-sm text-gray-300 text-center mb-3">Staff Login Options</p>
                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                      <Button
                        variant="outline"
                        className="w-full border-gray-600 text-gray-200 hover:bg-white/10"
                        onClick={() => router.push("/csr-login")}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        CSR Login
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-gray-600 text-gray-200 hover:bg-white/10"
                        onClick={() => router.push("/fueler-login")}
                      >
                        <Plane className="h-4 w-4 mr-2 rotate-45" />
                        Fueler Login
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              </Card>
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
