import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast-container"
import {
  Play,
  Square,
  RotateCw,
  Trash,
  Plus,
  Server,
  Activity,
  FileText,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react"
import { roleService, Role, RoleTemplate, CreateRoleData } from "@/services/role"
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

// Type badge component
function TypeBadge({ type }: { type: 'global' | 'workspace' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
      type === 'global' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
    }`}>
      <Server className="w-3 h-3" />
      {type === 'global' ? 'Global' : 'Workspace'}
    </span>
  )
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [templates, setTemplates] = useState<RoleTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    search: ''
  })

  // Form data for creating roles
  const [formData, setFormData] = useState<CreateRoleData>({
    template: '',
    name: '',
    type: 'global',
  })

  const { showToast } = useToast()
  const currentUser = getCurrentUserFromToken()
  const isCurrentUserAdmin = currentUser?.userType === 'admin'

  useEffect(() => {
    if (!isCurrentUserAdmin) {
      setError('Access denied. Admin privileges required.')
      setIsLoading(false)
      return
    }
    fetchRoles()
    fetchTemplates()
  }, [isCurrentUserAdmin])

  const fetchRoles = useCallback(async () => {
    try {
      setIsLoading(true)
      const { type, status } = filters
      const fetchedRoles = await roleService.listRoles({
        type: type || undefined,
        status: status || undefined
      })
      setRoles(fetchedRoles)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch roles'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  const fetchTemplates = useCallback(async () => {
    try {
      const fetchedTemplates = await roleService.listTemplates()
      setTemplates(fetchedTemplates)
    } catch (err) {
      console.error('Failed to fetch templates:', err)
    }
  }, [])

  const handleCreateRole = async () => {
    if (!formData.template || !formData.name) {
      showToast({
        title: 'Validation Error',
        description: 'Template and name are required',
        variant: 'destructive'
      })
      return
    }

    try {
      await roleService.createRole(formData)
      showToast({
        title: 'Success',
        description: `Role "${formData.name}" created successfully`
      })
      setIsModalOpen(false)
      resetForm()
      fetchRoles()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create role'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  }

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

  const handleDeleteRole = async (role: Role) => {
    if (!confirm(`Are you sure you want to delete role "${role.name}"?`)) {
      return
    }

    try {
      await roleService.deleteRole(role.id, role.status === 'running')
      showToast({
        title: 'Success',
        description: `Role "${role.name}" deleted successfully`
      })
      fetchRoles()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete role'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  }

  const handleViewLogs = async (role: Role) => {
    try {
      const fetchedLogs = await roleService.getRoleLogs(role.id, 100)
      setLogs(fetchedLogs)
      setSelectedRole(role)
      setIsLogsModalOpen(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch logs'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      template: '',
      name: '',
      type: 'global',
    })
  }

  const openCreateModal = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const closeCreateModal = () => {
    setIsModalOpen(false)
    resetForm()
  }

  const filteredRoles = roles.filter(role => {
    const matchesSearch = !filters.search ||
      role.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      role.template.toLowerCase().includes(filters.search.toLowerCase())

    return matchesSearch
  })

  if (!isCurrentUserAdmin) {
    return (
      <div className="text-center space-y-4">
        <div className="text-destructive">Access denied. Admin privileges required.</div>
      </div>
    )
  }

  if (error && !isCurrentUserAdmin) {
    return (
      <div className="text-center space-y-4">
        <div className="text-destructive">{error}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Role Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage global and workspace roles for Canvas services
          </p>
        </div>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Role
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Search by name or template..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <div className="w-48">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            className="w-full px-3 py-2 border rounded-md bg-background"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="">All Types</option>
            <option value="global">Global</option>
            <option value="workspace">Workspace</option>
          </select>
        </div>
        <div className="w-48">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="w-full px-3 py-2 border rounded-md bg-background"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
            <option value="starting">Starting</option>
            <option value="error">Error</option>
          </select>
        </div>
        <Button onClick={fetchRoles} variant="outline">
          <RotateCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Roles Table */}
      {isLoading ? (
        <div className="text-center py-8">Loading roles...</div>
      ) : filteredRoles.length === 0 ? (
        <div className="text-center py-8 border rounded-lg">
          <Server className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {filters.search || filters.type || filters.status
              ? 'No roles match your filters'
              : 'No roles created yet'}
          </p>
          {!filters.search && !filters.type && !filters.status && (
            <Button onClick={openCreateModal} variant="outline" className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Role
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Template</th>
                <th className="text-left p-4 font-medium">Type</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Container</th>
                <th className="text-left p-4 font-medium">Created</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredRoles.map((role) => (
                <tr key={role.id} className="hover:bg-muted/50">
                  <td className="p-4 font-medium">{role.name}</td>
                  <td className="p-4 text-sm text-muted-foreground">{role.template}</td>
                  <td className="p-4">
                    <TypeBadge type={role.type} />
                  </td>
                  <td className="p-4">
                    <StatusBadge status={role.status} />
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {role.container?.name || '-'}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(role.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end gap-2">
                      {role.status === 'stopped' || role.status === 'created' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartRole(role)}
                          title="Start"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      ) : role.status === 'running' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStopRole(role)}
                          title="Stop"
                        >
                          <Square className="w-4 h-4" />
                        </Button>
                      ) : null}

                      {role.status === 'running' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestartRole(role)}
                          title="Restart"
                        >
                          <RotateCw className="w-4 h-4" />
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

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteRole(role)}
                        title="Delete"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Create New Role</h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={closeCreateModal}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="template">Template *</Label>
                  <select
                    id="template"
                    className="w-full px-3 py-2 border rounded-md bg-background mt-1"
                    value={formData.template}
                    onChange={(e) => setFormData({ ...formData, template: e.target.value })}
                  >
                    <option value="">Select a template...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} - {template.description}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="name">Role Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., canvas-sshd"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="roleType">Type *</Label>
                  <select
                    id="roleType"
                    className="w-full px-3 py-2 border rounded-md bg-background mt-1"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'global' | 'workspace' })}
                  >
                    <option value="global">Global (Server-wide)</option>
                    <option value="workspace">Workspace (User-scoped)</option>
                  </select>
                </div>

                {formData.template && (
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 className="font-medium mb-2">Template Info</h3>
                    {templates.find(t => t.id === formData.template) && (
                      <div className="text-sm space-y-1 text-muted-foreground">
                        <p><strong>Image:</strong> {templates.find(t => t.id === formData.template)?.container.image}</p>
                        <p><strong>Category:</strong> {templates.find(t => t.id === formData.template)?.category}</p>
                        {templates.find(t => t.id === formData.template)?.documentation?.readme && (
                          <p className="mt-2">{templates.find(t => t.id === formData.template)?.documentation?.readme}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={closeCreateModal}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRole}>
                  Create Role
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {isLogsModalOpen && selectedRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Role Logs</h2>
                <p className="text-sm text-muted-foreground">{selectedRole.name}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsLogsModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-black text-green-400 p-4 rounded font-mono text-xs overflow-x-auto">
                {logs.length === 0 ? (
                  <div className="text-gray-500">No logs available</div>
                ) : (
                  <pre>{logs.join('\n')}</pre>
                )}
              </div>
            </div>

            <div className="p-4 border-t flex justify-end">
              <Button onClick={() => setIsLogsModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
