import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AuthSession } from '../../shared/types'
import type { TreeNode } from '@/types/workspace'
import { TreeView } from '@/components/common/tree-view'
import { useTreeOperations } from '@/hooks/useTreeOperations'
import {
  FolderTree,
  Network,
  Bot,
  Shield,
  Settings,
  PanelLeft,
  LogOut,
} from 'lucide-react'
import {
  getContextTree,
  listContexts,
  getWorkspaceTree,
  listWorkspaces,
  updateContextUrl,
  type ContextSummary,
  type WorkspaceSummary,
} from '../lib/canvas-api'

type PinnedTarget = { workspaceId: string; workspaceName: string; path: string }
type FollowTarget = { contextId: string }

function formatWorkspaceUrl(workspaceName: string, path: string) {
  const clean = (path || '/').replace(/\/+$/, '') || '/'
  const tail = clean === '/' ? '' : clean.replace(/^\//, '')
  return `${workspaceName}://${tail}`
}

type NavSection = 'workspaces' | 'contexts' | 'agents' | 'roles' | 'settings'

export function CanvasShell({
  session,
  onLogout,
}: {
  session: AuthSession
  onLogout: () => Promise<void>
}) {
  const [drawerOpen, setDrawerOpen] = React.useState(true)
  const [nav, setNav] = React.useState<NavSection>('workspaces')

  const [workspaces, setWorkspaces] = React.useState<WorkspaceSummary[]>([])
  const [contexts, setContexts] = React.useState<ContextSummary[]>([])

  const [workspaceTree, setWorkspaceTree] = React.useState<TreeNode | null>(null)
  const [contextTree, setContextTree] = React.useState<TreeNode | null>(null)

  const [pinned, setPinned] = React.useState<PinnedTarget | null>(null)
  const [follow, setFollow] = React.useState<FollowTarget | null>(null)

  const [pinnedPath, setPinnedPath] = React.useState('/')
  const [followPath, setFollowPath] = React.useState('/')
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const refreshWorkspaceTree = React.useCallback(async () => {
    if (!pinned?.workspaceId) return
    const tree = await getWorkspaceTree(session, pinned.workspaceId)
    setWorkspaceTree(tree as unknown as TreeNode)
  }, [pinned?.workspaceId, session])

  const refreshContextTree = React.useCallback(async () => {
    if (!follow?.contextId) return
    const tree = await getContextTree(session, follow.contextId)
    setContextTree(tree as unknown as TreeNode)
  }, [follow?.contextId, session])

  const workspaceTreeOps = useTreeOperations({
    session,
    workspaceId: pinned?.workspaceId,
    onRefresh: () => void refreshWorkspaceTree(),
  })

  const contextTreeOps = useTreeOperations({
    session,
    contextId: follow?.contextId,
    onRefresh: () => void refreshContextTree(),
  })

  React.useEffect(() => {
    ;(async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [ws, ctx] = await Promise.all([listWorkspaces(session), listContexts(session)])
        setWorkspaces(ws)
        setContexts(ctx)

        if (ws[0]) {
          const tree = await getWorkspaceTree(session, ws[0].id)
          setWorkspaceTree(tree as unknown as TreeNode)
          setPinned({ workspaceId: ws[0].id, workspaceName: ws[0].name, path: '/' })
          setPinnedPath('/')
        }
        if (ctx[0]) {
          setFollow({ contextId: ctx[0].id })
          const tree = await getContextTree(session, ctx[0].id)
          setContextTree(tree as unknown as TreeNode)
          setFollowPath('/')
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setIsLoading(false)
      }
    })()
  }, [session])

  const pinnedUrl = React.useMemo(() => {
    if (!pinned) return '(not set)'
    return formatWorkspaceUrl(pinned.workspaceName, pinned.path)
  }, [pinned])

  const followUrl = React.useMemo(() => {
    if (!follow) return '(not set)'
    const c = contexts.find((x) => x.id === follow.contextId)
    return c?.url || '(no context url)'
  }, [follow, contexts])

  const currentTarget = nav === 'contexts' ? followUrl : pinnedUrl

  const setWorkspace = async (workspaceId: string) => {
    const ws = workspaces.find((w) => w.id === workspaceId)
    if (!ws) return
    setIsLoading(true)
    setError(null)
    try {
      const tree = await getWorkspaceTree(session, ws.id)
      setWorkspaceTree(tree as unknown as TreeNode)
      setPinnedPath('/')
      setPinned({ workspaceId: ws.id, workspaceName: ws.name, path: '/' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workspace tree')
    } finally {
      setIsLoading(false)
    }
  }

  const setContext = async (contextId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      setFollow({ contextId })
      setFollowPath('/')
      const tree = await getContextTree(session, contextId)
      setContextTree(tree as unknown as TreeNode)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load context tree')
    } finally {
      setIsLoading(false)
    }
  }

  const onSelectPinnedPath = (path: string) => {
    setPinnedPath(path)
    if (!pinned) return
    setPinned({ ...pinned, path })
  }

  const onSelectFollowPath = async (path: string) => {
    if (!follow) return
    setFollowPath(path)
    const ctx = contexts.find((c) => c.id === follow.contextId)
    if (!ctx) return

    const nextUrl = formatWorkspaceUrl(ctx.workspaceName, path)
    setIsLoading(true)
    setError(null)
    try {
      const updated = await updateContextUrl(session, follow.contextId, nextUrl)
      setContexts((prev) => prev.map((c) => (c.id === follow.contextId ? { ...c, url: updated } : c)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update context url')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen flex bg-background text-foreground">
      {/* Navigation rail */}
      <div className="h-full w-16 border-r bg-muted/10 flex flex-col items-center py-3 gap-2">
        <button
          className="h-10 w-10 rounded-xl hover:bg-muted flex items-center justify-center"
          onClick={() => setDrawerOpen((v) => !v)}
          title={drawerOpen ? 'Hide navigation' : 'Show navigation'}
        >
          <PanelLeft className="h-5 w-5" />
        </button>

        <div className="h-px w-10 bg-border my-1" />

        <RailItem
          active={nav === 'workspaces'}
          icon={<FolderTree className="h-5 w-5" />}
          label="Workspaces"
          onClick={() => {
            setNav('workspaces')
            setDrawerOpen(true)
          }}
        />
        <RailItem
          active={nav === 'contexts'}
          icon={<Network className="h-5 w-5" />}
          label="Contexts"
          onClick={() => {
            setNav('contexts')
            setDrawerOpen(true)
          }}
        />
        <RailItem
          active={nav === 'agents'}
          icon={<Bot className="h-5 w-5" />}
          label="Agents"
          disabled
          onClick={() => {}}
        />
        <RailItem
          active={nav === 'roles'}
          icon={<Shield className="h-5 w-5" />}
          label="Roles"
          disabled
          onClick={() => {}}
        />
        <div className="flex-1" />
        <RailItem
          active={nav === 'settings'}
          icon={<Settings className="h-5 w-5" />}
          label="Settings"
          disabled
          onClick={() => {}}
        />
      </div>

      {/* Drawer */}
      <div
        className={cn(
          'h-full border-r bg-background transition-all duration-200',
          drawerOpen ? 'w-[360px]' : 'w-0 overflow-hidden'
        )}
      >
        <div className="h-12 px-4 flex items-center justify-between border-b">
          <div className="text-sm font-semibold">
            {nav === 'workspaces'
              ? 'Workspaces'
              : nav === 'contexts'
                ? 'Contexts'
                : nav === 'agents'
                  ? 'Agents'
                  : nav === 'roles'
                    ? 'Roles'
                    : 'Settings'}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(false)}>
            Hide
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {nav === 'workspaces' && (
            <>
              <div className="grid gap-2">
                <div className="text-xs text-muted-foreground">Workspace</div>
                <select
                  value={pinned?.workspaceId ?? ''}
                  onChange={(e) => setWorkspace(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>

              {workspaceTree && (
                <TreeView
                  tree={workspaceTree}
                  selectedPath={pinnedPath}
                  onPathSelect={onSelectPinnedPath}
                  readOnly={false}
                  title="Workspace Tree"
                  subtitle="Right-click for context menu, drag to move/copy (Ctrl=copy, Shift=recursive)"
                  onInsertPath={workspaceTreeOps.insertPath}
                  onRemovePath={workspaceTreeOps.removePath}
                  onMovePath={workspaceTreeOps.movePath}
                  onCopyPath={workspaceTreeOps.copyPath}
                  onMergeUp={workspaceTreeOps.mergeUp}
                  onMergeDown={workspaceTreeOps.mergeDown}
                />
              )}
            </>
          )}

          {nav === 'contexts' && (
            <>
              <div className="grid gap-2">
                <div className="text-xs text-muted-foreground">Context</div>
                <select
                  value={follow?.contextId ?? ''}
                  onChange={(e) => setContext(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {contexts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} ({c.workspaceName})
                    </option>
                  ))}
                </select>
              </div>

              {contextTree && (
                <TreeView
                  tree={contextTree}
                  selectedPath={followPath}
                  onPathSelect={onSelectFollowPath}
                  readOnly={false}
                  title="Context Tree"
                  subtitle="Click path to set context URL • Right-click / drag-drop to operate on tree"
                  onInsertPath={contextTreeOps.insertPath}
                  onRemovePath={contextTreeOps.removePath}
                  onMovePath={contextTreeOps.movePath}
                  onCopyPath={contextTreeOps.copyPath}
                  onMergeUp={contextTreeOps.mergeUp}
                  onMergeDown={contextTreeOps.mergeDown}
                />
              )}
            </>
          )}

          {(nav === 'agents' || nav === 'roles' || nav === 'settings') && (
            <div className="text-sm text-muted-foreground">
              Not wired yet (intentionally). We’ll hook this up after workspaces/contexts feel great.
            </div>
          )}

          {isLoading && <div className="text-xs text-muted-foreground">Loading…</div>}
          {error && <div className="text-xs text-red-500">{error}</div>}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <div className="h-12 px-4 flex items-center justify-between border-b">
          <div className="flex items-center gap-3">
            {!drawerOpen && (
              <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
                Menu
              </Button>
            )}
            <div className="text-sm font-medium">Canvas</div>
            <div className="text-xs text-muted-foreground">
              {nav === 'contexts' ? 'Following context' : 'Pinned'}
            </div>
            <div className="ml-2 px-2 py-1 rounded-md bg-muted text-xs font-mono">
              {currentTarget}
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="flex-1 p-6">
          <div className="text-sm text-muted-foreground">Current target</div>
          <div className="mt-1 text-lg font-semibold">{currentTarget}</div>
          <div className="mt-4 text-sm text-muted-foreground">
            Next: render a default “context overview” applet for this target (documents, files, notes, tabs…).
          </div>
        </div>
      </div>
    </div>
  )
}

function RailItem({
  active,
  icon,
  label,
  onClick,
  disabled,
}: {
  active: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      className={cn(
        'h-12 w-12 rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors',
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted',
        active && !disabled && 'bg-muted'
      )}
      onClick={disabled ? undefined : onClick}
      title={label}
      disabled={disabled}
    >
      {icon}
      <span className="text-[10px] leading-none text-muted-foreground">{label}</span>
    </button>
  )
}
