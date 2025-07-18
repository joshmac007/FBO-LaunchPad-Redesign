"use client"

import { useState } from "react"
import { usePermissions } from "@/hooks/usePermissions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, RefreshCw, Bug, User, Shield, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { PERMISSION_GROUPS } from "@/app/constants/permissions"

export default function PermissionDebug() {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const {
    user,
    userPermissions,
    loading,
    isAdmin,
    isCSR,
    isFueler,
    isMember,
    can,
    canAny,
    refresh,
    permissionSummary,
    effectivePermissions
  } = usePermissions()

  const handleRefresh = async () => {
    try {
      await refresh()
    } catch (error) {
      console.error("Failed to refresh permissions:", error)
    }
  }

  // Use actual permission groups from constants - no more mock/test permissions
  const csrPermissions = [...PERMISSION_GROUPS.CSR]
  const adminPermissions = [...PERMISSION_GROUPS.ADMIN]
  const fuelerPermissions = [...PERMISSION_GROUPS.FUELER]
  const memberPermissions = [...PERMISSION_GROUPS.MEMBER]

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur-sm"
        >
          <Bug className="h-4 w-4 mr-2" />
          Debug Permissions
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] overflow-auto">
      <Card className="bg-background/95 backdrop-blur-sm border-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              <CardTitle className="text-sm">Permission Debug</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              </Button>
              <Button
                onClick={() => setIsVisible(false)}
                variant="ghost"
                size="sm"
              >
                <EyeOff className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <CardDescription className="text-xs">
            {loading ? "Loading..." : `${userPermissions.length} permissions loaded`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 text-xs">
          {/* User Info */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="font-medium">User Info</span>
            </div>
            <div className="pl-4 space-y-1">
              <div>Email: {user?.email || "Not logged in"}</div>
              <div>Name: {user?.name || "N/A"}</div>
              <div>Active: {user?.is_active ? "Yes" : "No"}</div>
              <div>Logged In: {user?.isLoggedIn ? "Yes" : "No"}</div>
              <div>Roles: {user?.roles?.join(", ") || "None"}</div>
            </div>
          </div>

          {/* Role Checks */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              <span className="font-medium">Role Checks</span>
            </div>
            <div className="pl-4 flex flex-wrap gap-1">
              <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs">
                Admin: {isAdmin ? "✓" : "✗"}
              </Badge>
              <Badge variant={isCSR ? "default" : "secondary"} className="text-xs">
                CSR: {isCSR ? "✓" : "✗"}
              </Badge>
              <Badge variant={isFueler ? "default" : "secondary"} className="text-xs">
                Fueler: {isFueler ? "✓" : "✗"}
              </Badge>
              <Badge variant={isMember ? "default" : "secondary"} className="text-xs">
                Member: {isMember ? "✓" : "✗"}
              </Badge>
            </div>
          </div>

          {/* CSR Permission Tests */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 hover:bg-muted/50 p-1 rounded">
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium">CSR Permissions ({csrPermissions.filter(p => can(p)).length}/{csrPermissions.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 space-y-1 mt-1">
              {csrPermissions.map(permission => (
                <div key={permission} className="flex items-center justify-between">
                  <span className="text-xs">{permission}</span>
                  <Badge variant={can(permission) ? "default" : "secondary"} className="text-xs">
                    {can(permission) ? "✓" : "✗"}
                  </Badge>
                </div>
              ))}
              <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                <div>canAny(csrPermissions): {canAny(csrPermissions) ? "✓" : "✗"}</div>
                <div>isCSR hook result: {isCSR ? "✓" : "✗"}</div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Admin Permission Tests */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 hover:bg-muted/50 p-1 rounded">
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium">Admin Permissions ({adminPermissions.filter(p => can(p)).length}/{adminPermissions.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 space-y-1 mt-1">
              {adminPermissions.map(permission => (
                <div key={permission} className="flex items-center justify-between">
                  <span className="text-xs">{permission}</span>
                  <Badge variant={can(permission) ? "default" : "secondary"} className="text-xs">
                    {can(permission) ? "✓" : "✗"}
                  </Badge>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Fueler Permission Tests */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 hover:bg-muted/50 p-1 rounded">
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium">Fueler Permissions ({fuelerPermissions.filter(p => can(p)).length}/{fuelerPermissions.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 space-y-1 mt-1">
              {fuelerPermissions.map(permission => (
                <div key={permission} className="flex items-center justify-between">
                  <span className="text-xs">{permission}</span>
                  <Badge variant={can(permission) ? "default" : "secondary"} className="text-xs">
                    {can(permission) ? "✓" : "✗"}
                  </Badge>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* Member Permission Tests */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 hover:bg-muted/50 p-1 rounded">
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium">Member Permissions ({memberPermissions.filter(p => can(p)).length}/{memberPermissions.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 space-y-1 mt-1">
              {memberPermissions.map(permission => (
                <div key={permission} className="flex items-center justify-between">
                  <span className="text-xs">{permission}</span>
                  <Badge variant={can(permission) ? "default" : "secondary"} className="text-xs">
                    {can(permission) ? "✓" : "✗"}
                  </Badge>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>

          {/* All Permissions */}
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 hover:bg-muted/50 p-1 rounded">
              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span className="font-medium">All Permissions ({userPermissions.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 space-y-1 mt-1 max-h-32 overflow-auto">
              {userPermissions.length > 0 ? (
                userPermissions.map(permission => (
                  <div key={permission} className="text-xs p-1 bg-muted/30 rounded">
                    {permission}
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground">No permissions found</div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Permission Summary */}
          {permissionSummary && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1 hover:bg-muted/50 p-1 rounded">
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium">Permission Summary</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-4 space-y-1 mt-1">
                <div className="text-xs space-y-1">
                  <div>Total: {permissionSummary.total_permissions}</div>
                  <div>Direct: {permissionSummary.by_source.direct.length}</div>
                  <div>Groups: {permissionSummary.by_source.groups.length}</div>
                  <div>Roles: {permissionSummary.by_source.roles.length}</div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Raw Data */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 hover:bg-muted/50 p-1 rounded">
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium">Raw Data</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 mt-1">
              <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto max-h-32">
                {JSON.stringify({
                  user: user ? {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    roles: user.roles,
                    is_active: user.is_active,
                    isLoggedIn: user.isLoggedIn,
                    permissions_loaded_at: user.permissions_loaded_at
                  } : null,
                  permissions: userPermissions,
                  loading,
                  roleChecks: { isAdmin, isCSR, isFueler, isMember }
                }, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  )
} 