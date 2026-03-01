import { StrictMode, useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';

import type { Workspace, Context, TreeNode, MenuView, ContextMode } from './types';
import { fetchWorkspaces, fetchContexts, fetchContextTree, fetchWorkspaceTree, setContextUrl } from './api';
import { WorkspacesView } from './WorkspacesView';
import { ContextsView } from './ContextsView';
import { MenuTreeView } from './MenuTreeView';

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

  // ── Load workspaces on mount + when window becomes visible

  const loadWorkspaces = useCallback(() => {
    setWsLoading(true);
    setWsError(null);
    fetchWorkspaces()
      .then(setWorkspaces)
      .catch((err) => setWsError(err.message))
      .finally(() => setWsLoading(false));
  }, []);

  useEffect(loadWorkspaces, [loadWorkspaces]);
  useVisibility(loadWorkspaces);

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

  // ── Refresh tree after mutations ────────────────────────

  const refreshTree = useCallback(() => {
    if (contextMode === 'bound' && selectedContext) {
      setTreeLoading(true);
      fetchContextTree(selectedContext.id)
        .then(setTree)
        .catch((err) => setTreeError(err.message))
        .finally(() => setTreeLoading(false));
    } else if (selectedWorkspace) {
      setTreeLoading(true);
      fetchWorkspaceTree(selectedWorkspace.name)
        .then(setTree)
        .catch((err) => setTreeError(err.message))
        .finally(() => setTreeLoading(false));
    }
  }, [contextMode, selectedContext, selectedWorkspace]);

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

  // TODO: create workspace/context forms (expand panel to 960px)
  const handleCreateWorkspace = useCallback(() => {
    console.log('Create workspace - TBD');
  }, []);

  const handleCreateContext = useCallback(() => {
    console.log('Create context - TBD');
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden rounded-lg bg-background shadow-elevation-4">
      {/* Sliding container: 3 panels side by side */}
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
