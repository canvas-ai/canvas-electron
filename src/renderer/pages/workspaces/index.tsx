import { useEffect, useState } from "react"
import { generateNiceRandomHexColor } from "@/utils/color"
import { useSocketSubscription } from "@/hooks/useSocketSubscription"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast-container"
import { Plus } from "lucide-react"
import { WorkspaceCard } from "@/components/ui/workspace-card"
import { useNavigate } from "react-router-dom"
import { useSocket } from "@/hooks/useSocket"
import {
  listWorkspaces,
  createWorkspace,
  startWorkspace,
  stopWorkspace,
  updateWorkspace,
  removeWorkspace,
} from "@/services/workspace"


// Using global Workspace interface from types/api.d.ts
// Specific status type based on linter feedback for WorkspaceCard compatibility
type WorkspaceStatus = 'error' | 'available' | 'not_found' | 'active' | 'inactive' | 'removed' | 'destroyed';

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newWorkspaceName, setNewWorkspaceName] = useState("")
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("")
  const [newWorkspaceColor, setNewWorkspaceColor] = useState(generateNiceRandomHexColor())
  const [newWorkspaceLabel, setNewWorkspaceLabel] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null)
  const { showToast } = useToast()
  const navigate = useNavigate()
  const socket = useSocket()

  // WebSocket live updates
  useSocketSubscription(socket, 'workspace', {
    'workspace:status:changed': (data: { workspaceId: string; status: WorkspaceStatus }) =>
      setWorkspaces(prev => prev.map(ws => ws.id === data.workspaceId ? { ...ws, status: data.status } : ws)),
    'workspace:created': (data: { workspace: Workspace }) =>
      setWorkspaces(prev => [...prev, data.workspace as unknown as Workspace]),
    'workspace:deleted': (data: { workspaceId: string }) =>
      setWorkspaces(prev => prev.filter(ws => ws.id !== data.workspaceId))
  })

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        setIsLoading(true)
        const workspacesData = await listWorkspaces()
        // The service now returns the array directly
        setWorkspaces(workspacesData as Workspace[])
        setError(null)
      } catch (err) {
        console.error('Workspace fetch error:', err);

        // Extract the most detailed error message available
        let errorMessage = 'Failed to fetch workspaces';

        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === 'object' && err !== null) {
          const errorObj = err as any;
          // Try to extract from various possible error structures
          errorMessage = errorObj.message ||
                       errorObj.error ||
                       errorObj.payload?.message ||
                       errorObj.payload?.error ||
                       errorObj.statusText ||
                       'Failed to fetch workspaces';
        }

        setError(errorMessage)
        showToast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }
    loadWorkspaces()


  }, [socket])

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWorkspaceName.trim()) return

    setIsCreating(true)
    try {
      const newWorkspace = await createWorkspace({
        name: newWorkspaceName,
        description: newWorkspaceDescription || undefined,
        color: newWorkspaceColor,
        label: newWorkspaceLabel || newWorkspaceName,
      })
      // The service now returns the new workspace object directly
      setWorkspaces(prev => [...prev, newWorkspace as Workspace])
      setNewWorkspaceName("")
      setNewWorkspaceDescription("")
      setNewWorkspaceColor(generateNiceRandomHexColor())
      setNewWorkspaceLabel("")
      showToast({
        title: 'Success',
        description: `Workspace '${newWorkspace.label || newWorkspace.name}' created.`
      })
    } catch (err) {
      console.error('Workspace creation error:', err);

      // Extract the most detailed error message available
      let errorMessage = 'Failed to create workspace';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const errorObj = err as any;
        // Try to extract from various possible error structures
        errorMessage = errorObj.message ||
                     errorObj.error ||
                     errorObj.payload?.message ||
                     errorObj.payload?.error ||
                     errorObj.statusText ||
                     'Failed to create workspace';
      }

      showToast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleSaveWorkspaceDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingWorkspace) return

    try {
      const payloadToUpdate = {
        label: editingWorkspace.label,
        description: editingWorkspace.description,
        color: editingWorkspace.color,
      };

      const updatedWorkspace = await updateWorkspace(editingWorkspace.name, payloadToUpdate);

      setWorkspaces(prev => prev.map(ws =>
        ws.id === updatedWorkspace.id ? updatedWorkspace : ws
      ))

      showToast({
        title: 'Success',
        description: `Workspace '${updatedWorkspace.label}' details updated.`
      })
      setEditingWorkspace(null)

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update workspace'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  }

  const handleEditWorkspace = (workspace: Workspace) => {
    setEditingWorkspace(workspace)
  }

  const handleDestroyWorkspace = async (workspace: Workspace) => {
    try {
      // Remove the workspace (backend handles data destruction)
      await removeWorkspace(workspace.name)

      setWorkspaces(prev => prev.filter(ws => ws.id !== workspace.id))
      showToast({
        title: 'Success',
        description: `Workspace '${workspace.label || workspace.name}' has been destroyed.`
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to destroy workspace'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  }

  const handleStartWorkspace = async (workspaceName: string) => {
    try {
      const updatedWorkspace = await startWorkspace(workspaceName)
      // The service now returns the updated workspace object directly
      setWorkspaces(prev => prev.map(ws => ws.name === updatedWorkspace.name ? (updatedWorkspace as Workspace) : ws))
      showToast({
        title: 'Success',
        description: `Workspace '${updatedWorkspace.label || updatedWorkspace.name}' started.`
      })
    } catch (err) {
      console.error('Workspace start error:', err);

      // Extract the most detailed error message available
      let errorMessage = 'Failed to start workspace';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const errorObj = err as any;
        // Try to extract from various possible error structures
        errorMessage = errorObj.message ||
                     errorObj.error ||
                     errorObj.payload?.message ||
                     errorObj.payload?.error ||
                     errorObj.statusText ||
                     'Failed to start workspace';
      }

      showToast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  const handleStopWorkspace = async (workspaceName: string) => {
    try {
      const updatedWorkspace = await stopWorkspace(workspaceName)
      // The service now returns the updated workspace object directly
      setWorkspaces(prev => prev.map(ws => ws.name === updatedWorkspace.name ? (updatedWorkspace as Workspace) : ws))
      showToast({
        title: 'Success',
        description: `Workspace '${updatedWorkspace.label || updatedWorkspace.name}' stopped.`
      })
    } catch (err) {
      console.error('Workspace stop error:', err);

      // Extract the most detailed error message available
      let errorMessage = 'Failed to stop workspace';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const errorObj = err as any;
        // Try to extract from various possible error structures
        errorMessage = errorObj.message ||
                     errorObj.error ||
                     errorObj.payload?.message ||
                     errorObj.payload?.error ||
                     errorObj.statusText ||
                     'Failed to stop workspace';
      }

      showToast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }

  const handleEnterWorkspace = (workspaceName: string) => {
    navigate(`/workspaces/${workspaceName}`)
  }


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
        <p className="text-muted-foreground mt-2">Divide your Universe into self-contained workspaces</p>
      </div>

      {/* Create New Workspace Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Create New Workspace</h2>
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Workspace Name (e.g., 'my-project')"
              disabled={isCreating}
            />
            <Input
              value={newWorkspaceLabel}
              onChange={(e) => setNewWorkspaceLabel(e.target.value)}
              placeholder="Workspace Label (display name, optional)"
              disabled={isCreating}
            />
          </div>
          <Input
            value={newWorkspaceDescription}
            onChange={(e) => setNewWorkspaceDescription(e.target.value)}
            placeholder="Description (optional)"
            disabled={isCreating}
          />
          <div className="flex items-center gap-2">
            <label htmlFor="workspace-color" className="text-sm font-medium">Workspace Color</label>
            <Input
              id="workspace-color"
              type="color"
              value={newWorkspaceColor}
              onChange={(e) => setNewWorkspaceColor(e.target.value)}
              className="h-10 w-16 p-1"
              disabled={isCreating}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNewWorkspaceColor(generateNiceRandomHexColor())}
              disabled={isCreating}
            >
              Randomize
            </Button>
          </div>
          <Button type="submit" disabled={isCreating || !newWorkspaceName.trim()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Workspace
          </Button>
        </form>
      </div>

      {/* Open Shared Resource */}
      <OpenSharedResource />

      {/* Your Workspaces Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Workspaces</h2>

        {isLoading && <p className="text-center text-muted-foreground">Loading workspaces...</p>}

        {error && (
          <div className="text-center text-destructive">
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && workspaces.length === 0 && (
          <p className="text-center text-muted-foreground">No workspaces found</p>
        )}

        {workspaces.length > 0 && (
          <div className="grid gap-4">
            {workspaces.map((ws) => {
              const workspaceCardProps = {
                ...ws,
                createdAt: ws.createdAt,
                updatedAt: ws.updatedAt,
                color: ws.color === null ? undefined : ws.color,
              };
              return (
                <WorkspaceCard
                  key={ws.id}
                  workspace={workspaceCardProps}
                  onStart={handleStartWorkspace}
                  onStop={handleStopWorkspace}
                  onEnter={handleEnterWorkspace}
                  onEdit={handleEditWorkspace}
                  onDestroy={handleDestroyWorkspace}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Workspace Section */}
      {editingWorkspace && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Edit Workspace: {editingWorkspace.label}</h2>
          <form onSubmit={handleSaveWorkspaceDetails} className="space-y-4">
            <div>
              <label htmlFor="edit-label" className="text-sm font-medium">Label</label>
              <Input
                id="edit-label"
                value={editingWorkspace.label}
                onChange={(e) => setEditingWorkspace(prev => prev ? {...prev, label: e.target.value} : null)}
                placeholder="Workspace Label"
              />
            </div>
            <div>
              <label htmlFor="edit-description" className="text-sm font-medium">Description</label>
              <Input
                id="edit-description"
                value={editingWorkspace.description || ''}
                onChange={(e) => setEditingWorkspace(prev => prev ? {...prev, description: e.target.value} : null)}
                placeholder="Description (optional)"
              />
            </div>
            <div>
              <label htmlFor="edit-color" className="text-sm font-medium">Color</label>
              <div className="flex items-center gap-2">
                <Input
                  id="edit-workspace-color"
                  type="color"
                  value={editingWorkspace.color || '#FFFFFF'}
                  onChange={(e) => setEditingWorkspace(prev => prev ? {...prev, color: e.target.value} : null)}
                  className="h-10 w-16 p-1"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingWorkspace(prev => prev ? {...prev, color: generateNiceRandomHexColor()} : null)}
                  >
                    Randomize Color
                  </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={!editingWorkspace.label?.trim()}>
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingWorkspace(null)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function OpenSharedResource() {
  const { showToast } = useToast()
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [isOpening, setIsOpening] = useState(false)

  const parse = (input: string) => {
    try {
      const u = new URL(input)
      return u
    } catch {
      return null
    }
  }

  const handleOpen = async () => {
    const u = parse(url.trim())
    if (!u) {
      showToast({ title: 'Error', description: 'Invalid URL', variant: 'destructive' })
      return
    }
    if (!token.trim().startsWith('canvas-')) {
      showToast({ title: 'Error', description: 'Invalid access token', variant: 'destructive' })
      return
    }

    setIsOpening(true)
    try {
      // Navigate to shared viewer to keep UI minimal and reusable
      const q = new URLSearchParams({ url: url.trim(), token: token.trim() }).toString()
      window.location.href = `/shared?${q}`
    } catch (err) {
      showToast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to open shared resource', variant: 'destructive' })
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Open Shared Resource</h2>
      <div className="grid gap-2 md:grid-cols-3">
        <Input placeholder="Shared URL (e.g., https://host/rest/v2/pub/workspaces/ID)" value={url} onChange={(e) => setUrl(e.target.value)} />
        <Input placeholder="Access token (canvas-...)" value={token} onChange={(e) => setToken(e.target.value)} />
        <Button onClick={handleOpen} disabled={isOpening || !url.trim() || !token.trim()}>Open</Button>
      </div>
      <p className="text-sm text-muted-foreground">We use your provided URL and token to fetch via the remote's public API.</p>
    </div>
  )
}



