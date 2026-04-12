import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
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

const SHEET_WIDTH = 420;

const MENU_ITEMS: Array<{ id: MenuSection; label: string; icon: typeof Boxes }> = [
  { id: 'workspaces', label: 'Workspaces', icon: Boxes },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'roles', label: 'Roles', icon: Shield },
  { id: 'remotes', label: 'Remotes', icon: PlugZap },
  { id: 'settings', label: 'Settings', icon: Settings },
];

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

function Menu() {
  const [shellStage, setShellStage] = useState<MenuShellStage>('collapsed');
  const [mainSection, setMainSection] = useState<MenuSection>('workspaces');
  const [authVersion, setAuthVersion] = useState(0);
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
      const [auth, workspaceList, contextList, savedMenu] = await Promise.all([
        window.canvas?.getAuthConfig?.(),
        fetchWorkspaces(),
        fetchContexts(),
        window.canvas?.getMenuState?.(),
      ]);

      setIsConnected(!!auth?.serverUrl && !!auth?.token);
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
  const bodyTranslateX = shellStage === 'mainMenu' ? 0 : -SHEET_WIDTH;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden rounded-2xl border border-black/5 bg-white/95 shadow-elevation-4 backdrop-blur">
      <div className="flex h-[84px] shrink-0 items-center gap-3 border-b px-4">
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

        <div className="flex items-center gap-1">
          {isExpanded && (
            <button
              type="button"
              title="Collapse"
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => window.canvas?.setMenuShellStage?.('collapsed')}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          )}
          <button
            type="button"
            title="Open tree"
            className={`rounded-lg p-2 transition-colors ${
              shellStage === 'tree' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
            onClick={() => window.canvas?.setMenuShellStage?.('tree')}
          >
            <TreePine className="h-5 w-5" />
          </button>
          <button
            type="button"
            title="Open main menu"
            className={`rounded-lg p-2 transition-colors ${
              shellStage === 'mainMenu' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
            onClick={() => window.canvas?.setMenuShellStage?.('mainMenu')}
          >
            <Boxes className="h-5 w-5" />
          </button>
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
            <div className="h-full overflow-hidden">
              <div
                className="flex h-full transition-transform duration-300"
                style={{
                  width: `${SHEET_WIDTH * 2}px`,
                  transform: `translateX(${bodyTranslateX}px)`,
                }}
              >
                <div className="flex min-w-0 overflow-hidden" style={{ width: `${SHEET_WIDTH}px` }}>
                  <aside className="flex w-40 shrink-0 flex-col border-r bg-white/90 p-3">
                    <div className="mb-4 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Canvas</div>
                    <div className="space-y-1">
                      {MENU_ITEMS.slice(0, 4).map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setMainSection(id)}
                          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                            mainSection === id ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-auto space-y-1 border-t pt-3">
                      <button
                        type="button"
                        onClick={() => setMainSection('settings')}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors ${
                          mainSection === 'settings' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                        }`}
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => window.canvas?.quitApp?.()}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-700"
                      >
                        <Power className="h-4 w-4" />
                        <span>Quit</span>
                      </button>
                    </div>
                  </aside>

                  <main className="min-w-0 flex-1 overflow-auto p-4">
                    <div className="mb-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current</div>
                      <div className="truncate text-lg font-semibold">{selectedWorkspace?.label || selectedWorkspace?.name || 'No workspace selected'}</div>
                      <div className="truncate font-mono text-xs text-blue-700">{currentUrl}</div>
                    </div>

                    {mainSection === 'workspaces' && (
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          {workspaces.map((workspace) => (
                            <button
                              key={workspace.id}
                              type="button"
                              onClick={() => void selectWorkspace(workspace)}
                              className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                                selectedWorkspace?.id === workspace.id ? 'border-blue-300 bg-blue-50' : 'hover:bg-accent/40'
                              }`}
                            >
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: workspace.color || '#2563eb' }} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{workspace.label || workspace.name}</span>
                                {workspace.description && <span className="block truncate text-xs text-muted-foreground">{workspace.description}</span>}
                              </span>
                            </button>
                          ))}
                        </div>

                        {selectedWorkspace && (
                          <div className="rounded-2xl border p-4">
                            <div className="mb-3 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setContextMode('bound')}
                                className={`rounded-full px-3 py-1 text-xs font-medium ${contextMode === 'bound' ? 'bg-accent text-foreground' : 'bg-muted text-muted-foreground'}`}
                              >
                                Bind to context
                              </button>
                              <button
                                type="button"
                                onClick={() => setContextMode('explorer')}
                                className={`rounded-full px-3 py-1 text-xs font-medium ${contextMode === 'explorer' ? 'bg-accent text-foreground' : 'bg-muted text-muted-foreground'}`}
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
                                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                                      selectedContext?.id === context.id ? 'border-blue-300 bg-blue-50' : 'hover:bg-accent/40'
                                    }`}
                                  >
                                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: context.color || workspaceColor }} />
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate font-medium">{context.name || context.id}</span>
                                      <span className="block truncate font-mono text-xs text-blue-700">{context.url || toWorkspaceRoot(selectedWorkspace.name)}</span>
                                    </span>
                                  </button>
                                ))}
                                {!workspaceContexts.length && (
                                  <div className="rounded-xl bg-muted/60 px-3 py-3 text-sm text-muted-foreground">
                                    No contexts found for this workspace.
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void selectExplorer()}
                                className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors hover:bg-accent/40"
                              >
                                <FolderTree className="h-4 w-4 text-blue-700" />
                                <span className="min-w-0 flex-1">
                                  <span className="block font-medium">Browse workspace tree</span>
                                  <span className="block truncate font-mono text-xs text-blue-700">{toWorkspaceRoot(selectedWorkspace.name)}</span>
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {mainSection !== 'workspaces' && (
                      <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                        <div className="mb-2 font-medium text-foreground">
                          {MENU_ITEMS.find((item) => item.id === mainSection)?.label || 'Settings'}
                        </div>
                        <div>Placeholder for the cleaned-up canvas/settings surface. Not building three more apps in this pass.</div>
                      </div>
                    )}
                  </main>
                </div>

                <div className="min-w-0 overflow-hidden" style={{ width: `${SHEET_WIDTH}px` }}>
                  {selectedWorkspace ? (
                    <MenuTreeView
                      workspace={selectedWorkspace}
                      context={selectedContext}
                      mode={contextMode}
                      tree={tree}
                      loading={treeLoading}
                      error={treeError}
                      onBack={() => window.canvas?.setMenuShellStage?.('collapsed')}
                      onPathSelect={handlePathSelect}
                      onRefresh={() => void refreshTree()}
                      showHeader={false}
                    />
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">Select a workspace first.</div>
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
