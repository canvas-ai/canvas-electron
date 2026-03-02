import { StrictMode, useState, useEffect, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';

import type { Workspace, Context, TreeNode, MenuView, ContextMode } from './types';
import { fetchWorkspaces, fetchContexts, fetchContext, fetchContextTree, fetchWorkspaceTree, setContextUrl } from './api';
import { WorkspacesView } from './WorkspacesView';
import { ContextsView } from './ContextsView';
import { MenuTreeView } from './MenuTreeView';

// ── Helpers ───────────────────────────────────────────────

function useVisibility(callback: () => void) {
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') callback();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [callback]);
}

// ── Slide offsets ────────────────────────────────────────

const SLIDE: Record<MenuView, string> = {
  workspaces: 'translateX(0%)',
  contexts: 'translateX(-33.333%)',
  tree: 'translateX(-66.666%)',
};

// ── Menu app ─────────────────────────────────────────────

function Menu() {
  const [view, setView] = useState<MenuView>('workspaces');
  const [authVersion, setAuthVersion] = useState(0);

  // Data
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [contexts, setContexts] = useState<Context[]>([]);
  const [tree, setTree] = useState<TreeNode | null>(null);

  // Selection
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [selectedContext, setSelectedContext] = useState<Context | null>(null);
  const [contextMode, setContextMode] = useState<ContextMode>('bound');

  // Loading / error per view
  const [wsLoading, setWsLoading] = useState(true);
  const [wsError, setWsError] = useState<string | null>(null);
  const [ctxLoading, setCtxLoading] = useState(false);
  const [ctxError, setCtxError] = useState<string | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);

  // Refs for event handlers (avoids stale closures)
  const restoredRef = useRef(false);
  const selectedContextRef = useRef(selectedContext);
  const selectedWorkspaceRef = useRef(selectedWorkspace);
  const contextModeRef = useRef(contextMode);

  selectedContextRef.current = selectedContext;
  selectedWorkspaceRef.current = selectedWorkspace;
  contextModeRef.current = contextMode;

  // ── Auth change listener ──────────────────────────────

  useEffect(() => {
    return window.canvas?.onAuthChanged?.(() => setAuthVersion((v) => v + 1));
  }, []);

  // ── Persist state on every navigation change ──────────

  useEffect(() => {
    if (!restoredRef.current) return;
    window.canvas?.setMenuState({
      view,
      workspaceId: selectedWorkspace?.id,
      workspaceName: selectedWorkspace?.name,
      contextId: selectedContext?.id,
      contextMode,
    });
  }, [view, selectedWorkspace, selectedContext, contextMode]);

  // ── Data fetchers ─────────────────────────────────────

  const refreshTree = useCallback(() => {
    const ctx = selectedContextRef.current;
    const ws = selectedWorkspaceRef.current;
    const mode = contextModeRef.current;

    if (mode === 'bound' && ctx) {
      setTreeLoading(true);
      fetchContextTree(ctx.id)
        .then(setTree)
        .catch((err) => setTreeError(err.message))
        .finally(() => setTreeLoading(false));
    } else if (ws) {
      setTreeLoading(true);
      fetchWorkspaceTree(ws.name)
        .then(setTree)
        .catch((err) => setTreeError(err.message))
        .finally(() => setTreeLoading(false));
    }
  }, []);

  const refreshContextAndTree = useCallback(async () => {
    const ctx = selectedContextRef.current;
    if (!ctx) return;

    try {
      const updated = await fetchContext(ctx.id);
      setSelectedContext(updated);
    } catch {
      // context may have been deleted
    }
    refreshTree();
  }, [refreshTree]);

  // ── WS subscriptions via IPC (main process socket) ────

  useEffect(() => {
    const channels: string[] = [];
    if (contextMode === 'bound' && selectedContext) {
      channels.push(`context:${selectedContext.id}`);
    }
    if (selectedWorkspace) {
      channels.push(`workspace:${selectedWorkspace.name}`);
    }
    if (!channels.length) return;

    channels.forEach((ch) => window.canvas?.wsSubscribe(ch));

    return () => {
      channels.forEach((ch) => window.canvas?.wsUnsubscribe(ch));
    };
  }, [contextMode, selectedContext, selectedWorkspace]);

  // ── Listen for WS events from main process ────────────

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = window.canvas?.onWsEvent(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(refreshContextAndTree, 200);
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      cleanup?.();
    };
  }, [refreshContextAndTree]);

  // ── Load workspaces on mount + auth change + visibility

  const loadWorkspaces = useCallback(() => {
    setWsLoading(true);
    setWsError(null);
    fetchWorkspaces()
      .then(setWorkspaces)
      .catch((err) => setWsError(err.message))
      .finally(() => setWsLoading(false));
  }, []);

  useEffect(loadWorkspaces, [loadWorkspaces, authVersion]);
  useVisibility(loadWorkspaces);

  // ── Restore persisted state once workspaces are loaded ─

  useEffect(() => {
    if (restoredRef.current || !workspaces.length) return;
    restoredRef.current = true;

    (async () => {
      const saved = await window.canvas?.getMenuState();
      if (!saved?.view || saved.view === 'workspaces') return;

      const ws = workspaces.find((w) => w.id === saved.workspaceId || w.name === saved.workspaceName);
      if (!ws) return;

      setSelectedWorkspace(ws);

      if (saved.view === 'contexts' || saved.view === 'tree') {
        setCtxLoading(true);
        try {
          const ctxList = await fetchContexts();
          setContexts(ctxList);

          if (saved.view === 'tree' && saved.contextId) {
            const ctx = ctxList.find((c) => c.id === saved.contextId);
            if (ctx) {
              setSelectedContext(ctx);
              setContextMode(saved.contextMode === 'explorer' ? 'explorer' : 'bound');
              setView('tree');

              setTreeLoading(true);
              try {
                const t = saved.contextMode === 'explorer'
                  ? await fetchWorkspaceTree(ws.name)
                  : await fetchContextTree(ctx.id);
                setTree(t);
              } catch (err: any) {
                setTreeError(err.message);
              } finally {
                setTreeLoading(false);
              }
            } else {
              setView('contexts');
            }
          } else {
            setView('contexts');
          }
        } catch (err: any) {
          setCtxError(err.message);
        } finally {
          setCtxLoading(false);
        }
      }
    })();
  }, [workspaces]);

  // ── Workspace selected → load contexts ─────────────────

  const handleWorkspaceSelect = useCallback((ws: Workspace) => {
    setSelectedWorkspace(ws);
    setSelectedContext(null);
    setTree(null);
    setView('contexts');

    let active = true;
    setCtxLoading(true);
    setCtxError(null);
    fetchContexts()
      .then((list) => { if (active) setContexts(list); })
      .catch((err) => { if (active) setCtxError(err.message); })
      .finally(() => { if (active) setCtxLoading(false); });

    return () => { active = false; };
  }, []);

  // ── Context selected → load context tree ───────────────

  const handleContextSelect = useCallback((ctx: Context) => {
    setSelectedContext(ctx);
    setContextMode('bound');
    setTree(null);
    setView('tree');

    let active = true;
    setTreeLoading(true);
    setTreeError(null);
    fetchContextTree(ctx.id)
      .then((t) => { if (active) setTree(t); })
      .catch((err) => { if (active) setTreeError(err.message); })
      .finally(() => { if (active) setTreeLoading(false); });

    return () => { active = false; };
  }, []);

  // ── Explorer mode → load workspace tree ────────────────

  const handleExplore = useCallback(() => {
    if (!selectedWorkspace) return;
    setSelectedContext(null);
    setContextMode('explorer');
    setTree(null);
    setView('tree');

    let active = true;
    setTreeLoading(true);
    setTreeError(null);
    fetchWorkspaceTree(selectedWorkspace.name)
      .then((t) => { if (active) setTree(t); })
      .catch((err) => { if (active) setTreeError(err.message); })
      .finally(() => { if (active) setTreeLoading(false); });

    return () => { active = false; };
  }, [selectedWorkspace]);

  // ── Tree path selected (bound mode → update context url)

  const handlePathSelect = useCallback(async (url: string) => {
    if (!selectedContext) return;
    try {
      await setContextUrl(selectedContext.id, url);
      setSelectedContext({ ...selectedContext, url });
      await window.canvas?.setContextSelection?.({
        selectedId: selectedContext.id,
        selectedUrl: url,
      });
    } catch (err) {
      console.error('Failed to set context URL:', err);
    }
  }, [selectedContext]);

  // ── Navigation ─────────────────────────────────────────

  const goBack = useCallback(() => {
    if (view === 'tree') setView('contexts');
    else if (view === 'contexts') setView('workspaces');
  }, [view]);

  const handleCreateWorkspace = useCallback(() => {
    console.log('Create workspace - TBD');
  }, []);

  const handleCreateContext = useCallback(() => {
    console.log('Create context - TBD');
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden rounded-lg bg-background shadow-elevation-4">
      <div
        className="flex h-full w-[300%] transition-transform duration-300"
        style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)', transform: SLIDE[view] }}
      >
        {/* Panel 1: Workspaces */}
        <div className="h-full w-1/3">
          <WorkspacesView
            workspaces={workspaces}
            loading={wsLoading}
            error={wsError}
            onSelect={handleWorkspaceSelect}
            onCreateClick={handleCreateWorkspace}
          />
        </div>

        {/* Panel 2: Contexts */}
        <div className="h-full w-1/3">
          {selectedWorkspace && (
            <ContextsView
              workspace={selectedWorkspace}
              contexts={contexts}
              mode={contextMode}
              loading={ctxLoading}
              error={ctxError}
              onModeChange={setContextMode}
              onContextSelect={handleContextSelect}
              onExplore={handleExplore}
              onBack={goBack}
              onCreateClick={handleCreateContext}
            />
          )}
        </div>

        {/* Panel 3: Tree */}
        <div className="h-full w-1/3">
          {selectedWorkspace && (
            <MenuTreeView
              workspace={selectedWorkspace}
              context={selectedContext}
              mode={contextMode}
              tree={tree}
              loading={treeLoading}
              error={treeError}
              onBack={goBack}
              onPathSelect={handlePathSelect}
              onRefresh={refreshTree}
            />
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
