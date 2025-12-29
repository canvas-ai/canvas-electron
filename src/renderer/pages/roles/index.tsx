import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast-container"
import {
  Server,
  Play,
  Square,
  RotateCw,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  FileText
} from "lucide-react"
import { roleService, Role } from "@/services/role"
import { getCurrentUserFromToken } from "@/services/auth"

// Status badge component
function StatusBadge({ status }: { status: Role['status'] }) {
  const variants = {
    running: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Running' },
    stopped: { icon: XCircle, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Stopped' },
    starting: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Starting' },
    stopping: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Stopping' },
    error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Error' },
    created: { icon: Activity, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Created' },
    configured: { icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Configured' },
    removed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Removed' },
  }

  const variant = variants[status] || variants.created
  const Icon = variant.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${variant.bg} ${variant.color}`}>
      <Icon className="w-3 h-3" />
      {variant.label}
    </span>
  )
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLogs, setSelectedLogs] = useState<{role: Role, logs: string[]} | null>(null)

  const { showToast } = useToast()
  const currentUser = getCurrentUserFromToken()

  useEffect(() => {
    fetchRoles()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchRoles, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchRoles = useCallback(async () => {
    try {
      setIsLoading(true)
      // Fetch workspace roles for current user
      const fetchedRoles = await roleService.listRoles({
        type: 'workspace',
        userId: currentUser?.id
      })
      setRoles(fetchedRoles)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch roles'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [currentUser?.id])

  const handleStartRole = async (role: Role) => {
    try {
      await roleService.startRole(role.id)
      showToast({
        title: 'Success',
        description: `Role "${role.name}" started successfully`
      })
      fetchRoles()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start role'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  }

  const handleStopRole = async (role: Role) => {
    try {
      await roleService.stopRole(role.id)
      showToast({
        title: 'Success',
        description: `Role "${role.name}" stopped successfully`
      })
      fetchRoles()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to stop role'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  }

  const handleRestartRole = async (role: Role) => {
    try {
      await roleService.restartRole(role.id)
      showToast({
        title: 'Success',
        description: `Role "${role.name}" restarted successfully`
      })
      fetchRoles()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restart role'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  }

  const handleViewLogs = async (role: Role) => {
    try {
      const logs = await roleService.getRoleLogs(role.id, 100)
      setSelectedLogs({ role, logs })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch logs'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Roles</h1>
          <p className="text-muted-foreground mt-2">
            Manage your workspace roles and services
          </p>
        </div>
        <Button onClick={fetchRoles} variant="outline">
          <RotateCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Roles Grid */}
      {isLoading ? (
        <div className="text-center py-8">Loading roles...</div>
      ) : error ? (
        <div className="text-center py-8 text-destructive">{error}</div>
      ) : roles.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Server className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            You don't have any workspace roles yet
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Contact your administrator to set up roles for your workspaces
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className="border rounded-lg p-6 space-y-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{role.name}</h3>
                  <p className="text-sm text-muted-foreground">{role.template}</p>
                </div>
                <StatusBadge status={role.status} />
              </div>

              {role.container && (
                <div className="text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Server className="w-3 h-3" />
                    <span className="truncate">{role.container.name}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {role.status === 'stopped' || role.status === 'created' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStartRole(role)}
                    className="flex-1"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </Button>
                ) : role.status === 'running' ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStopRole(role)}
                      className="flex-1"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRestartRole(role)}
                      className="flex-1"
                    >
                      <RotateCw className="w-4 h-4 mr-2" />
                      Restart
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" disabled className="flex-1">
                    <Clock className="w-4 h-4 mr-2" />
                    {role.status}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewLogs(role)}
                  title="View Logs"
                >
                  <FileText className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Global Roles Info */}
      <div className="border-t pt-6">
        <h2 className="text-lg font-semibold mb-4">Global Services</h2>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            Global roles are server-wide services managed by your administrator.
            These include services like SSH access, storage, and other shared infrastructure.
          </p>
          <p>
            To check the status of global services, contact your system administrator.
          </p>
        </div>
      </div>

      {/* Logs Modal */}
      {selectedLogs && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">{selectedLogs.role.name} - Logs</h2>
              <p className="text-sm text-muted-foreground">{selectedLogs.role.template}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-black text-green-400 p-4 rounded font-mono text-xs overflow-x-auto">
                {selectedLogs.logs.length === 0 ? (
                  <div className="text-gray-500">No logs available</div>
                ) : (
                  <pre>{selectedLogs.logs.join('\n')}</pre>
                )}
              </div>
            </div>

            <div className="p-4 border-t flex justify-end">
              <Button onClick={() => setSelectedLogs(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
