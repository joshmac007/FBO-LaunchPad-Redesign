"use client"

import AccessDenied from "@/app/components/access-denied"

export default function TestPermissionDeniedPage() {
  return (
    <div className="space-y-8">
      <div className="text-center p-4">
        <h1 className="text-2xl font-bold mb-2">Permission Denied Component Test</h1>
        <p className="text-muted-foreground">
          This page demonstrates the new AccessDenied component with debugging information.
        </p>
      </div>
      
      <AccessDenied
        pageName="Admin Management"
        pageDescription="This is a test of the admin-only access denied page."
        adminOnly={true}
        customMessage="You need administrator privileges to access this test page."
        suggestedActions={[
          {
            label: "Request Admin Access",
            href: "mailto:admin@fbolaunchpad.com",
            variant: "default"
          },
          {
            label: "View Documentation",
            href: "/docs/permissions",
            variant: "outline"
          }
        ]}
      />
    </div>
  )
} 