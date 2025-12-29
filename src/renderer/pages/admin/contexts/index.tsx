import { useEffect } from "react"
import { getCurrentUserFromToken } from "@/services/auth"

export default function AdminContextsPage() {
  const currentUser = getCurrentUserFromToken()
  const isCurrentUserAdmin = currentUser?.userType === 'admin'

  useEffect(() => {
    if (!isCurrentUserAdmin) {
      // Access denied - component will render error message
    }
  }, [isCurrentUserAdmin])

  if (!isCurrentUserAdmin) {
    return (
      <div className="text-center space-y-4">
        <div className="text-destructive">Access denied. Admin privileges required.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">All Contexts</h1>
        <p className="text-muted-foreground mt-2">Manage all contexts across all users</p>
      </div>

      {/* Coming Soon Section */}
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Coming Soon</h2>
          <p className="text-muted-foreground max-w-md">
            Global context management is currently under development. Check back later for updates.
          </p>
        </div>
      </div>
    </div>
  )
}
