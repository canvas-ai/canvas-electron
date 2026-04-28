import { StrictMode, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bot,
  Boxes,
  FolderTree,
  PlugZap,
  Power,
  Settings,
  Shield,
  TreePine,
} from 'lucide-react';
import '../index.css';

import type { Context, ContextMode, TreeNode, Workspace } from './types';
import { fetchContexts, fetchContextTree, fetchWorkspaceTree, fetchWorkspaces, setContextUrl } from './api';
import { MenuTreeView } from './MenuTreeView';

type MenuShellStage = 'collapsed' | 'tree' | 'mainMenu';
type MenuSection = 'workspaces' | 'agents' | 'roles' | 'remotes' | 'settings';

const MENU_ITEMS: Array<{ id: MenuSection; label: string; icon: typeof Boxes }> = [
  { id: 'workspaces', label: 'Workspaces', icon: Boxes },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'roles', label: 'Roles', icon: Shield },
  { id: 'remotes', label: 'Remotes', icon: PlugZap },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const RAIL_PRIMARY = MENU_ITEMS.filter((item) => item.id !== 'settings');

function RailIconButton({
  title: label,
  active,
  onClick,
  children,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
      }`}
    >
      {active && <span className="absolute right-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-l bg-foreground" />}
      {children}
    </button>
  );
}

function toWorkspaceRoot(workspaceName?: string) {
  return workspaceName ? `${workspaceName}://` : '/';
}

function toExplorerUrl(workspaceName: string, path: string) {
  const normalized = path.replace(/^\/+/, '');
  return normalized ? `${workspaceName}://${normalized}` : `${workspaceName}://`;
}

function toExplorerPath(url?: string) {
  const match = String(url || '').match(/^[^:]+:\/\/(.*)$/);
  const raw = match?.[1] || '';
  return raw ? `/${raw.replace(/^\/+/, '')}` : '/';
}

function contextsForWorkspace(contexts: Context[], workspace: Workspace | null) {
  if (!workspace) return [];
  return contexts.filter((context) => {
    const url = context.url || '';
    return url.startsWith(`${workspace.name}://`) || !url.includes('://');
  });
}

function useVisibility(callback: () => void) {
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') callback();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [callback]);
}


type SessionState = 'loading' | 'guest' | 'user';

function Menu() {
  const [shellStage, setShellStage] = useState<MenuShellStage>('collapsed');
  const [mainSection, setMainSection] = useState<MenuSection>('workspaces');
  const [authVersion, setAuthVersion] = useState(0);
  const [session, setSession] = useState<SessionState>('loading');
  const [isConnected, setIsConnected] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [contexts, setContexts] = useState<Context[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [selectedContext, setSelectedContext] = useState<Context | null>(null);
  const [contextMode, setContextMode] = useState<ContextMode>('explorer');
  const [explorerPath, setExplorerPath] = useState('/');
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [treeLoading, setTreeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);

  const workspaceContexts = useMemo(
    () => contextsForWorkspace(contexts, selectedWorkspace),
    [contexts, selectedWorkspace],
  );

  const workspaceColor = selectedContext?.color || selectedWorkspace?.color || '#2563eb';
  const currentUrl = useMemo(() => {
    if (!selectedWorkspace) return 'Not connected';
    if (contextMode === 'bound' && selectedContext?.url) return selectedContext.url;
    return toExplorerUrl(selectedWorkspace.name, explorerPath);
  }, [contextMode, explorerPath, selectedContext?.url, selectedWorkspace]);

  const loadTree = useCallback(async (
    workspace: Workspace | null,
    mode: ContextMode,
    context: Context | null,
  ) => {
    if (!workspace) {
      setTree(null);
      return;
    }

    setTreeLoading(true);
    setTreeError(null);
    try {
      if (mode === 'bound' && context?.id) {
        setTree(await fetchContextTree(context.id));
        setExplorerPath(toExplorerPath(context.url));
      } else {
        setTree(await fetchWorkspaceTree(workspace.name));
      }
    } catch (err) {
      setTreeError(err instanceof Error ? err.message : 'Failed to load tree.');
    } finally {
      setTreeLoading(false);
    }
  }, []);

  const refreshTree = useCallback(async (
    workspace = selectedWorkspace,
    mode = contextMode,
    context = selectedContext,
  ) => {
    await loadTree(workspace, mode, context);
  }, [contextMode, loadTree, selectedContext, selectedWorkspace]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = await window.canvas?.getAuthConfig?.();
      const loggedIn = !!(auth?.serverUrl && auth?.token);
      setIsConnected(loggedIn);

      if (!loggedIn) {
        setSession('guest');
        setWorkspaces([]);
        setContexts([]);
        setSelectedWorkspace(null);
        setSelectedContext(null);
        setTree(null);
        return;
      }

      setSession('user');
      const [workspaceList, contextList, savedMenu] = await Promise.all([
        fetchWorkspaces(),
        fetchContexts(),
        window.canvas?.getMenuState?.(),
      ]);

      setWorkspaces(workspaceList);
      setContexts(contextList);

      const workspace =
        workspaceList.find((entry) => entry.id === savedMenu?.workspaceId || entry.name === savedMenu?.workspaceName) ||
        workspaceList[0] ||
        null;

      setSelectedWorkspace(workspace);
      if (!workspace) {
        setSelectedContext(null);
        setTree(null);
        return;
      }

      const mode = savedMenu?.contextMode === 'bound' ? 'bound' : 'explorer';
      const context = mode === 'bound'
        ? contextList.find((entry) => entry.id === savedMenu?.contextId) || null
        : null;

      setContextMode(context ? 'bound' : 'explorer');
      setSelectedContext(context);
      setExplorerPath(context?.url ? toExplorerPath(context.url) : '/');
      await loadTree(workspace, context ? 'bound' : 'explorer', context);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load menu state.');
    } finally {
      setLoading(false);
    }
  }, [loadTree]);

  useEffect(() => {
    void window.canvas?.getMenuShellStage?.().then((stage) => {
      if (stage) setShellStage(stage);
    });

    const offStage = window.canvas?.onMenuShellStageChanged?.((stage) => setShellStage(stage));
    const offAuth = window.canvas?.onAuthChanged?.(() => setAuthVersion((value) => value + 1));
    return () => {
      offStage?.();
      offAuth?.();
    };
  }, []);

  useEffect(() => {
    void loadData();
  }, [authVersion, loadData]);

  useVisibility(() => {
    void loadData();
  });

  useEffect(() => {
    if (session === 'guest') void window.canvas?.setMenuShellStage?.('collapsed');
  }, [session]);

  useEffect(() => {
    if (!selectedWorkspace) return;
    void window.canvas?.setMenuState?.({
      view: 'tree',
      workspaceId: selectedWorkspace.id,
      workspaceName: selectedWorkspace.name,
      contextId: selectedContext?.id,
      contextMode,
    });
  }, [contextMode, selectedContext?.id, selectedWorkspace]);

  useEffect(() => {
    if (!selectedWorkspace) return;

    const channels = [`workspace:${selectedWorkspace.name}`];
    if (contextMode === 'bound' && selectedContext?.id) {
      channels.push(`context:${selectedContext.id}`);
    }
    channels.forEach((channel) => window.canvas?.wsSubscribe?.(channel));
    return () => {
      channels.forEach((channel) => window.canvas?.wsUnsubscribe?.(channel));
    };
  }, [contextMode, selectedContext?.id, selectedWorkspace?.name]);

  useEffect(() => {
    return window.canvas?.onWsEvent?.(() => {
      void refreshTree();
    });
  }, [refreshTree]);

  // Cycle workspaces on ctrl+alt+up/down
  useEffect(() => {
    return window.canvas?.onMenuNavTree?.((direction) => {
      if (!workspaces.length) return;
      setSelectedWorkspace((current) => {
        const idx = current ? workspaces.findIndex((w) => w.id === current.id) : -1;
        const next = direction === 'down'
          ? (idx + 1) % workspaces.length
          : (idx - 1 + workspaces.length) % workspaces.length;
        const workspace = workspaces[next];
        void refreshTree(workspace, 'explorer', null);
        void window.canvas?.setMenuShellStage?.('tree');
        return workspace;
      });
    });
  }, [workspaces, refreshTree]);

  const selectWorkspace = useCallback(async (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setSelectedContext(null);
    setContextMode('explorer');
    setExplorerPath('/');
    await refreshTree(workspace, 'explorer', null);
    await window.canvas?.setMenuShellStage?.('tree');
  }, [refreshTree]);

  const selectContext = useCallback(async (context: Context) => {
    if (!selectedWorkspace) return;
    setSelectedContext(context);
    setContextMode('bound');
    setExplorerPath(toExplorerPath(context.url));
    await window.canvas?.setContextSelection?.({
      selectedId: context.id,
      selectedUrl: context.url,
    });
    await refreshTree(selectedWorkspace, 'bound', context);
    await window.canvas?.setMenuShellStage?.('tree');
  }, [refreshTree, selectedWorkspace]);

  const selectExplorer = useCallback(async () => {
    if (!selectedWorkspace) return;
    setSelectedContext(null);
    setContextMode('explorer');
    setExplorerPath('/');
    await window.canvas?.clearContextSelection?.();
    await refreshTree(selectedWorkspace, 'explorer', null);
    await window.canvas?.setMenuShellStage?.('tree');
  }, [refreshTree, selectedWorkspace]);

  const handlePathSelect = useCallback(async (url: string) => {
    if (!selectedWorkspace) return;

    if (contextMode === 'bound' && selectedContext?.id) {
      try {
        await setContextUrl(selectedContext.id, url);
        setSelectedContext({ ...selectedContext, url });
        await window.canvas?.setContextSelection?.({
          selectedId: selectedContext.id,
          selectedUrl: url,
        });
      } catch (err) {
        console.error('Failed to set context URL', err);
      }
      return;
    }

    setExplorerPath(toExplorerPath(url));
  }, [contextMode, selectedContext, selectedWorkspace]);

  const isExpanded = shellStage !== 'collapsed';
  const m2Open = shellStage === 'tree';

  const openMainMenu = useCallback(() => {
    void window.canvas?.setMenuShellStage?.('mainMenu');
  }, []);

  const openTree = useCallback(() => {
    void window.canvas?.setMenuShellStage?.('tree');
  }, []);

  const closeM2 = useCallback(() => {
    void window.canvas?.setMenuShellStage?.('mainMenu');
  }, []);

  const handleConfirmSelection = useCallback((path: string) => {
    if (!selectedWorkspace) return;
    const canvasPath = path === '/'
      ? `${selectedWorkspace.name}://`
      : `${selectedWorkspace.name}:/${path}`;
    void window.canvas?.openCanvas?.(canvasPath);
  }, [selectedWorkspace]);

  const m1Content = (
    <main className="min-h-0 flex-1 overflow-y-auto p-3">
      <div className="mb-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current</div>
        <div className="truncate text-base font-semibold">{selectedWorkspace?.label || selectedWorkspace?.name || 'No workspace selected'}</div>
        <div className="truncate font-mono text-[11px] text-blue-700">{currentUrl}</div>
      </div>

      {mainSection === 'workspaces' && (
        <div className="space-y-3">
          <div className="grid gap-2">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                onClick={() => void selectWorkspace(workspace)}
                className={`flex items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left transition-colors ${
                  selectedWorkspace?.id === workspace.id ? 'border-blue-300 bg-blue-50' : 'hover:bg-accent/40'
                }`}
              >
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: workspace.color || '#2563eb' }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{workspace.label || workspace.name}</span>
                  {workspace.description && <span className="block truncate text-xs text-muted-foreground">{workspace.description}</span>}
                </span>
              </button>
            ))}
          </div>

          {selectedWorkspace && (
            <div className="rounded-xl border p-3">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setContextMode('bound')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${contextMode === 'bound' ? 'bg-accent text-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  Bind to context
                </button>
                <button
                  type="button"
                  onClick={() => setContextMode('explorer')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${contextMode === 'explorer' ? 'bg-accent text-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  Explorer mode
                </button>
              </div>

              {contextMode === 'bound' ? (
                <div className="space-y-2">
                  {workspaceContexts.map((context) => (
                    <button
                      key={context.id}
                      type="button"
                      onClick={() => void selectContext(context)}
                      className={`flex w-full items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left transition-colors ${
                        selectedContext?.id === context.id ? 'border-blue-300 bg-blue-50' : 'hover:bg-accent/40'
                      }`}
                    >
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: context.color || workspaceColor }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{context.name || context.id}</span>
                        <span className="block truncate font-mono text-[11px] text-blue-700">{context.url || toWorkspaceRoot(selectedWorkspace.name)}</span>
                      </span>
                    </button>
                  ))}
                  {!workspaceContexts.length && (
                    <div className="rounded-lg bg-muted/60 px-2.5 py-2.5 text-xs text-muted-foreground">No contexts found for this workspace.</div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => void selectExplorer()}
                  className="flex w-full items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left transition-colors hover:bg-accent/40"
                >
                  <FolderTree className="h-4 w-4 shrink-0 text-blue-700" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">Browse workspace tree</span>
                    <span className="block truncate font-mono text-[11px] text-blue-700">{toWorkspaceRoot(selectedWorkspace.name)}</span>
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {mainSection !== 'workspaces' && (
        <div className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
          <div className="mb-1.5 font-medium text-foreground">
            {MENU_ITEMS.find((item) => item.id === mainSection)?.label || 'Settings'}
          </div>
          <div>Placeholder for the cleaned-up canvas/settings surface. Not building three more apps in this pass.</div>
        </div>
      )}
    </main>
  );

  if (session === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center rounded-2xl border border-black/5 bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (session === 'guest') {
    // Auth is handled by the launcher window — menu stays blank
    return null;
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden rounded-2xl border border-black/5 bg-white/95 shadow-elevation-4 backdrop-blur">
      <div className="flex h-[84px] shrink-0 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/5">
          <div className="h-5 w-5 rounded-sm" style={{ backgroundColor: workspaceColor }} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            {selectedWorkspace && <span className="text-muted-foreground">Workspace: {selectedWorkspace.name}</span>}
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">
              {contextMode === 'bound' ? 'Bound' : 'Explorer'}
            </span>
          </div>
          <div className="truncate text-lg font-semibold text-blue-700">{currentUrl}</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            isExpanded ? 'translate-x-0 opacity-100' : '-translate-x-6 opacity-0 pointer-events-none'
          }`}
        >
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading Canvas UI...</div>
          ) : error ? (
            <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : (
            <div className="flex h-full min-h-0">
              {/* M0 */}
              <nav className="flex w-[var(--m0-width)] shrink-0 flex-col items-center border-r border-sidebar-border bg-sidebar py-2">
                <div className="mb-2 flex h-12 w-full shrink-0 items-center justify-center">
                  <div className="h-8 w-8 rounded-lg bg-black/5 p-1.5" title="Canvas">
                    <div className="h-full w-full rounded-sm" style={{ backgroundColor: workspaceColor }} />
                  </div>
                </div>

                <div className="flex flex-1 flex-col items-center gap-1">
                  {RAIL_PRIMARY.map(({ id, label, icon: Icon }) => (
                    <RailIconButton
                      key={id}
                      title={label}
                      active={mainSection === id && shellStage === 'mainMenu'}
                      onClick={() => {
                        setMainSection(id);
                        void openMainMenu();
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </RailIconButton>
                  ))}

                  <div className="my-2 h-px w-6 bg-sidebar-border" />

                  <RailIconButton title="Tree" active={m2Open} onClick={openTree}>
                    <TreePine className="h-5 w-5" />
                  </RailIconButton>
                  <RailIconButton title="Main menu" active={shellStage === 'mainMenu'} onClick={openMainMenu}>
                    <Boxes className="h-5 w-5" />
                  </RailIconButton>
                </div>

                <div className="mt-auto flex flex-col items-center gap-1 border-t border-sidebar-border pt-2">
                  <RailIconButton
                    title="Settings"
                    active={mainSection === 'settings' && shellStage === 'mainMenu'}
                    onClick={() => {
                      setMainSection('settings');
                      void openMainMenu();
                    }}
                  >
                    <Settings className="h-5 w-5" />
                  </RailIconButton>
                  <RailIconButton title="Collapse menu" active={false} onClick={() => window.canvas?.setMenuShellStage?.('collapsed')}>
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </RailIconButton>
                  <button
                    type="button"
                    title="Quit"
                    onClick={() => window.canvas?.quitApp?.()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Power className="h-5 w-5" />
                  </button>
                </div>
              </nav>

              {/* M1 + M2 */}
              <div className="relative min-h-0 w-[var(--m1-width)] shrink-0 border-r border-sidebar-border bg-sidebar">
                <div className="absolute inset-0 flex min-h-0 min-w-0 flex-col overflow-hidden">{m1Content}</div>

                <div
                  className={`absolute inset-0 z-10 flex min-h-0 flex-col bg-sidebar transition-transform duration-200 ease-out ${
                    m2Open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
                  }`}
                >
                  {selectedWorkspace ? (
                    <MenuTreeView
                      workspace={selectedWorkspace}
                      context={selectedContext}
                      mode={contextMode}
                      tree={tree}
                      loading={treeLoading}
                      error={treeError}
                      onBack={closeM2}
                      onPathSelect={handlePathSelect}
                      onRefresh={() => void refreshTree()}
                      onConfirmSelection={handleConfirmSelection}
                      showHeader
                    />
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col border-b border-sidebar-border p-3">
                      <button
                        type="button"
                        title="Back"
                        className="mb-2 self-start rounded-md p-1 hover:bg-sidebar-accent"
                        onClick={closeM2}
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m15 18-6-6 6-6" />
                        </svg>
                      </button>
                      <div className="text-sm text-muted-foreground">Select a workspace first.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('menu-root')!).render(
  <StrictMode>
    <Menu />
  </StrictMode>,
);
