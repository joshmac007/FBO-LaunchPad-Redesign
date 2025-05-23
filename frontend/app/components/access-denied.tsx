import { Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div className="rounded-full bg-red-100 p-3 mb-4">
        <Shield className="h-12 w-12 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        You don't have permission to access this page. Please contact your administrator if you believe this is an
        error.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/">Return to Home</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/login">Login with Different Account</Link>
        </Button>
      </div>
    </div>
  )
}
