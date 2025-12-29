import type { AuthSession } from '../../shared/types'
import type { TreeNode } from '../types/workspace'

export type WorkspaceSummary = {
  id: string
  name: string
  label?: string
  type?: string
  status?: string
}

export type ContextSummary = {
  id: string
  url: string
  workspaceId: string
  workspaceName: string
  userId: string
}

type ResponseObject<T> = { payload?: T; message?: string; status?: string; statusCode?: number }

function unwrap<T>(json: any): T {
  return (json?.payload ?? json) as T
}

async function apiFetch<T>(
  session: AuthSession,
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${session.apiUrl}${path.startsWith('/') ? '' : '/'}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
      ...(init.skipAuth ? {} : { Authorization: `Bearer ${session.token}` }),
    },
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : null
  if (!res.ok) {
    const msg = json?.message || json?.error || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return json as T
}

export async function listWorkspaces(session: AuthSession): Promise<WorkspaceSummary[]> {
  const res = await apiFetch<ResponseObject<WorkspaceSummary[]>>(session, '/workspaces')
  const list = unwrap<WorkspaceSummary[]>(res)
  return Array.isArray(list) ? list : []
}

export async function getWorkspaceTree(session: AuthSession, workspaceId: string): Promise<TreeNode> {
  const res = await apiFetch<any>(session, `/workspaces/${workspaceId}/tree`)
  return unwrap<TreeNode>(res)
}

export async function listContexts(session: AuthSession): Promise<ContextSummary[]> {
  const res = await apiFetch<ResponseObject<ContextSummary[]>>(session, '/contexts')
  const list = unwrap<ContextSummary[]>(res)
  return Array.isArray(list) ? list : []
}

export async function getContextTree(session: AuthSession, contextId: string): Promise<TreeNode> {
  const res = await apiFetch<any>(session, `/contexts/${contextId}/tree`)
  return unwrap<TreeNode>(res)
}

export async function updateContextUrl(session: AuthSession, contextId: string, url: string): Promise<string> {
  const res = await apiFetch<ResponseObject<{ url: string }>>(
    session,
    `/contexts/${contextId}/url`,
    {
      method: 'POST',
      body: JSON.stringify({ url }),
    }
  )
  const payload = unwrap<{ url: string }>(res)
  if (!payload?.url) throw new Error('Invalid response (missing url)')
  return payload.url
}

