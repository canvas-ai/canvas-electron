import type { Workspace, Context, TreeNode } from './types';

type AuthConfig = { serverUrl: string; token: string };

async function getAuth(): Promise<AuthConfig> {
  const config = await window.canvas?.getAuthConfig();
  if (!config?.serverUrl || !config?.token) throw new Error('Not authenticated');
  return config;
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const auth = await getAuth();
  const base = auth.serverUrl.replace(/\/+$/, '');
  const res = await fetch(`${base}/rest/v2${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${auth.token}`,
      ...options?.headers,
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || `API error ${res.status}`);
  return json?.payload ?? json;
}

export async function fetchWorkspaces(): Promise<Workspace[]> {
  return api<Workspace[]>('/workspaces');
}

export async function fetchContexts(): Promise<Context[]> {
  return api<Context[]>('/contexts');
}

export async function fetchContextTree(contextId: string): Promise<TreeNode> {
  return api<TreeNode>(`/contexts/${contextId}/tree`);
}

export async function fetchWorkspaceTree(workspaceName: string): Promise<TreeNode> {
  return api<TreeNode>(`/workspaces/${encodeURIComponent(workspaceName)}/tree`);
}

export async function setContextUrl(contextId: string, url: string): Promise<void> {
  await api(`/contexts/${contextId}/url`, {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

// ── Tree operations ──────────────────────────────────────

type TreeBase = { contextId?: string; workspaceName?: string };

function treeBase({ contextId, workspaceName }: TreeBase): string {
  if (contextId) return `/contexts/${contextId}/tree`;
  if (workspaceName) return `/workspaces/${encodeURIComponent(workspaceName)}/tree`;
  throw new Error('contextId or workspaceName required');
}

export async function insertTreePath(base: TreeBase, path: string): Promise<void> {
  await api(`${treeBase(base)}/paths`, {
    method: 'POST',
    body: JSON.stringify({ path, autoCreateLayers: true }),
  });
}

export async function removeTreePath(base: TreeBase, path: string, recursive = false): Promise<void> {
  await api(`${treeBase(base)}/paths?path=${encodeURIComponent(path)}&recursive=${recursive}`, {
    method: 'DELETE',
  });
}

export async function moveTreePath(base: TreeBase, from: string, to: string, recursive = false): Promise<void> {
  await api(`${treeBase(base)}/paths/move`, {
    method: 'POST',
    body: JSON.stringify({ from, to, recursive }),
  });
}

export async function copyTreePath(base: TreeBase, from: string, to: string, recursive = false): Promise<void> {
  await api(`${treeBase(base)}/paths/copy`, {
    method: 'POST',
    body: JSON.stringify({ from, to, recursive }),
  });
}

export async function renameLayer(workspaceName: string, layerId: string, newName: string): Promise<void> {
  await api(`/workspaces/${encodeURIComponent(workspaceName)}/layers/${layerId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: newName }),
  });
}
