"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Loader2 } from "lucide-react"
import { login } from "@/app/services/auth-service"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      console.log("Attempting login with:", { email })
      const response = await login({ email, password })
      console.log("Login response:", response)

      if (response?.user?.roles) {
        const roles = response.user.roles.map(role => role.toLowerCase())
        console.log("User roles:", roles)

        // Determine redirect based on roles
        let redirectPath = "/member/dashboard" // Default fallback

        if (roles.some(role => role.includes("administrator") || role.includes("admin"))) {
          redirectPath = "/admin/dashboard"
        } else if (roles.some(role => role.includes("customer service") || role.includes("csr"))) {
          redirectPath = "/csr/dashboard"
        } else if (roles.some(role => role.includes("line service") || role.includes("technician") || role.includes("fueler"))) {
          redirectPath = "/fueler/dashboard"
        }

        console.log("Redirecting to:", redirectPath)
        
        // Use window.location for more reliable redirect
        window.location.href = redirectPath
      } else if (response?.user && (!response.user.roles || response.user.roles.length === 0)) {
        // User with no roles - redirect to member dashboard
        console.log("User has no roles, redirecting to member dashboard")
        window.location.href = "/member/dashboard"
      } else {
        throw new Error("Invalid response format")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError(err instanceof Error ? err.message : "Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">FBO LaunchPad Login</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Log In"
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <h3 className="text-sm font-medium mb-2">Test Credentials:</h3>
            <div className="text-xs space-y-1">
              <div><strong>Admin:</strong> admin@fbolaunchpad.com / Admin123!</div>
              <div><strong>CSR:</strong> csr@fbolaunchpad.com / CSR123!</div>
              <div><strong>Fueler:</strong> fueler@fbolaunchpad.com / Fueler123!</div>
              <div><strong>Member:</strong> member@fbolaunchpad.com / Member123!</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
