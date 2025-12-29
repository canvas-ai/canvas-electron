import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast-container"
import { Plus, Trash, Eye, X, Users } from "lucide-react"
import { adminService, AdminWorkspace, CreateWorkspaceData, AdminUser } from "@/services/admin"
import { getCurrentUserFromToken } from "@/services/auth"

// Define form data interface
interface WorkspaceFormData {
  userId: string;
  name: string;
  label: string;
  description: string;
  color: string;
  type: 'workspace' | 'universe';
}

// Utility function to generate nice random colors
const generateRandomColor = (): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
    '#10AC84', '#EE5A24', '#EA2027', '#009432', '#0652DD'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export default function AdminWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    owner: '',
    type: '',
    status: ''
  })

  // Form data for creating workspaces
  const [formData, setFormData] = useState<WorkspaceFormData>({
    userId: '',
    name: '',
    label: '',
    description: '',
    color: generateRandomColor(),
    type: 'workspace'
  })

  const { showToast } = useToast()
  const currentUser = getCurrentUserFromToken()

  // Check if current user is admin
  const isCurrentUserAdmin = currentUser?.userType === 'admin'

  useEffect(() => {
    if (!isCurrentUserAdmin) {
      setError('Access denied. Admin privileges required.')
      setIsLoading(false)
      return
    }
    fetchWorkspaces()
  }, [isCurrentUserAdmin])

  const fetchWorkspaces = useCallback(async () => {
    try {
      setIsLoading(true)
      const fetchedWorkspaces = await adminService.workspaces.listAllWorkspaces()
      setWorkspaces(fetchedWorkspaces)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch workspaces'
      setError(message)
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true)
      const fetchedUsers = await adminService.users.listUsers({ status: 'active' })
      setUsers(fetchedUsers)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setIsLoadingUsers(false)
    }
  }, [showToast])

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.userId || !formData.name.trim()) {
      showToast({
        title: 'Validation Error',
        description: 'User and workspace name are required',
        variant: 'destructive'
      })
      return
    }

    setIsCreating(true)
    try {
      const workspaceData: CreateWorkspaceData = {
        userId: formData.userId,
        name: formData.name.trim(),
        label: formData.label.trim() || formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
        type: formData.type
      }

      await adminService.workspaces.createWorkspace(workspaceData)

      // Reset form
      setFormData({
        userId: '',
        name: '',
        label: '',
        description: '',
        color: generateRandomColor(),
        type: 'workspace'
      })
      setIsModalOpen(false)

      await fetchWorkspaces()
      showToast({
        title: 'Success',
        description: 'Workspace created successfully'
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create workspace'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteWorkspace = async (workspaceId: string, workspaceName: string) => {
    if (!confirm(`Are you sure you want to delete workspace "${workspaceName}"? This action cannot be undone and will delete all data in the workspace.`)) {
      return
    }

    try {
      await adminService.workspaces.deleteWorkspace(workspaceId)
      await fetchWorkspaces()
      showToast({
        title: 'Success',
        description: 'Workspace deleted successfully'
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete workspace'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  }

  const openCreateModal = async () => {
    setFormData({
      userId: '',
      name: '',
      label: '',
      description: '',
      color: generateRandomColor(),
      type: 'workspace'
    })
    setIsModalOpen(true)
    await fetchUsers()
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  // Filter workspaces based on search and filters
  const filteredWorkspaces = workspaces.filter(workspace => {
    const matchesSearch = filters.search === '' ||
      workspace.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      workspace.label.toLowerCase().includes(filters.search.toLowerCase()) ||
      (workspace.ownerName && workspace.ownerName.toLowerCase().includes(filters.search.toLowerCase())) ||
      (workspace.ownerEmail && workspace.ownerEmail.toLowerCase().includes(filters.search.toLowerCase()))

    const matchesOwner = filters.owner === '' || workspace.owner === filters.owner
    const matchesType = filters.type === '' || workspace.type === filters.type
    const matchesStatus = filters.status === '' || workspace.status === filters.status

    return matchesSearch && matchesOwner && matchesType && matchesStatus
  })

  // Get unique owners for filter dropdown
  const uniqueOwners = Array.from(new Set(workspaces.map(ws => ws.owner)))
    .map(ownerId => {
      const workspace = workspaces.find(ws => ws.owner === ownerId)
      return {
        id: ownerId,
        name: workspace?.ownerName || workspace?.ownerEmail || ownerId
      }
    })

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
        <h1 className="text-3xl font-bold tracking-tight">Workspace Administration</h1>
        <p className="text-muted-foreground mt-2">Manage workspaces across all users</p>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            placeholder="Search workspaces..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="md:w-64"
          />
          <select
            value={filters.owner}
            onChange={(e) => setFilters(prev => ({ ...prev, owner: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Owners</option>
            {uniqueOwners.map(owner => (
              <option key={owner.id} value={owner.id}>{owner.name}</option>
            ))}
          </select>
          <select
            value={filters.type}
            onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Types</option>
            <option value="workspace">Workspace</option>
            <option value="universe">Universe</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="error">Error</option>
          </select>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Create Workspace
        </Button>
      </div>

      {/* Workspaces Table */}
      <div className="space-y-4">
        {isLoading && <p className="text-center text-muted-foreground">Loading workspaces...</p>}

        {error && !workspaces.length && (
          <div className="text-center text-destructive">
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && filteredWorkspaces.length === 0 && (
          <p className="text-center text-muted-foreground">No workspaces found</p>
        )}

        {filteredWorkspaces.length > 0 && (
          <div className="border rounded-md">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Label</th>
                    <th className="text-left p-3 font-medium">Owner</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Color</th>
                    <th className="text-left p-3 font-medium">Created</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkspaces.map((workspace) => (
                    <tr key={workspace.id} className="border-t">
                      <td className="p-3 font-medium font-mono text-sm">{workspace.name}</td>
                      <td className="p-3">{workspace.label}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{workspace.ownerName || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{workspace.ownerEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          workspace.type === 'universe'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {workspace.type}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          workspace.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : workspace.status === 'inactive'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {workspace.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: workspace.color }}
                          />
                          <span className="font-mono text-xs">{workspace.color}</span>
                        </div>
                      </td>
                      <td className="p-3">{new Date(workspace.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/workspaces/${workspace.name}`, '_blank')}
                          title="View workspace"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteWorkspace(workspace.id, workspace.name)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          title="Delete workspace"
                          disabled={workspace.type === 'universe'}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold">{workspaces.length}</div>
          <div className="text-sm text-muted-foreground">Total Workspaces</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold">
            {workspaces.filter(ws => ws.status === 'active').length}
          </div>
          <div className="text-sm text-muted-foreground">Active Workspaces</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold">
            {workspaces.filter(ws => ws.type === 'universe').length}
          </div>
          <div className="text-sm text-muted-foreground">Universe Workspaces</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-2xl font-bold">{uniqueOwners.length}</div>
          <div className="text-sm text-muted-foreground">Unique Owners</div>
        </div>
      </div>

      {/* Create Workspace Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create New Workspace</h3>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <Label htmlFor="userId">User</Label>
                <select
                  id="userId"
                  value={formData.userId}
                  onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
                  disabled={isCreating || isLoadingUsers}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select a user...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                {isLoadingUsers && (
                  <p className="text-xs text-muted-foreground mt-1">Loading users...</p>
                )}
              </div>

              <div>
                <Label htmlFor="name">Workspace Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="my-workspace"
                  disabled={isCreating}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lowercase letters, numbers, and hyphens only
                </p>
              </div>

              <div>
                <Label htmlFor="label">Display Label</Label>
                <Input
                  id="label"
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                  placeholder="My Workspace"
                  disabled={isCreating}
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Workspace description (optional)"
                  disabled={isCreating}
                />
              </div>

              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'workspace' | 'universe' }))}
                  disabled={isCreating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="workspace">Workspace</option>
                  <option value="universe">Universe</option>
                </select>
              </div>

              <div>
                <Label htmlFor="color">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    className="h-10 w-16 p-1"
                    disabled={isCreating}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, color: generateRandomColor() }))}
                    disabled={isCreating}
                  >
                    Random
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={isCreating || isLoadingUsers}
                  className="flex-1"
                >
                  {isCreating ? 'Creating...' : 'Create Workspace'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
