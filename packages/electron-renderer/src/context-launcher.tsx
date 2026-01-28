import { StrictMode, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { io, type Socket } from 'socket.io-client';
import { AuthPanel, type AuthFormData } from '../../ui/src/components/auth/AuthPanel';
import { ParticlePanel } from '../../ui/src/components/auth/ParticlePanel';
import { Button } from '../../ui/src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../ui/src/components/ui/dropdown-menu';
import { Input } from '../../ui/src/components/ui/input';
import './index.css';

type AuthConfig = {
  serverUrl: string;
  token: string;
  email?: string;
};

type ContextItem = {
  id?: string;
  url?: string;
  pathArray?: string[];
  label?: string;
  name?: string;
  color?: string;
};

type ContextTreeNode = {
  id?: string;
  name?: string;
  label?: string;
  color?: string | null;
  type?: string;
  children?: ContextTreeNode[];
};

type DocumentItem = {
  id?: string;
  title?: string;
  name?: string;
  label?: string;
  summary?: string;
  description?: string;
  schema?: string;
  schemaVersion?: string;
  data?: any;
  metadata?: any;
  indexOptions?: any;
  checksumArray?: string[];
  embeddingsArray?: any[];
  parentId?: string | null;
  versions?: any[];
  versionNumber?: number;
  latestVersion?: number;
  createdAt?: string;
  updatedAt?: string;
};

type TreeRow = {
  id: string;
  label: string;
  path: string;
  depth: number;
  url: string;
  hasChildren: boolean;
  isExpanded: boolean;
  color?: string | null;
};

function normalizeServerUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/g, '');
  if (trimmed.endsWith('/rest/v2')) return trimmed.slice(0, -'/rest/v2'.length);
  return trimmed;
}

function toApiUrl(serverUrl: string): string {
  return `${normalizeServerUrl(serverUrl)}/rest/v2`;
}

function getContextKey(context: ContextItem): string {
  return context.id || context.url || context.name || context.label || '';
}

function buildContextUrlFromPath(baseUrl: string | undefined, pathParts: string[]) {
  if (!pathParts.length) return baseUrl || '';
  const match = baseUrl?.match(/^([^:]+):\/\/(.*)$/);
  if (!match) return pathParts.join('/');
  const scheme = match[1];
  return `${scheme}://${pathParts.join('/')}`;
}

function getWorkspaceNameFromContextUrl(contextUrl: string): string {
  const trimmed = contextUrl.trim();
  const match = trimmed.match(/^([^:]+):\/\/(.*)$/);
  return match?.[1] || '';
}

function toWorkspaceContextSpec(value: string): string {
  const trimmed = value.trim().replace(/\/+$/g, '');
  if (!trimmed) return '/';

  const match = trimmed.match(/^([^:]+):\/\/(.*)$/);
  const rawPath = match ? match[2] : trimmed;
  const path = rawPath.replace(/^\/+/, '').trim();
  return path ? `/${path}` : '/';
}

function toWorkspaceBaseUrl(workspaceName: string): string {
  return workspaceName ? `${workspaceName}://` : '';
}

function getParentContextSpecFromUrl(contextUrl: string): string {
  const spec = toWorkspaceContextSpec(contextUrl);
  const parts = spec.split('/').filter(Boolean);
  const parentParts = parts.slice(0, Math.max(0, parts.length - 1));
  return parentParts.length ? `/${parentParts.join('/')}` : '/';
}

function getRgb(color?: string) {
  if (!color) return null;
  const raw = color.trim().replace('#', '');
  const hex =
    raw.length === 3
      ? raw.split('').map((char) => `${char}${char}`).join('')
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const value = Number.parseInt(hex, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function isLightColor(color?: string) {
  const rgb = getRgb(color);
  if (!rgb) return false;
  const luma = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luma > 0.72;
}

function parseListPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const typed = payload as { payload?: unknown; documents?: unknown };
    if (Array.isArray(typed.payload)) return typed.payload;
    if (Array.isArray(typed.documents)) return typed.documents;
  }
  return [];
}

function getDocumentLabel(doc: DocumentItem): string {
  return doc.title || doc.name || doc.label || doc.id || 'Document';
}

function getDisplayTitle(doc: DocumentItem): string {
  if (doc.data?.title) return doc.data.title;
  if (doc.data?.name) return doc.data.name;
  if (doc.data?.filename) return doc.data.filename;
  const isTabDocument = doc.schema === 'data/abstraction/tab';
  if (isTabDocument && doc.data?.url) {
    try {
      const url = new URL(doc.data.url);
      return url.hostname + url.pathname;
    } catch {
      return doc.data.url;
    }
  }
  // Fallback to old logic
  return doc.title || doc.name || doc.label || doc.id || 'Document';
}

function getDisplayContent(doc: DocumentItem): string {
  if (doc.data?.content) {
    const content = String(doc.data.content);
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
  }
  if (doc.data?.description) return doc.data.description;
  if (doc.data?.summary) return doc.data.summary;
  if (doc.summary) return doc.summary;
  if (doc.description) return doc.description;
  const isTabDocument = doc.schema === 'data/abstraction/tab';
  // For tab documents we render URL separately (single-line truncate)
  if (isTabDocument && doc.data?.url) return '';
  return '';
}

function DocumentDetailModal({
  document,
  isOpen,
  onClose,
}: {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [showRawJson, setShowRawJson] = useState(false);
  if (!isOpen || !document) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border bg-background">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-bold">Document Details</h2>
              {document.id && <p className="text-muted-foreground">ID: {document.id}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowRawJson((v) => !v)}
                variant="outline"
                size="sm"
                title="Toggle raw JSON view"
              >
                {showRawJson ? 'View Data' : 'View Raw JSON'}
              </Button>
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="p-2"
                title="Close"
              >
                <span className="text-base leading-none">×</span>
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="mb-3 font-semibold">Basic Information</h3>
              <div className="grid gap-3 text-sm">
                {document.schema && (
                  <div>
                    <span className="font-medium">Schema:</span>
                    <span className="ml-2 font-mono">{document.schema}</span>
                  </div>
                )}
                {document.schemaVersion && (
                  <div>
                    <span className="font-medium">Schema Version:</span>
                    <span className="ml-2">{document.schemaVersion}</span>
                  </div>
                )}
                {typeof document.versionNumber === 'number' && typeof document.latestVersion === 'number' && (
                  <div>
                    <span className="font-medium">Version:</span>
                    <span className="ml-2">
                      {document.versionNumber} / {document.latestVersion}
                    </span>
                  </div>
                )}
                {(document.createdAt || document.updatedAt) && (
                  <>
                    {document.createdAt && (
                      <div>
                        <span className="font-medium">Created:</span>
                        <span className="ml-2">{formatDate(document.createdAt)}</span>
                      </div>
                    )}
                    {document.updatedAt && (
                      <div>
                        <span className="font-medium">Updated:</span>
                        <span className="ml-2">{formatDate(document.updatedAt)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-3 font-semibold">{showRawJson ? 'Raw Document JSON' : 'Document Data'}</h3>
              <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
                {JSON.stringify(showRawJson ? document : document.data, null, 2)}
              </pre>
            </div>

            {Array.isArray(document.checksumArray) && document.checksumArray.length > 0 && (
              <div>
                <h3 className="mb-3 font-semibold">Checksums</h3>
                <div className="space-y-2">
                  {document.checksumArray.map((checksum, index) => {
                    const [algo, hash] = String(checksum).split('/');
                    return (
                      <div key={`${algo}-${hash}-${index}`} className="flex items-center gap-2 text-sm font-mono">
                        <span className="font-medium">{algo}:</span>
                        <span className="text-muted-foreground">{hash}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end border-t pt-4">
            <Button onClick={onClose} className="px-4 py-2">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildTreeRows(
  node: ContextTreeNode,
  baseUrl: string | undefined,
  query: string,
  expandedMap: Record<string, boolean>,
  parentParts: string[] = [],
  depth = 0,
): { rows: TreeRow[]; hasMatch: boolean } {
  const nodeName = node.name?.trim() || node.label?.trim() || '';
  const label = node.label?.trim() || nodeName || '/';
  const isRoot = nodeName === '/' || nodeName === '';
  const parts = isRoot ? parentParts : [...parentParts, nodeName];
  const path = parts.length ? parts.join('/') : '/';
  const id = node.id || path || label;
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isExpanded = expandedMap[id] ?? true;
  const needle = query.toLowerCase().trim();

  // Match only the node name (not full path) for cleaner results
  const nodeMatches = !needle || label.toLowerCase().includes(needle);

  const childRows: TreeRow[] = [];
  let childMatches = false;
  if (hasChildren) {
    for (const child of node.children || []) {
      const result = buildTreeRows(
        child,
        baseUrl,
        query,
        expandedMap,
        parts,
        depth + 1,
      );
      if (result.hasMatch) childMatches = true;
      if (result.rows.length) childRows.push(...result.rows);
    }
  }

  const rows: TreeRow[] = [];

  // If we're filtering (have a query)
  if (needle) {
    // Include this node only if it matches
    if (nodeMatches) {
      rows.push({
        id,
        label,
        path,
        depth,
        url: buildContextUrlFromPath(baseUrl, parts),
        hasChildren,
        isExpanded: true, // Always expand when filtering
        color: node.color,
      });
      // Show children of matching nodes for context
      if (hasChildren) {
        rows.push(...childRows);
      }
    } else {
      // Node doesn't match, but pass through any matching children
      rows.push(...childRows);
    }
  } else {
    // No filter - show normal tree with expand/collapse
    rows.push({
      id,
      label,
      path,
      depth,
      url: buildContextUrlFromPath(baseUrl, parts),
      hasChildren,
      isExpanded,
      color: node.color,
    });
    if (hasChildren && isExpanded) {
      rows.push(...childRows);
    }
  }

  return { rows, hasMatch: nodeMatches || childMatches };
}

function ContextLauncherApp() {
  const [auth, setAuth] = useState<AuthConfig | null>(null);
  const [contexts, setContexts] = useState<ContextItem[]>([]);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [selectedContextUrl, setSelectedContextUrl] = useState<string>('');
  const [pendingUrl, setPendingUrl] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerHoverKey, setDrawerHoverKey] = useState<string | null>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<DocumentItem[]>([]);
  const [documentsReloadToken, setDocumentsReloadToken] = useState(0);
  const [launcherMode, setLauncherMode] = useState<'browse' | 'create-note' | 'create-tab' | 'link'>('browse');
  const [noteDraft, setNoteDraft] = useState({ title: '', content: '' });
  const [tabDraft, setTabDraft] = useState({ title: '', url: '' });
  const [rightContextUrl, setRightContextUrl] = useState(''); // accepts workspace://path or /path
  const [rightNavMode, setRightNavMode] = useState<'list' | 'tree'>('list');
  const [rightSearchValue, setRightSearchValue] = useState('');
  const [rightBusy, setRightBusy] = useState(false);
  const [rightError, setRightError] = useState<string | null>(null);
  const [rightDocuments, setRightDocuments] = useState<DocumentItem[]>([]);
  const [rightDocumentsReloadToken, setRightDocumentsReloadToken] = useState(0);
  const [rightSelectedIds, setRightSelectedIds] = useState<Record<string, boolean>>({});
  const [rightTreeRoot, setRightTreeRoot] = useState<ContextTreeNode | null>(null);
  const [rightTreeCursor, setRightTreeCursor] = useState(0);
  const [rightExpandedNodes, setRightExpandedNodes] = useState<Record<string, boolean>>({});
  const [treeBusy, setTreeBusy] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [treeRoot, setTreeRoot] = useState<ContextTreeNode | null>(null);
  const [treeCursor, setTreeCursor] = useState(0);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [inputBlink, setInputBlink] = useState<'success' | 'error' | null>(null);
  const [detailDocument, setDetailDocument] = useState<DocumentItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const pendingContextRefresh = useRef<number | null>(null);
  const pendingDocumentsRefresh = useRef<number | null>(null);

  const isAuthenticated = !!auth?.token && !!auth?.serverUrl;

  const focusInput = useCallback(() => {
    // Focusing immediately after show is flaky; schedule it.
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select?.();
    }, 0);
  }, []);

  const focusDrawerSelection = useCallback(() => {
    window.setTimeout(() => {
      const root = drawerRef.current;
      if (!root) return;
      const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-context-key]'));
      const targetId = selectedContextId ?? '';
      (buttons.find((b) => b.dataset.contextKey === targetId) || buttons[0])?.focus();
    }, 0);
  }, [selectedContextId]);

  useEffect(() => {
    if (!drawerOpen) return;
    focusDrawerSelection();
  }, [drawerOpen, focusDrawerSelection]);

  useEffect(() => {
    focusInput(); // initial mount

    const off = window.canvas?.onLauncherFocusInput?.(focusInput);
    window.addEventListener('focus', focusInput);
    return () => {
      window.removeEventListener('focus', focusInput);
      off?.();
    };
  }, [focusInput]);

  useEffect(() => {
    const loadAuth = async () => {
      if (!window.canvas?.getAuthConfig) {
        setBootstrapped(true);
        return;
      }
      const stored = await window.canvas.getAuthConfig();
      if (stored?.token && stored?.serverUrl) {
        setAuth(stored);
      }
      const selection = await window.canvas.getContextSelection?.();
      if (selection?.selectedId) {
        setSelectedContextId(selection.selectedId);
      }
      if (selection?.selectedUrl) {
        setSelectedContextUrl(selection.selectedUrl);
        setPendingUrl(selection.selectedUrl);
      }
      setBootstrapped(true);
    };
    loadAuth();
  }, []);

  const authKey = useMemo(() => {
    return `${auth?.serverUrl ?? ''}|${auth?.email ?? ''}`;
  }, [auth?.serverUrl, auth?.email]);

  const testConnection = async (data: AuthFormData) => {
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      const apiUrl = toApiUrl(data.serverUrl);
      const response = await fetch(`${apiUrl}/auth/config`, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Server replied ${response.status}`);
      }
      setStatus('Connection looks good.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed.');
    } finally {
      setBusy(false);
    }
  };

  const login = async (data: AuthFormData) => {
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      const baseUrl = normalizeServerUrl(data.serverUrl);
      const apiUrl = toApiUrl(baseUrl);

      let token = '';
      if (data.mode === 'token') {
        token = data.token?.trim() ?? '';
        if (!token) throw new Error('Token is required.');
        const me = await fetch(`${apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!me.ok) throw new Error('Token rejected.');
      } else {
        if (!data.email || !data.password) throw new Error('Email and password are required.');
        const response = await fetch(`${apiUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email, password: data.password, strategy: 'auto' }),
        });
        const payload = await response.json();
        token = payload?.token || payload?.payload?.token || '';
        if (!response.ok || !token) {
          throw new Error(payload?.message || 'Login failed.');
        }
      }

      const nextAuth: AuthConfig = {
        serverUrl: baseUrl,
        token,
        email: data.email?.trim() || auth?.email,
      };
      await window.canvas?.setAuthConfig?.(nextAuth);
      setAuth(nextAuth);
      setStatus('Authenticated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  const fetchContexts = useCallback(async () => {
    if (!isAuthenticated || !auth) return;
    setBusy(true);
    setError(null);
    try {
      const apiUrl = toApiUrl(auth.serverUrl);
      const response = await fetch(`${apiUrl}/contexts`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const payload = await response.json();
      const list =
        Array.isArray(payload) ? payload :
        Array.isArray(payload?.payload) ? payload.payload :
        Array.isArray(payload?.contexts) ? payload.contexts :
        [];
      setContexts(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contexts.');
    } finally {
      setBusy(false);
    }
  }, [auth, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !auth) return;

    const baseUrl = normalizeServerUrl(auth.serverUrl);
    const token = auth.token;
    const socketInstance = io(baseUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { token },
    });

    setSocket(socketInstance);

    return () => {
      try {
        socketInstance.close();
      } finally {
        setSocket(null);
      }
    };
  }, [auth, isAuthenticated]);

  const scheduleContextsRefresh = useCallback(() => {
    if (pendingContextRefresh.current) window.clearTimeout(pendingContextRefresh.current);
    pendingContextRefresh.current = window.setTimeout(() => {
      pendingContextRefresh.current = null;
      fetchContexts();
    }, 150);
  }, [fetchContexts]);

  const scheduleDocumentsRefresh = useCallback(() => {
    if (pendingDocumentsRefresh.current) window.clearTimeout(pendingDocumentsRefresh.current);
    pendingDocumentsRefresh.current = window.setTimeout(() => {
      pendingDocumentsRefresh.current = null;
      setDocumentsReloadToken((t) => t + 1);
    }, 150);
  }, []);

  useEffect(() => {
    if (!socket) return;
    if (!selectedContextId) return;

    const contextChannel = `context:${selectedContextId}`;
    socket.emit('subscribe', { channel: contextChannel });

    const matchesSelected = (id?: unknown) => String(id ?? '') === String(selectedContextId);

    const maybeSyncUrl = (url: unknown) => {
      if (typeof url !== 'string') return;
      const trimmed = url.trim();
      if (!trimmed) return;
      if (trimmed !== selectedContextUrl) {
        setSelectedContextUrl(trimmed);
        setPendingUrl(trimmed);
      }
    };

    const handleDocumentEvent = (data: any) => {
      const ctxId = data?.contextId ?? data?.id ?? data?.context?.id ?? data?.context?.contextId;
      if (!matchesSelected(ctxId)) return;
      maybeSyncUrl(data?.url ?? data?.context?.url);
      scheduleDocumentsRefresh();
      scheduleContextsRefresh();
    };

    // Sometimes emitted alongside document ops; not canonical, but useful.
    const handleContextUpdated = (data: any) => {
      const ctx = data?.context ?? data;
      if (!matchesSelected(ctx?.id ?? ctx?.contextId)) return;
      maybeSyncUrl(ctx?.url);
      scheduleDocumentsRefresh();
      scheduleContextsRefresh();
    };

    const handleDeleted = (data: any) => {
      if (!matchesSelected(data?.id ?? data?.contextId)) return;
      scheduleContextsRefresh();
      setSelectedContextId(null);
      setSelectedContextUrl('');
      setPendingUrl('');
      setSearchResults([]);
    };

    const eventPairs: Array<[string, (d: any) => void]> = [
      ['context.updated', handleContextUpdated],
      ['context.deleted', handleDeleted],
      ['context.url.set', handleContextUpdated],
      // Canonical document change events (server reality)
      ['document.inserted', handleDocumentEvent],
      ['document.updated', handleDocumentEvent],
      ['document.removed', handleDocumentEvent],
      ['document.removed.batch', handleDocumentEvent],
      ['document.deleted', handleDocumentEvent],
      ['document.deleted.batch', handleDocumentEvent],
    ];

    eventPairs.forEach(([event, handler]) => socket.on(event, handler));

    return () => {
      socket.emit('unsubscribe', { channel: contextChannel });
      eventPairs.forEach(([event, handler]) => socket.off(event, handler));
    };
  }, [scheduleContextsRefresh, scheduleDocumentsRefresh, selectedContextId, selectedContextUrl, socket]);

  useEffect(() => {
    if (!socket) return;
    if (launcherMode !== 'link') return;

    // IMPORTANT: don't reference `selectedContext` here (declared later) to avoid TDZ crashes.
    const contextUrl =
      selectedContextUrl ||
      contexts.find((context) => getContextKey(context) === selectedContextId)?.url ||
      '';
    const workspaceName = getWorkspaceNameFromContextUrl(contextUrl);
    if (!workspaceName) return;

    const workspaceChannel = `workspace:${workspaceName}`;
    socket.emit('subscribe', { channel: workspaceChannel });

    const handleWorkspaceDocumentsChanged = () => {
      // Keep the linking source list fresh.
      setRightDocumentsReloadToken((t) => t + 1);
    };

    const events = [
      'workspace.documents.inserted',
      'workspace.documents.updated',
      'workspace.documents.removed',
      'workspace.documents.deleted',
    ];
    events.forEach((event) => socket.on(event, handleWorkspaceDocumentsChanged));

    return () => {
      socket.emit('unsubscribe', { channel: workspaceChannel });
      events.forEach((event) => socket.off(event, handleWorkspaceDocumentsChanged));
    };
  }, [contexts, launcherMode, selectedContextId, selectedContextUrl, socket]);

  useEffect(() => {
    fetchContexts();
  }, [fetchContexts]);

  useEffect(() => {
    if (!contexts.length) return;
    if (selectedContextId) {
      const byId = contexts.find((context) => getContextKey(context) === selectedContextId);
      if (byId) {
        setSelectedContextUrl((current) => current || byId.url || '');
        setPendingUrl((current) => current || byId.url || '');
        return;
      }
    }
    const fallback = contexts[0];
    const fallbackId = getContextKey(fallback);
    setSelectedContextId(fallbackId);
    const fallbackUrl = fallback.url || '';
    setSelectedContextUrl(fallbackUrl);
    setPendingUrl(fallbackUrl);
  }, [contexts, selectedContextId]);

  useEffect(() => {
    if (!window.canvas?.setContextSelection) return;
    if (!selectedContextId && !selectedContextUrl) return;
    window.canvas.setContextSelection({
      selectedId: selectedContextId ?? undefined,
      selectedUrl: selectedContextUrl || undefined,
    });
  }, [selectedContextId, selectedContextUrl]);

  const selectedContext = useMemo(() => {
    return contexts.find((context) => getContextKey(context) === selectedContextId) ?? null;
  }, [contexts, selectedContextId]);

  const panelIsLight = isLightColor(selectedContext?.color);
  const panelTextClass = panelIsLight ? 'text-black' : 'text-white';
  const panelMutedClass = panelIsLight ? 'text-black/60' : 'text-white/70';

  const drawerContexts = useMemo(() => {
    return contexts;
  }, [contexts]);

  const showTree = searchValue.trim().startsWith('/c');
  const treeQuery = useMemo(() => {
    if (!showTree) return '';
    return searchValue.replace(/^\/c\s*/i, '').trim();
  }, [searchValue, showTree]);
  const treeBaseUrl = selectedContext?.url || contexts[0]?.url;
  const treeRows = useMemo(() => {
    if (!treeRoot) return [];
    return buildTreeRows(treeRoot, treeBaseUrl, treeQuery, expandedNodes).rows;
  }, [treeRoot, treeBaseUrl, treeQuery, expandedNodes]);

  const rightTreeRows = useMemo(() => {
    if (!rightTreeRoot) return [];
    const workspaceName = getWorkspaceNameFromContextUrl(selectedContextUrl || selectedContext?.url || '');
    const base = toWorkspaceBaseUrl(workspaceName);
    return buildTreeRows(rightTreeRoot, base, rightSearchValue, rightExpandedNodes).rows;
  }, [rightTreeRoot, rightExpandedNodes, rightSearchValue, selectedContextUrl, selectedContext?.url]);

  const searchResultsRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await window.canvas?.clearAuthConfig?.();
    await window.canvas?.clearContextSelection?.();
    setAuth(null);
    setContexts([]);
    setSelectedContextId(null);
    setSelectedContextUrl('');
    setPendingUrl('');
    setSearchValue('');
    setSearchActive(false);
    setDrawerOpen(false);
  };

  const handleContextPick = (context: ContextItem) => {
    const id = getContextKey(context);
    setSelectedContextId(id);
    const nextUrl = context.url || '';
    setSelectedContextUrl(nextUrl);
    setPendingUrl(nextUrl);
    setDrawerOpen(false);
    setSearchValue('');
    setSearchActive(false);
    focusInput();
  };

  const handleSetContext = async () => {
    if (!pendingUrl || !auth || !selectedContextId) return;
    setBusy(true);
    setError(null);
    try {
      const apiUrl = toApiUrl(auth.serverUrl);
      const response = await fetch(`${apiUrl}/contexts/${selectedContextId}/url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ url: pendingUrl }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to set context URL.');
      }
      setSelectedContextUrl(pendingUrl);
      setSearchActive(false);
      setSearchValue('');

      // Success blink
      setInputBlink('success');
      setTimeout(() => setInputBlink(null), 500);

      // Refresh contexts list
      const contextsResponse = await fetch(`${apiUrl}/contexts`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const contextsPayload = await contextsResponse.json();
      const list =
        Array.isArray(contextsPayload) ? contextsPayload :
        Array.isArray(contextsPayload?.payload) ? contextsPayload.payload :
        Array.isArray(contextsPayload?.contexts) ? contextsPayload.contexts :
        [];
      setContexts(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set context URL.');
      // Error blink
      setInputBlink('error');
      setTimeout(() => setInputBlink(null), 500);
    } finally {
      setBusy(false);
    }
  };

  const toggleNode = (id: string) => {
    setExpandedNodes((current) => ({ ...current, [id]: !(current[id] ?? true) }));
  };

  const toggleRightNode = (id: string) => {
    setRightExpandedNodes((current) => ({ ...current, [id]: !(current[id] ?? true) }));
  };

  const insertIntoCurrentContext = async (body: unknown): Promise<boolean> => {
    if (!auth || !selectedContextId) return false;
    setBusy(true);
    setError(null);
    try {
      const apiUrl = toApiUrl(auth.serverUrl);
      const response = await fetch(`${apiUrl}/contexts/${selectedContextId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || 'Operation failed.');
      }
      setDocumentsReloadToken((t) => t + 1);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const linkSelectedRightDocuments = useCallback(async () => {
    const ids = Object.keys(rightSelectedIds).filter((id) => rightSelectedIds[id]);
    if (ids.length === 0) return;
    const ok = await insertIntoCurrentContext({ documentIds: ids });
    if (ok) {
      setRightSelectedIds({});
    }
  }, [insertIntoCurrentContext, rightSelectedIds]);

  const linkDraggedDocuments = useCallback(async (ids: unknown) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    const normalized = ids.map((id) => String(id)).filter(Boolean);
    if (normalized.length === 0) return;
    const ok = await insertIntoCurrentContext({ documentIds: normalized });
    if (ok) {
      setRightSelectedIds({});
    }
  }, [insertIntoCurrentContext]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = (event.key || '').toLowerCase();
      const ctrlShift = event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey;
      const ctrlOrMeta = (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey;

      // Ctrl/Cmd+R: refresh contexts when drawer is open, otherwise refresh documents in default view.
      if (ctrlOrMeta && key === 'r') {
        event.preventDefault();
        if (drawerOpen) {
          scheduleContextsRefresh();
          return;
        }
        scheduleDocumentsRefresh();
        return;
      }

      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          setDrawerOpen(true);
          focusDrawerSelection();
          return;
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          setDrawerOpen(false);
          focusInput();
          return;
        }
      }

      if (drawerOpen && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        const tag = (target?.tagName || '').toLowerCase();
        const isTypingTarget = tag === 'input' || tag === 'textarea' || (target as any)?.isContentEditable;

        if (!isTypingTarget) {
          const root = drawerRef.current;
          const buttons = root
            ? Array.from(root.querySelectorAll<HTMLButtonElement>('button[data-context-key]'))
            : [];

          if (buttons.length) {
            const active = document.activeElement as HTMLElement | null;
            const inDrawer = !!(root && active && root.contains(active));
            const focusedIndex = inDrawer ? buttons.findIndex((b) => b === active) : -1;
            const selectedIndex = Math.max(
              0,
              buttons.findIndex((b) => (b.dataset.contextKey || '') === (selectedContextId ?? '')),
            );
            const index = focusedIndex >= 0 ? focusedIndex : selectedIndex;

            const focusAt = (nextIndex: number) => {
              const button = buttons[(nextIndex + buttons.length) % buttons.length];
              button?.focus();
              button?.scrollIntoView({ block: 'nearest' });
            };

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              focusAt(index + 1);
              return;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              focusAt(index - 1);
              return;
            }
            if (event.key === 'Home') {
              event.preventDefault();
              focusAt(0);
              return;
            }
            if (event.key === 'End') {
              event.preventDefault();
              focusAt(buttons.length - 1);
              return;
            }
          }
        }
      }

      if (ctrlShift && (key === 'n' || key === 't' || key === 'l')) {
        event.preventDefault();
        setDrawerOpen(false);
        setCreateMenuOpen(false);
        setRightSelectedIds({});
        setRightSearchValue('');
        setRightError(null);
        setRightNavMode('list');
        setRightTreeRoot(null);
        setRightExpandedNodes({});

        if (key === 'l') {
          setLauncherMode('link');
          return;
        }
        if (key === 'n') {
          setNoteDraft({ title: '', content: '' });
          setLauncherMode('create-note');
        } else {
          setTabDraft({ title: '', url: '' });
          setLauncherMode('create-tab');
        }
        return;
      }

      if (event.key === 'F5' && launcherMode === 'link') {
        event.preventDefault();
        linkSelectedRightDocuments();
        return;
      }

      if (event.key !== 'Escape') return;

      // Priority order: close context drawer, close create submenu, abort modes
      if (drawerOpen) {
        event.preventDefault();
        setDrawerOpen(false);
        return;
      }
      if (createMenuOpen) {
        event.preventDefault();
        setCreateMenuOpen(false);
        return;
      }
      if (launcherMode !== 'browse') {
        event.preventDefault();
        setLauncherMode('browse');
        setRightSelectedIds({});
        setRightSearchValue('');
        setRightError(null);
        setRightNavMode('list');
        setRightTreeRoot(null);
        setRightExpandedNodes({});
        setNoteDraft({ title: '', content: '' });
        setTabDraft({ title: '', url: '' });
      }
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true } as any);
  }, [
    createMenuOpen,
    drawerOpen,
    focusDrawerSelection,
    focusInput,
    launcherMode,
    linkSelectedRightDocuments,
    scheduleContextsRefresh,
    scheduleDocumentsRefresh,
    selectedContextId,
  ]);

  const removeDocumentFromContext = async (documentId: string) => {
    if (!auth || !selectedContextId) return;
    setBusy(true);
    setError(null);
    try {
      const apiUrl = toApiUrl(auth.serverUrl);
      const response = await fetch(`${apiUrl}/contexts/${selectedContextId}/documents/remove`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify([documentId]),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || 'Failed to remove document from context.');
      setSearchResults((current) => current.filter((doc) => String(doc.id || '') !== String(documentId)));
      setDocumentsReloadToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove document from context.');
    } finally {
      setBusy(false);
    }
  };

  const deleteDocumentFromDb = async (documentId: string) => {
    if (!auth || !selectedContextId) return;
    setBusy(true);
    setError(null);
    try {
      const apiUrl = toApiUrl(auth.serverUrl);
      const response = await fetch(`${apiUrl}/contexts/${selectedContextId}/documents`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify([documentId]),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || 'Failed to delete document.');
      setSearchResults((current) => current.filter((doc) => String(doc.id || '') !== String(documentId)));
      setDocumentsReloadToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document.');
    } finally {
      setBusy(false);
    }
  };

  const openDocumentDetails = (doc: DocumentItem) => {
    setDetailDocument(doc);
    setDetailOpen(true);
  };

  useEffect(() => {
    if (showTree) return;
    setTreeRoot(null);
    setTreeError(null);
    setTreeBusy(false);
    setTreeCursor(0);
    setExpandedNodes({});
  }, [showTree]);

  useEffect(() => {
    if (!showTree) return;
    if (!isAuthenticated || !auth) return;
    if (!selectedContextId) return;
    let isActive = true;
    const controller = new AbortController();
    const loadTree = async () => {
      setTreeBusy(true);
      setTreeError(null);
      try {
        const apiUrl = toApiUrl(auth.serverUrl);
        const response = await fetch(`${apiUrl}/contexts/${selectedContextId}/tree`, {
          headers: { Authorization: `Bearer ${auth.token}` },
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.message || 'Failed to load tree.');
        const treePayload = payload?.payload || payload;
        if (isActive) setTreeRoot(treePayload);
      } catch (err) {
        if (!isActive) return;
        setTreeError(err instanceof Error ? err.message : 'Failed to load tree.');
      } finally {
        if (isActive) setTreeBusy(false);
      }
    };
    loadTree();
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [auth, isAuthenticated, showTree, selectedContextId]);

  useEffect(() => {
    if (launcherMode !== 'link') return;
    setRightSelectedIds({});
    setRightNavMode('list');
    setRightContextUrl((current) => current || getParentContextSpecFromUrl(selectedContextUrl));
    setRightSearchValue('');
    setRightError(null);
    setRightTreeRoot(null);
    setRightTreeCursor(0);
    setRightExpandedNodes({});
  }, [launcherMode, selectedContextUrl]);

  useEffect(() => {
    if (launcherMode !== 'link') return;
    if (rightNavMode !== 'tree') return;
    if (!isAuthenticated || !auth) return;
    const workspaceName = getWorkspaceNameFromContextUrl(selectedContextUrl || selectedContext?.url || '');
    if (!workspaceName) return;
    let isActive = true;
    const controller = new AbortController();
    const loadRightTree = async () => {
      setRightBusy(true);
      setRightError(null);
      try {
        const apiUrl = toApiUrl(auth.serverUrl);
        const response = await fetch(`${apiUrl}/workspaces/${encodeURIComponent(workspaceName)}/tree`, {
          headers: { Authorization: `Bearer ${auth.token}` },
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.message || 'Failed to load tree.');
        const treePayload = payload?.payload || payload;
        if (isActive) setRightTreeRoot(treePayload);
      } catch (err) {
        if (!isActive) return;
        setRightError(err instanceof Error ? err.message : 'Failed to load tree.');
      } finally {
        if (isActive) setRightBusy(false);
      }
    };
    loadRightTree();
    return () => {
      isActive = false;
      controller.abort();
    };
  }, [launcherMode, rightNavMode, auth, isAuthenticated, selectedContextUrl, selectedContext?.url]);

  useEffect(() => {
    if (launcherMode !== 'link') return;
    if (!isAuthenticated || !auth) return;
    const workspaceName = getWorkspaceNameFromContextUrl(selectedContextUrl || selectedContext?.url || '');
    if (!workspaceName) return;
    if (!rightContextUrl) {
      setRightDocuments([]);
      return;
    }
    let isActive = true;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setRightBusy(true);
      setRightError(null);
      try {
        const apiUrl = toApiUrl(auth.serverUrl);
        const query = rightSearchValue.trim();
        const searchParam = query ? `&search=${encodeURIComponent(query)}` : '';
        const contextSpec = toWorkspaceContextSpec(rightContextUrl);
        const response = await fetch(
          `${apiUrl}/workspaces/${encodeURIComponent(workspaceName)}/documents?contextSpec=${encodeURIComponent(contextSpec)}&limit=50${searchParam}`,
          { headers: { Authorization: `Bearer ${auth.token}` }, signal: controller.signal },
        );
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.message || 'Failed to load documents.');
        const list = parseListPayload(payload);
        if (isActive) setRightDocuments(list as DocumentItem[]);
      } catch (err) {
        if (!isActive) return;
        setRightError(err instanceof Error ? err.message : 'Failed to load documents.');
      } finally {
        if (isActive) setRightBusy(false);
      }
    }, 180);
    return () => {
      isActive = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [launcherMode, auth, isAuthenticated, selectedContextUrl, selectedContext?.url, rightContextUrl, rightSearchValue, rightDocumentsReloadToken]);

  useEffect(() => {
    if (!treeRows.length) {
      setTreeCursor(0);
      return;
    }
    if (treeCursor > treeRows.length - 1) {
      setTreeCursor(0);
    }
  }, [treeRows.length, treeCursor]);

  useEffect(() => {
    if (!rightTreeRows.length) {
      setRightTreeCursor(0);
      return;
    }
    if (rightTreeCursor > rightTreeRows.length - 1) {
      setRightTreeCursor(0);
    }
  }, [rightTreeRows.length, rightTreeCursor]);

  useEffect(() => {
    setTreeCursor(0);
  }, [treeQuery]);

  useEffect(() => {
    if (!isAuthenticated || !auth) return;
    const query = searchValue.trim();
    const looksLikeUrl = query.includes('://');

    // Parse shortcuts: /t for tabs, /n for notes, /d for dotfiles
    let filterArray: string[] = [];
    let actualQuery = query;

    if (query.startsWith('/t ')) {
      filterArray = ['data/abstraction/tab'];
      actualQuery = query.slice(3).trim();
    } else if (query.startsWith('/n ')) {
      filterArray = ['data/abstraction/note'];
      actualQuery = query.slice(3).trim();
    } else if (query.startsWith('/d ')) {
      filterArray = ['data/abstraction/dotfile'];
      actualQuery = query.slice(3).trim();
    }

    // If tree view or URL input, skip search
    if (showTree || looksLikeUrl || !selectedContextId) {
      setSearchResults([]);
      setSearchError(null);
      setSearchBusy(false);
      return;
    }

    // If empty query but we want to load default documents
    if (!query) {
      let isActive = true;
      const controller = new AbortController();
      const timer = window.setTimeout(async () => {
        setSearchBusy(true);
        setSearchError(null);
        try {
          const apiUrl = toApiUrl(auth.serverUrl);
          const response = await fetch(
            `${apiUrl}/contexts/${selectedContextId}/documents?limit=20`,
            {
              headers: { Authorization: `Bearer ${auth.token}` },
              signal: controller.signal,
            },
          );
          const payload = await response.json();
          if (!response.ok) throw new Error(payload?.message || 'Failed to load documents.');
          const list = parseListPayload(payload);
          if (isActive) {
            setSearchResults(list as DocumentItem[]);
          }
        } catch (err) {
          if (!isActive) return;
          setSearchError(err instanceof Error ? err.message : 'Failed to load documents.');
        } finally {
          if (isActive) setSearchBusy(false);
        }
      }, 50);
      return () => {
        isActive = false;
        controller.abort();
        window.clearTimeout(timer);
      };
    }

    // Search with query
    let isActive = true;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchBusy(true);
      setSearchError(null);
      try {
        const apiUrl = toApiUrl(auth.serverUrl);
        const filterParam = filterArray.length > 0
          ? `&${filterArray.map(f => `filterArray=${encodeURIComponent(f)}`).join('&')}`
          : '';
        const response = await fetch(
          `${apiUrl}/contexts/${selectedContextId}/documents?search=${encodeURIComponent(actualQuery)}&limit=20${filterParam}`,
          {
            headers: { Authorization: `Bearer ${auth.token}` },
            signal: controller.signal,
          },
        );
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.message || 'Search failed.');
        const list = parseListPayload(payload);
        if (isActive) {
          setSearchResults(list as DocumentItem[]);
        }
      } catch (err) {
        if (!isActive) return;
        setSearchError(err instanceof Error ? err.message : 'Search failed.');
      } finally {
        if (isActive) setSearchBusy(false);
      }
    }, 220);
    return () => {
      isActive = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [auth, isAuthenticated, searchValue, selectedContextId, showTree, documentsReloadToken]);

  if (!bootstrapped) {
    return <div className="h-screen w-screen bg-black" />;
  }

  // Unauthenticated: show particle + auth panel
  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen bg-background text-foreground">
        <div className="grid h-full w-full grid-cols-1 lg:grid-cols-[0.382fr_0.618fr]">
          <ParticlePanel />
          <div className="flex h-full w-full flex-col bg-white">
            <AuthPanel
              key={authKey}
              defaultServerUrl={auth?.serverUrl}
              defaultEmail={auth?.email}
              busy={busy}
              error={error}
              status={status}
              onTestConnection={testConnection}
              onLogin={login}
            />
          </div>
        </div>
      </div>
    );
  }

  // Authenticated: sidebar + main content
  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      {/* Icon sidebar (context-colored) */}
      <div
        className={`flex h-full w-16 flex-col items-center justify-between py-4 ${panelTextClass}`}
        style={{ backgroundColor: selectedContext?.color || '#111111' }}
      >
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${panelIsLight ? 'bg-black/10 hover:bg-black/20' : 'bg-white/10 hover:bg-white/20'} transition-material`}
          title="Contexts"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
            <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
            <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
          </svg>
        </button>
        <div className="flex flex-col items-center gap-3">
          <button
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${panelIsLight ? 'bg-black/10 hover:bg-black/20' : 'bg-white/10 hover:bg-white/20'} transition-material`}
            title="Settings"
          >
            <span className="text-sm">⚙</span>
          </button>
          <button
            onClick={handleLogout}
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${panelIsLight ? 'bg-black/10 hover:bg-black/20' : 'bg-white/10 hover:bg-white/20'} transition-material`}
            title="Log out"
          >
            <span className="text-sm">⏻</span>
          </button>
        </div>
      </div>

      {/* Drawer - shrinks main content */}
      {drawerOpen && (
        <div
          ref={drawerRef}
          className={`w-80 p-6 ${panelTextClass}`}
          style={{ backgroundColor: selectedContext?.color || '#111111' }}
          onMouseLeave={() => setDrawerHoverKey(null)}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className={`text-sm uppercase tracking-[0.2em] ${panelMutedClass}`}>Contexts</div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchContexts}
                disabled={busy}
                className={`${panelMutedClass} hover:opacity-100 disabled:opacity-30`}
                title="Refresh contexts"
              >
                <svg className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={() => setDrawerOpen(false)}
                className={`${panelMutedClass} hover:opacity-100`}
                title="Close"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {drawerContexts.map((context) => {
              const itemKey = getContextKey(context);
              const itemColor = context.color || selectedContext?.color || null;
              const rgb = getRgb(itemColor || undefined);
              const isActive = itemKey === selectedContextId;
              const isHovered = drawerHoverKey === itemKey;
              const hoverBg = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)` : undefined;
              const activeBg = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)` : undefined;
              const bg = isActive ? activeBg : isHovered ? hoverBg : undefined;

              return (
                <button
                  key={itemKey}
                  data-context-key={itemKey}
                  onClick={() => handleContextPick(context)}
                  onMouseEnter={() => setDrawerHoverKey(itemKey)}
                  onFocus={() => setDrawerHoverKey(itemKey)}
                  onBlur={() => setDrawerHoverKey((current) => (current === itemKey ? null : current))}
                  className={`w-full px-3 py-2 text-left text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 ${
                    isActive ? 'rounded-l-md rounded-r-none' : 'rounded-md'
                  } ${
                    panelIsLight ? 'bg-black/5 focus-visible:ring-black/40' : 'bg-white/10 focus-visible:ring-white/40'
                  } ${isActive ? 'context-drawer-item is-active' : 'context-drawer-item'}`}
                  style={{
                    borderLeft: `8px solid ${itemColor || 'transparent'}`,
                    backgroundColor: bg,
                  }}
                >
                  <div className="font-medium">{context.id || 'context'}</div>
                  <div className={`text-xs ${panelMutedClass}`}>{context.url}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main content card */}
      <div className="relative flex h-full flex-1 flex-col bg-background p-4">
        <div className="flex h-full flex-col rounded bg-white shadow-lg">
        {/* Header: context name + input + submit button */}
        <div className="border-b border-border bg-white p-4 shadow-sm">
          <div className="mb-3">
            <div className="text-xl font-semibold">
              Context: {selectedContext?.id || 'default'}
            </div>
            {selectedContextUrl && (
              <div className="text-sm text-muted-foreground mt-1 font-mono">
                @ {selectedContextUrl}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            >
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.3-4.3"/>
            </svg>
            <Input
              autoFocus
              ref={inputRef}
              value={searchActive ? searchValue : (selectedContextUrl || selectedContext?.url || '')}
              onFocus={() => {
                if (!searchActive) {
                  setSearchActive(true);
                  setSearchValue('');
                }
              }}
              onBlur={() => {
                if (!searchValue.trim()) setSearchActive(false);
              }}
              onChange={(event) => {
                const value = event.target.value;
                if (!searchActive) {
                  setSearchActive(true);
                }
                setSearchValue(value);
                if (value.includes('://')) {
                  setPendingUrl(value);
                }
              }}
              onKeyDown={(event) => {
                if (!searchActive) return;
                if (showTree && treeRows.length > 0) {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setTreeCursor((current) => (current + 1) % treeRows.length);
                    return;
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setTreeCursor((current) =>
                      (current - 1 + treeRows.length) % treeRows.length
                    );
                    return;
                  }
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    const item = treeRows[treeCursor] ?? treeRows[0];
                    if (item) {
                      setPendingUrl(item.url);
                      setSearchValue(item.url);
                    }
                    return;
                  }
                }
                if (event.key === 'Enter') {
                  event.preventDefault();
                  const value = searchValue.trim();
                  if (value.includes('://')) {
                    handleSetContext();
                  }
                }
              }}
              placeholder="Search docs, /c for tree, /t tabs, /n notes, /d dotfiles"
              className={`h-12 pl-10 text-base transition-colors ${
                inputBlink === 'success' ? 'bg-green-100' :
                inputBlink === 'error' ? 'bg-red-100' : ''
              } shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:shadow-md`}
            />
          </div>
          <button
            onClick={handleSetContext}
            disabled={!pendingUrl || pendingUrl === selectedContextUrl || busy}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevation-2 transition-material hover:opacity-90 disabled:opacity-40"
            title="Set context"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m13 5 7 7-7 7" />
            </svg>
          </button>
          </div>
        </div>

        {/* Results area */}
        <div className="flex min-w-0 flex-1 overflow-hidden">
          <div className="relative min-w-0 flex-1 overflow-auto overflow-x-hidden">
          {launcherMode === 'browse' ? (
            showTree ? (
              <div className="p-4">
                {treeBusy ? (
                  <div className="p-4 text-sm text-muted-foreground">Loading tree...</div>
                ) : treeError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {treeError}
                  </div>
                ) : treeRows.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">No tree nodes match.</div>
                ) : (
                  <div className="space-y-0.5">
                    {treeRows.map((item, index) => {
                      const isActive = index === treeCursor;
                      return (
                        <div
                          key={item.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm transition-colors ${
                            isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                          }`}
                          style={{ paddingLeft: `${8 + item.depth * 16}px` }}
                          onClick={() => {
                            setPendingUrl(item.url);
                            setSearchValue(item.url);
                          }}
                        >
                          <button
                            type="button"
                            className="flex h-4 w-4 items-center justify-center text-xs text-muted-foreground"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (item.hasChildren) toggleNode(item.id);
                            }}
                          >
                            {item.hasChildren ? (item.isExpanded ? '▼' : '▶') : ''}
                          </button>
                          {item.color && (
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: item.color || undefined }}
                            />
                          )}
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4" ref={searchResultsRef}>
                {searchError && (
                  <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {searchError}
                  </div>
                )}
                {!searchValue.trim() && !searchBusy && searchResults.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <p>Recent documents from this context</p>
                    <p className="text-xs mt-1">Type to search, /c for tree, /t tabs, /n notes, /d dotfiles</p>
                  </div>
                )}
                {searchBusy && (
                  <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
                )}
                {searchValue.trim() && !searchBusy && searchResults.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No documents match that query.
                  </div>
                )}
              <div className="min-w-0 space-y-2">
                  {searchResults.map((doc) => {
                    const title = getDisplayTitle(doc);
                    const content = getDisplayContent(doc);
                    const schema = doc.schema || '';
                    const isTabDocument = schema === 'data/abstraction/tab';
                    const tabUrl = isTabDocument && doc.data?.url ? doc.data.url : null;
                    const docId = doc.id ? String(doc.id) : '';

                    const getSchemaDisplayName = (schema: string) => {
                      const parts = schema.split('/');
                      return parts[parts.length - 1] || schema;
                    };

                    const formatDate = (dateString?: string) => {
                      if (!dateString) return null;
                      return new Date(dateString).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    };

                    const getPrimaryChecksum = () => {
                      if (doc.data?.checksumArray && doc.data.checksumArray.length > 0) {
                        const primary = doc.data.checksumArray[0];
                        if (primary) {
                          const parts = primary.split('/');
                          const hash = parts[parts.length - 1] || primary;
                          return hash.substring(0, 8) + '...';
                        }
                      }
                      return null;
                    };

                    const checksum = getPrimaryChecksum();

                    return (
                      <div
                        key={doc.id || title}
                      className="w-full min-w-0 overflow-hidden rounded-lg border bg-white p-3 transition-all hover:bg-accent/50 cursor-pointer"
                        onClick={() => {
                          if (isTabDocument && tabUrl) {
                            window.open(tabUrl, '_blank', 'noopener,noreferrer');
                          }
                        }}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="mb-2 flex items-center gap-2 overflow-hidden">
                              {isTabDocument ? (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="text-blue-500 flex-shrink-0"
                                >
                                  <circle cx="12" cy="12" r="10"/>
                                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                                  <path d="M2 12h20"/>
                                </svg>
                              ) : (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="text-blue-500 flex-shrink-0"
                                >
                                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                                  <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                                </svg>
                              )}
                            <h4 className="min-w-0 flex-1 break-all font-medium line-clamp-1" title={title}>
                                {title}
                              </h4>
                              {isTabDocument && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="text-muted-foreground flex-shrink-0"
                                >
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                  <polyline points="15 3 21 3 21 9"/>
                                  <line x1="10" x2="21" y1="14" y2="3"/>
                                </svg>
                              )}
                              {schema && (
                                <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded border flex-shrink-0">
                                  {getSchemaDisplayName(schema)}
                                </span>
                              )}
                            </div>

                            {isTabDocument && tabUrl && (
                              <p
                                className="mb-2 line-clamp-2 max-w-full break-all font-mono text-xs text-muted-foreground"
                                title={tabUrl}
                              >
                                {tabUrl}
                              </p>
                            )}

                            {content && (
                              <p className="mb-2 line-clamp-2 overflow-hidden text-sm text-muted-foreground break-words">
                                {content}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground overflow-hidden">
                              {docId && (
                                <div className="flex min-w-0 items-center gap-1">
                                  <span className="font-medium">ID:</span>
                                  <span className="max-w-[140px] truncate font-mono" title={`ID: ${docId}`}>
                                    {docId}
                                  </span>
                                </div>
                              )}
                              {checksum && (
                                <div className="flex min-w-0 items-center gap-1">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <line x1="4" x2="20" y1="9" y2="9"/>
                                    <line x1="4" x2="20" y1="15" y2="15"/>
                                    <line x1="10" x2="8" y1="3" y2="21"/>
                                    <line x1="16" x2="14" y1="3" y2="21"/>
                                  </svg>
                                  <span className="font-mono" title="Checksum">
                                    {checksum}
                                  </span>
                                </div>
                              )}
                              {doc.createdAt && (
                                <div className="flex min-w-0 items-center gap-1">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                                    <line x1="16" x2="16" y1="2" y2="6"/>
                                    <line x1="8" x2="8" y1="2" y2="6"/>
                                    <line x1="3" x2="21" y1="10" y2="10"/>
                                  </svg>
                                  <span title={`Created: ${formatDate(doc.createdAt)}`}>
                                    {formatDate(doc.createdAt)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-shrink-0 items-center gap-1">
                            <button
                              className="rounded-sm p-1 hover:bg-muted"
                              title="View document details"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDocumentDetails(doc);
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                            {docId && (
                              <button
                                className="rounded-sm p-1 hover:bg-muted"
                                title="Remove from context (keep in DB)"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!window.confirm('Remove this document from the current context?')) return;
                                  removeDocumentFromContext(docId);
                                }}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M18 6 6 18" />
                                  <path d="M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                            {docId && (
                              <button
                                className="rounded-sm p-1 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                title="Delete from DB (permanent)"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!window.confirm('Delete this document from the database? This is permanent.')) return;
                                  deleteDocumentFromDb(docId);
                                }}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          ) : (
            <div className="flex h-full min-w-0 overflow-hidden">
              <div className="flex h-full w-[52%] min-w-0 flex-col border-r border-border">
                <div className="px-4 py-3 text-xs text-muted-foreground">
                  <div className="font-medium">Current</div>
                  <div className="font-mono truncate">@ {selectedContextUrl || selectedContext?.url || ''}</div>
                </div>
                <div
                  className="min-h-0 flex-1 overflow-auto px-4 pb-4"
                  ref={searchResultsRef}
                  onDragOver={(e) => {
                    if (launcherMode !== 'link') return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (launcherMode !== 'link') return;
                    const raw =
                      e.dataTransfer.getData('application/x-canvas-document-ids') ||
                      e.dataTransfer.getData('text/plain');
                    if (!raw) return;
                    try {
                      void linkDraggedDocuments(JSON.parse(raw));
                    } catch {
                      // ignore
                    }
                  }}
                  title="Drop documents here to link (or press F5)"
                >
                  {searchBusy ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
                  ) : (
                    <div className="space-y-2">
                      {searchResults.map((doc) => {
                        const title = getDisplayTitle(doc);
                        const content = getDisplayContent(doc);
                        return (
                          <div key={doc.id || title} className="rounded-lg border bg-white p-3 hover:bg-accent/50">
                            <div className="text-sm font-medium break-all line-clamp-1" title={title}>{title}</div>
                            {content && <div className="text-xs text-muted-foreground break-words line-clamp-1" title={content}>{content}</div>}
                          </div>
                        );
                      })}
                      {!searchBusy && searchResults.length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">No documents.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                {launcherMode === 'create-note' && (
                  <div className="p-4">
                    <div className="mb-3 text-sm font-semibold">New note</div>
                    <div className="space-y-3">
                      <Input
                        value={noteDraft.title}
                        onChange={(e) => setNoteDraft((d) => ({ ...d, title: e.target.value }))}
                        placeholder="Title"
                        className="h-10"
                      />
                      <textarea
                        value={noteDraft.content}
                        onChange={(e) => setNoteDraft((d) => ({ ...d, content: e.target.value }))}
                        placeholder="Write your note…"
                        className="min-h-[360px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                )}

                {launcherMode === 'create-tab' && (
                  <div className="p-4">
                    <div className="mb-3 text-sm font-semibold">New tab</div>
                    <div className="space-y-3">
                      <Input
                        value={tabDraft.title}
                        onChange={(e) => setTabDraft((d) => ({ ...d, title: e.target.value }))}
                        placeholder="Title (optional)"
                        className="h-10"
                      />
                      <Input
                        value={tabDraft.url}
                        onChange={(e) => setTabDraft((d) => ({ ...d, url: e.target.value }))}
                        placeholder="URL (https://...)"
                        className="h-10 font-mono"
                      />
                      <div className="text-xs text-muted-foreground">This does not magically read your browser. Yet.</div>
                    </div>
                  </div>
                )}

                {launcherMode === 'link' && (
                  <div className="flex h-full flex-col">
                    <div className="border-b border-border p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">Link documents</div>
                          <div className="text-xs text-muted-foreground font-mono truncate">
                            Target: {selectedContextUrl || selectedContext?.url || ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant={rightNavMode === 'list' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setRightNavMode('list')}
                          >
                            List
                          </Button>
                          <Button
                            type="button"
                            variant={rightNavMode === 'tree' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setRightNavMode('tree')}
                          >
                            Tree
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <Input
                          value={rightContextUrl}
                          onChange={(e) => setRightContextUrl(e.target.value)}
                          placeholder="Source (workspace://path or /path)"
                          className="h-10 font-mono"
                        />
                        <Input
                          value={rightSearchValue}
                          onChange={(e) => setRightSearchValue(e.target.value)}
                          placeholder={rightNavMode === 'tree' ? 'Filter tree…' : 'Search documents…'}
                          className="h-10"
                        />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 overflow-auto overflow-x-hidden p-4">
                      {rightError && (
                        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                          {rightError}
                        </div>
                      )}

                      {rightNavMode === 'tree' ? (
                        rightTreeRows.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            {rightBusy ? 'Loading tree…' : 'No tree nodes match.'}
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {rightTreeRows.map((item, index) => {
                              const isActive = index === rightTreeCursor;
                              return (
                                <div
                                  key={item.id}
                                  className={`flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm transition-colors ${
                                    isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                                  }`}
                                  style={{ paddingLeft: `${8 + item.depth * 16}px` }}
                                  onClick={() => {
                                    setRightContextUrl(item.url);
                                    setRightNavMode('list');
                                    setRightSelectedIds({});
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="flex h-4 w-4 items-center justify-center text-xs text-muted-foreground"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (item.hasChildren) toggleRightNode(item.id);
                                    }}
                                  >
                                    {item.hasChildren ? (item.isExpanded ? '▼' : '▶') : ''}
                                  </button>
                                  {item.color && (
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: item.color || undefined }}
                                    />
                                  )}
                                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        )
                      ) : (
                        <>
                          {rightBusy && (
                            <div className="p-4 text-center text-sm text-muted-foreground">Loading…</div>
                          )}
                          {!rightBusy && rightDocuments.length === 0 && (
                            <div className="p-4 text-center text-sm text-muted-foreground">No documents in source context.</div>
                          )}
                          <div className="w-full min-w-0 space-y-1">
                            {rightDocuments.map((doc) => {
                              const id = doc.id ? String(doc.id) : '';
                              const checked = !!(id && rightSelectedIds[id]);
                              const title = getDisplayTitle(doc);
                              return (
                                <label
                                  key={id || title}
                                  className="flex w-full min-w-0 cursor-pointer items-start gap-2 overflow-hidden rounded-md border bg-white px-2 py-2 hover:bg-accent/50"
                                  draggable={!!id}
                                  onDragStart={(e) => {
                                    if (!id) return;
                                    const selected = Object.keys(rightSelectedIds).filter((docId) => rightSelectedIds[docId]);
                                    const idsToDrag = selected.includes(id) ? selected : [id];
                                    const payload = JSON.stringify(idsToDrag);
                                    e.dataTransfer.setData('application/x-canvas-document-ids', payload);
                                    e.dataTransfer.setData('text/plain', payload);
                                    e.dataTransfer.effectAllowed = 'copy';
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    className="mt-1 shrink-0"
                                    checked={checked}
                                    disabled={!id}
                                    onChange={() => {
                                      if (!id) return;
                                      setRightSelectedIds((current) => ({
                                        ...current,
                                        [id]: !current[id],
                                      }));
                                    }}
                                  />
                                  <div className="min-w-0 flex-1 overflow-hidden">
                                    <div className="break-all text-sm font-medium line-clamp-1" title={title}>{title}</div>
                                    {id && <div className="truncate text-xs font-mono text-muted-foreground">{id}</div>}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          </div>

          {/* Action rail (no overlap, shrinks content) */}
          <div className="w-[84px] shrink-0 border-l border-border bg-white p-3">
            <div className="flex flex-col items-center gap-3">
              {launcherMode === 'create-note' && (
                <Button
                  type="button"
                  className="h-14 w-14 rounded-full shadow-elevation-6"
                  title="Save note"
                  disabled={busy || (!noteDraft.title.trim() && !noteDraft.content.trim())}
                  onClick={async () => {
                    const title = noteDraft.title.trim() || 'Note';
                    const content = noteDraft.content || '';
                    const ok = await insertIntoCurrentContext({
                      documents: { schema: 'data/abstraction/note', data: { title, content } },
                    });
                    if (ok) setLauncherMode('browse');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </Button>
              )}

              {launcherMode === 'create-tab' && (
                <Button
                  type="button"
                  className="h-14 w-14 rounded-full shadow-elevation-6"
                  title="Save tab"
                  disabled={busy || !tabDraft.url.trim()}
                  onClick={async () => {
                    const url = tabDraft.url.trim();
                    const title = tabDraft.title.trim() || undefined;
                    const ok = await insertIntoCurrentContext({
                      documents: { schema: 'data/abstraction/tab', data: { ...(title ? { title } : {}), url } },
                    });
                    if (ok) setLauncherMode('browse');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </Button>
              )}

              {launcherMode === 'link' && (
                <Button
                  type="button"
                  className="h-14 w-14 rounded-full shadow-elevation-6"
                  variant="secondary"
                  title="Link selected"
                  disabled={busy || Object.keys(rightSelectedIds).filter((id) => rightSelectedIds[id]).length === 0}
                  onClick={async () => {
                    const ids = Object.keys(rightSelectedIds).filter((id) => rightSelectedIds[id]);
                    const ok = await insertIntoCurrentContext({ documentIds: ids });
                    if (ok) {
                      setRightSelectedIds({});
                      setLauncherMode('browse');
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
                    <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
                  </svg>
                </Button>
              )}

              {/* Mini 40dp actions */}
              {launcherMode === 'browse' && (
                <>
                  <DropdownMenu open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        className="h-10 w-10 rounded-full bg-[#cf2528] text-white shadow-elevation-4 p-0 transition-transform hover:bg-[#cf2528]/90 data-[state=open]:rotate-45"
                        title="Create"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5v14" />
                          <path d="M5 12h14" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    side="left"
                    sideOffset={10}
                    className="w-44 rounded-xl border bg-white p-2 shadow-elevation-6"
                  >
                      <DropdownMenuItem
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2"
                        onSelect={() => {
                          setNoteDraft({ title: '', content: '' });
                          setLauncherMode('create-note');
                        setCreateMenuOpen(false);
                        }}
                      >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                        <path d="M4 7V4h16v3" />
                        <path d="M9 20h6" />
                        <path d="M12 4v16" />
                      </svg>
                        Note
                      </DropdownMenuItem>
                      <DropdownMenuItem
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2"
                        onSelect={() => {
                          setTabDraft({ title: '', url: '' });
                          setLauncherMode('create-tab');
                        setCreateMenuOpen(false);
                        }}
                      >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h20" />
                        <path d="M12 2a14.5 14.5 0 0 0 0 20" />
                        <path d="M12 2a14.5 14.5 0 0 1 0 20" />
                      </svg>
                        Tab
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    type="button"
                    className="h-10 w-10 rounded-full shadow-elevation-4 p-0"
                    variant="secondary"
                    title="Link"
                    onClick={() => setLauncherMode('link')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
                      <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
                    </svg>
                  </Button>
                </>
              )}

              {launcherMode !== 'browse' && (
                <Button
                  type="button"
                  className="h-10 w-10 rounded-full shadow-elevation-4 p-0"
                  variant="outline"
                  title="Cancel"
                  onClick={() => setLauncherMode('browse')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </Button>
              )}
            </div>
          </div>
        </div>

          {error && (
            <div className="border-t border-border p-4">
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            </div>
          )}
        </div>
      </div>

      <DocumentDetailModal
        document={detailDocument}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}

createRoot(document.getElementById('context-launcher-root')!).render(
  <StrictMode>
    <ContextLauncherApp />
  </StrictMode>,
);
