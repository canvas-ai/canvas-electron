import type { Context, ContextMode, Workspace } from './types';

type Props = {
  workspace: Workspace;
  contexts: Context[];
  mode: ContextMode;
  loading: boolean;
  error: string | null;
  onModeChange: (mode: ContextMode) => void;
  onContextSelect: (ctx: Context) => void;
  onExplore: () => void;
  onBack: () => void;
  onCreateClick: () => void;
};

export function ContextsView({
  workspace,
  contexts,
  mode,
  loading,
  error,
  onModeChange,
  onContextSelect,
  onExplore,
  onBack,
  onCreateClick,
}: Props) {
  const workspaceContexts = contexts.filter((ctx) => {
    const url = ctx.url || '';
    return url.startsWith(`${workspace.name}://`) || !url.includes('://');
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="rounded-md p-1 hover:bg-accent" title="Back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: workspace.color || '#888' }}
          />
          <span className="truncate text-sm font-semibold">{workspace.label || workspace.name}</span>

          <button
            onClick={onCreateClick}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            title="Create context"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {/* Mode tabs */}
        <div className="mt-3 flex rounded-md border border-border bg-muted p-0.5">
          <button
            onClick={() => onModeChange('bound')}
            className={`flex-1 rounded-sm px-3 py-1 text-xs font-medium transition-colors ${
              mode === 'bound' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Contexts
          </button>
          <button
            onClick={() => onModeChange('explorer')}
            className={`flex-1 rounded-sm px-3 py-1 text-xs font-medium transition-colors ${
              mode === 'explorer' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Explorer
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading && (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
        )}

        {error && (
          <div className="mx-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {mode === 'explorer' ? (
          <button
            onClick={onExplore}
            className="group flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors hover:bg-accent"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Browse workspace tree</div>
              <div className="text-xs text-muted-foreground">Navigate without binding to a context</div>
            </div>
            <svg className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        ) : (
          <>
            {!loading && workspaceContexts.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">No contexts in this workspace.</div>
            )}

            <div className="space-y-1">
              {workspaceContexts.map((ctx) => (
                <button
                  key={ctx.id}
                  onClick={() => onContextSelect(ctx)}
                  className="group flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent"
                >
                  <div
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: ctx.color || workspace.color || '#888' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{ctx.name || ctx.id}</div>
                    {ctx.url && (
                      <div className="truncate font-mono text-xs text-muted-foreground">{ctx.url}</div>
                    )}
                  </div>
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
