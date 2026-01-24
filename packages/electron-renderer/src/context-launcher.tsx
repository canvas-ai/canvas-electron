import { StrictMode, useEffect, useMemo, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthPanel, type AuthFormData } from '../../ui/src/components/auth/AuthPanel';
import { ParticlePanel } from '../../ui/src/components/auth/ParticlePanel';
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
  const needle = query.toLowerCase();
  const nodeMatches = !needle || label.toLowerCase().includes(needle) || path.toLowerCase().includes(needle);

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

  const includeNode = nodeMatches || childMatches;
  const rows: TreeRow[] = [];
  if (includeNode) {
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
    if (hasChildren && (query ? true : isExpanded)) {
      rows.push(...childRows);
    }
  }

  return { rows, hasMatch: includeNode };
}

function ContextLauncherApp() {
  const [auth, setAuth] = useState<AuthConfig | null>(null);
  const [contexts, setContexts] = useState<ContextItem[]>([]);
  const [selectedContextId, setSelectedContextId] = useState<string | null>(null);
  const [selectedContextUrl, setSelectedContextUrl] = useState<string>('');
  const [pendingUrl, setPendingUrl] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchActive, setSearchActive] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<DocumentItem[]>([]);
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

  const isAuthenticated = !!auth?.token && !!auth?.serverUrl;

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

  useEffect(() => {
    const fetchContexts = async () => {
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
    };
    fetchContexts();
  }, [auth, isAuthenticated]);

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
    let isActive = true;
    const controller = new AbortController();
    const loadTree = async () => {
      setTreeBusy(true);
      setTreeError(null);
      try {
        const apiUrl = toApiUrl(auth.serverUrl);
        const response = await fetch(`${apiUrl}/contexts/default/tree`, {
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
  }, [auth, isAuthenticated, showTree]);

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
    setTreeCursor(0);
  }, [treeQuery]);

  useEffect(() => {
    if (!isAuthenticated || !auth) return;
    const query = searchValue.trim();
    const looksLikeUrl = query.includes('://');
    if (!query || showTree || looksLikeUrl || !selectedContextId) {
      setSearchResults([]);
      setSearchError(null);
      setSearchBusy(false);
      return;
    }
    let isActive = true;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchBusy(true);
      setSearchError(null);
      try {
        const apiUrl = toApiUrl(auth.serverUrl);
        const response = await fetch(
          `${apiUrl}/contexts/${selectedContextId}/documents?search=${encodeURIComponent(query)}&limit=10`,
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
  }, [auth, isAuthenticated, searchValue, selectedContextId, showTree]);

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
          onClick={() => setDrawerOpen(true)}
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${panelIsLight ? 'bg-black/10 hover:bg-black/20' : 'bg-white/10 hover:bg-white/20'} transition-material`}
          title="Contexts"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 4h3a2 2 0 0 1 2 2v14" />
            <path d="M2 20h3" />
            <path d="M13 20h9" />
            <path d="M10 12v.01" />
            <path d="M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z" />
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

      {/* Main content */}
      <div className="relative flex h-full flex-1 flex-col bg-white">
        {/* Header: context name + input + submit button */}
        <div className="border-b border-border bg-white p-4 shadow-sm">
          <div className="mb-3 text-xl font-semibold">
            Context ID: {selectedContext?.id || 'default'}
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
              placeholder="Search docs, paste URL, or /c for tree"
              className={`h-12 pl-10 text-base transition-colors ${
                inputBlink === 'success' ? 'bg-green-100' : 
                inputBlink === 'error' ? 'bg-red-100' : ''
              }`}
            />
          </div>
          <button
            onClick={handleSetContext}
            disabled={!pendingUrl || pendingUrl === selectedContextUrl || busy}
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-material hover:opacity-90 disabled:opacity-40"
            title="Set context"
          >
            <span className="text-lg">→</span>
          </button>
          </div>
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-auto">
          {showTree ? (
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
                        <span className="truncate">{item.label}</span>
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
              {!searchValue.trim() && (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Type to search documents or /c for tree
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
              <div className="space-y-3">
                {searchResults.map((doc) => {
                  const title = getDocumentLabel(doc);
                  const content = doc.summary || doc.description || '';
                  const isTabDocument = doc.id?.toString().includes('tab');
                  
                  return (
                    <div
                      key={doc.id || title}
                      className="rounded-lg border bg-white p-4 shadow-sm transition-all hover:shadow-md cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="mb-2 flex items-center gap-2">
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
                              {isTabDocument ? (
                                <>
                                  <circle cx="12" cy="12" r="10"/>
                                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
                                  <path d="M2 12h20"/>
                                </>
                              ) : (
                                <>
                                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                                  <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                                </>
                              )}
                            </svg>
                            <h4 className="font-medium truncate flex-1 max-w-full" title={title}>
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
                          </div>
                          {content && (
                            <p className="line-clamp-2 text-sm text-muted-foreground mb-3 break-all overflow-hidden">{content}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground overflow-hidden">
                            {doc.id && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="font-medium">ID:</span>
                                <span className="font-mono truncate max-w-[60px]" title={`ID: ${doc.id}`}>{doc.id}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          className="p-1 hover:bg-muted rounded-sm flex-shrink-0"
                          title="View details"
                          onClick={(e) => {
                            e.stopPropagation();
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
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="border-t border-border p-4">
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          </div>
        )}

        {/* Drawer overlay */}
        {drawerOpen && (
          <div className="absolute inset-0 z-20 flex">
            <div
              className={`w-80 p-6 shadow-2xl ${panelTextClass}`}
              style={{ 
                backgroundColor: selectedContext?.color || '#111111',
                boxShadow: '0 8px 10px -5px rgba(0,0,0,0.2), 0 16px 24px 2px rgba(0,0,0,0.14), 0 6px 30px 5px rgba(0,0,0,0.12)'
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className={`text-sm uppercase tracking-[0.2em] ${panelMutedClass}`}>Contexts</div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className={`text-xs ${panelMutedClass} hover:opacity-100`}
                >
                  Close
                </button>
              </div>
              <div className="space-y-2">
                {drawerContexts.map((context) => (
                  <button
                    key={getContextKey(context)}
                    onClick={() => handleContextPick(context)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm shadow-sm ${panelIsLight ? 'bg-black/5 hover:bg-black/10' : 'bg-white/10 hover:bg-white/20'}`}
                  >
                    <div className="font-medium">{context.id || 'context'}</div>
                    <div className={`text-xs ${panelMutedClass}`}>{context.url}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 bg-black/40" onClick={() => setDrawerOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById('context-launcher-root')!).render(
  <StrictMode>
    <ContextLauncherApp />
  </StrictMode>,
);
