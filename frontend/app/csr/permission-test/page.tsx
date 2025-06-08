"use client"

import { usePermissions } from "@/hooks/usePermissions"
import { isAuthenticated } from "@/app/services/auth-service"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle, XCircle } from "lucide-react"
import { useEffect } from "react"

export default function PermissionTestPage() {
  const {
    loading,
    user,
    hasPermission,
    refresh,
    effectivePermissions,
    permissionSummary,
  } = usePermissions()

  useEffect(() => {
    console.log("--- PERMISSION TEST PAGE RENDERED ---")
    console.log("Loading state:", loading)
    console.log("User object:", user)
    console.log("Is Authenticated:", isAuthenticated())
  }, [loading, user])

  const handleRefresh = async () => {
    console.log("Manually refreshing permissions...")
    await refresh()
    console.log("Permissions refreshed.")
  }

  const renderCheck = (result: boolean) => {
    return result ? (
      <CheckCircle className="inline-block h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="inline-block h-5 w-5 text-red-500" />
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CSR Permission Diagnostic Page</CardTitle>
          <CardDescription>
            This page helps diagnose issues with the permission context for the CSR module.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Permissions
          </Button>

          <h3 className="text-lg font-semibold">Core Status</h3>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Permissions Loading:</strong> {loading ? "Yes" : "No"}
            </li>
            <li>
              <strong>Is Authenticated:</strong> {isAuthenticated() ? "Yes" : "No"}
            </li>
            <li>
              <strong>User Email:</strong> {user?.email || "Not available"}
            </li>
            <li>
              <strong>User Roles:</strong> {user?.roles?.join(", ") || "Not available"}
            </li>
          </ul>

          <h3 className="text-lg font-semibold">Key Permission Checks</h3>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Has 'access_csr_dashboard':</strong> {renderCheck(hasPermission("access_csr_dashboard"))}
            </li>
            <li>
              <strong>Has 'view_receipts':</strong> {renderCheck(hasPermission("view_receipts"))}
            </li>
            <li>
              <strong>Has 'view_all_orders':</strong> {renderCheck(hasPermission("view_all_orders"))}
            </li>
          </ul>

          <h3 className="text-lg font-semibold">Raw Permission Data</h3>
          <div className="space-y-2">
            <label className="font-medium">Effective Permissions:</label>
            <pre className="mt-2 h-[200px] w-full overflow-auto rounded-md bg-slate-950 p-4">
              <code className="text-white">
                {JSON.stringify(effectivePermissions, null, 2)}
              </code>
            </pre>
          </div>
          <div className="space-y-2">
            <label className="font-medium">Permission Summary:</label>
            <pre className="mt-2 h-[200px] w-full overflow-auto rounded-md bg-slate-950 p-4">
              <code className="text-white">
                {JSON.stringify(permissionSummary, null, 2)}
              </code>
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 