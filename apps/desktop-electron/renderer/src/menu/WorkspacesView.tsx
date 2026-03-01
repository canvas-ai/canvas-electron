import type { Workspace } from './types';

function isLight(hex: string) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6;
}

const InfinityIcon = ({ color }: { color: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isLight(color) ? '#000' : '#fff'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z" />
  </svg>
);

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
      isActive ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
    }`}>
      {status}
    </span>
  );
}

type Props = {
  workspaces: Workspace[];
  loading: boolean;
  error: string | null;
  onSelect: (ws: Workspace) => void;
  onCreateClick: () => void;
};

export function WorkspacesView({ workspaces, loading, error, onSelect, onCreateClick }: Props) {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Workspaces</div>
        <button
          onClick={onCreateClick}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          title="Create workspace"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {loading && (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading workspaces...</div>
        )}

        {error && (
          <div className="mx-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && workspaces.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">No workspaces found.</div>
        )}

        <div className="space-y-1">
          {workspaces.map((ws) => {
            const isUniverse = ws.type === 'universe';
            return (
              <button
                key={ws.id}
                onClick={() => onSelect(ws)}
                className="group flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent"
              >
                {/* Color indicator / icon */}
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: ws.color || '#888' }}>
                  {isUniverse ? (
                    <InfinityIcon color={ws.color || '#888'} />
                  ) : (
                    <span className={`text-xs font-bold ${isLight(ws.color || '#888') ? 'text-black' : 'text-white'}`}>
                      {(ws.label || ws.name)?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{ws.label || ws.name}</span>
                    <StatusBadge status={ws.status} />
                  </div>
                  {ws.description && (
                    <div className="truncate text-xs text-muted-foreground">{ws.description}</div>
                  )}
                  {ws.isActive && (
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>{ws.documentCount.toLocaleString()} docs</span>
                      <span>{ws.bitmapCount.toLocaleString()} bitmaps</span>
                    </div>
                  )}
                </div>

                {/* Chevron */}
                <svg className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
