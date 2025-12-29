import { API_ROUTES } from '@/config/api';
import { api } from '@/lib/api';
// GLOBAL Workspace type from src/types/api.d.ts will be used.
// No local Workspace interface should be defined here.

function emitWorkspacesChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('workspaces:changed'))
}

// listWorkspaces should return a Promise where Workspace is the global type.
export async function listWorkspaces(): Promise<Workspace[]> {
  try {
    // The API returns a ResponseObject with workspaces in the payload field
    const response = await api.get<{ payload: Workspace[]; message: string; status: string; statusCode: number }>(API_ROUTES.workspaces);

    // Ensure we always return an array even if the response structure is unexpected
    if (Array.isArray(response.payload)) {
      return response.payload;
    } else {
      console.warn('listWorkspaces: response.payload is not an array:', response.payload);
      return [];
    }
  } catch (error) {
    console.error('Failed to list workspaces:', error);
    throw error;
  }
}

// createWorkspace payload and response should align with the global Workspace type.
// Note: Global Workspace has owner, createdAt, updatedAt, status, type - some set by backend.
interface CreateWorkspacePayload {
    name: string;
    description?: string;
    color?: string;
    label?: string;
    type?: string; // This aligns with optional 'type' in global Workspace
}
export async function createWorkspace(payload: CreateWorkspacePayload): Promise<Workspace> {
  try {
    // The backend returns a ResponseObject with the workspace in the payload property
    const response = await api.post<{ payload: Workspace; message: string; status: string; statusCode: number }>(API_ROUTES.workspaces, payload);
    emitWorkspacesChanged()
    return response.payload;
  } catch (error) {
    console.error('Failed to create workspace:', error);
    throw error;
  }
}

export async function startWorkspace(id: string): Promise<Workspace> {
  try {
    const response = await api.post<{ payload: Workspace; message: string; status: string; statusCode: number }>(`${API_ROUTES.workspaces}/${id}/start`);
    emitWorkspacesChanged()
    return response.payload;
  } catch (error) {
    console.error('Failed to start workspace:', error);
    throw error;
  }
}

export async function stopWorkspace(id: string): Promise<Workspace> {
  try {
    const response = await api.post<{ payload: Workspace; message: string; status: string; statusCode: number }>(`${API_ROUTES.workspaces}/${id}/stop`);
    emitWorkspacesChanged()
    return response.payload;
  } catch (error) {
    console.error('Failed to stop workspace:', error);
    throw error;
  }
}

// openWorkspace and closeWorkspace should also operate with the global Workspace type.
export async function openWorkspace(id: string): Promise<Workspace> {
  try {
    const response = await api.post<{ payload: Workspace; message: string; status: string; statusCode: number }>(`${API_ROUTES.workspaces}/${id}/open`);
    return response.payload;
  } catch (error) {
    console.error(`Failed to open workspace ${id}:`, error);
    throw error;
  }
}

export async function closeWorkspace(id: string): Promise<Workspace> {
  try {
    const response = await api.post<{ payload: Workspace; message: string; status: string; statusCode: number }>(`${API_ROUTES.workspaces}/${id}/close`);
    return response.payload;
  } catch (error) {
    console.error('Failed to close workspace:', error);
    throw error;
  }
}

export async function removeWorkspace(id: string): Promise<Workspace> {
  try {
    const response = await api.delete<{ payload: Workspace; message: string; status: string; statusCode: number }>(`${API_ROUTES.workspaces}/${id}`);
    emitWorkspacesChanged()
    return response.payload;
  } catch (error) {
    console.error('Failed to remove workspace:', error);
    throw error;
  }
}



// Get workspace tree
export async function getWorkspaceTree(id: string): Promise<any> {
  try {
    return await api.get<any>(`${API_ROUTES.workspaces}/${id}/tree`);
  } catch (error) {
    console.error(`Failed to get workspace tree ${id}:`, error);
    throw error;
  }
}

// Get workspace documents
export async function getWorkspaceDocuments(
  id: string,
  contextSpec: string = '/',
  featureArray: string[] = [],
  options: { limit?: number; offset?: number; page?: number } = {}
): Promise<{ payload: import('@/types/workspace').Document[]; count?: number; totalCount?: number; status: string; statusCode: number; message: string }> {
  try {
    const params = new URLSearchParams();
    if (contextSpec !== '/') params.append('contextSpec', contextSpec);
    if (featureArray.length > 0) {
      featureArray.forEach(feature => params.append('featureArray', feature));
    }
    if (options.limit !== undefined) params.append('limit', options.limit.toString());
    if (options.offset !== undefined) params.append('offset', options.offset.toString());
    if (options.page !== undefined) params.append('page', options.page.toString());

    const queryString = params.toString();
    const url = `${API_ROUTES.workspaces}/${id}/documents${queryString ? '?' + queryString : ''}`;

    return await api.get<{ payload: import('@/types/workspace').Document[]; count?: number; totalCount?: number; status: string; statusCode: number; message: string }>(url);
  } catch (error) {
    console.error(`Failed to get workspace documents ${id}:`, error);
    throw error;
  }
}

export async function updateWorkspace(id: string, payload: Partial<CreateWorkspacePayload>): Promise<Workspace> {
  try {
    const response = await api.put<{ payload: Workspace; message: string; status: string; statusCode: number }>(`${API_ROUTES.workspaces}/${id}`, payload);
    emitWorkspacesChanged()
    return response.payload;
  } catch (error) {
    console.error('Failed to update workspace:', error);
    throw error;
  }
}

// Workspace tree operations
export async function insertWorkspacePath(workspaceId: string, path: string, autoCreateLayers: boolean = true): Promise<boolean> {
  try {
    const response = await api.post<{ payload: boolean; message: string; status: string; statusCode: number }>(
      `${API_ROUTES.workspaces}/${workspaceId}/tree/paths`,
      { path, autoCreateLayers }
    );
    return response.payload;
  } catch (error) {
    console.error(`Failed to insert workspace path ${path}:`, error);
    throw error;
  }
}

export async function removeWorkspacePath(workspaceId: string, path: string, recursive: boolean = false): Promise<boolean> {
  try {
    const params = new URLSearchParams({ path, recursive: recursive.toString() });
    const response = await api.delete<{ payload: boolean; message: string; status: string; statusCode: number }>(
      `${API_ROUTES.workspaces}/${workspaceId}/tree/paths?${params.toString()}`
    );
    return response.payload;
  } catch (error) {
    console.error(`Failed to remove workspace path ${path}:`, error);
    throw error;
  }
}

export async function moveWorkspacePath(workspaceId: string, fromPath: string, toPath: string, recursive: boolean = false): Promise<boolean> {
  try {
    const response = await api.post<{ payload: boolean; message: string; status: string; statusCode: number }>(
      `${API_ROUTES.workspaces}/${workspaceId}/tree/paths/move`,
      { from: fromPath, to: toPath, recursive }
    );
    return response.payload;
  } catch (error) {
    console.error(`Failed to move workspace path from ${fromPath} to ${toPath}:`, error);
    throw error;
  }
}

export async function copyWorkspacePath(workspaceId: string, fromPath: string, toPath: string, recursive: boolean = false): Promise<boolean> {
  try {
    const response = await api.post<{ payload: boolean; message: string; status: string; statusCode: number }>(
      `${API_ROUTES.workspaces}/${workspaceId}/tree/paths/copy`,
      { from: fromPath, to: toPath, recursive }
    );
    return response.payload;
  } catch (error) {
    console.error(`Failed to copy workspace path from ${fromPath} to ${toPath}:`, error);
    throw error;
  }
}

export async function mergeUpWorkspacePath(workspaceId: string, path: string): Promise<boolean> {
  try {
    const response = await api.post<{ payload: boolean; message: string; status: string; statusCode: number }>(
      `${API_ROUTES.workspaces}/${workspaceId}/tree/paths/merge-up`,
      { path }
    );
    return response.payload;
  } catch (error) {
    console.error(`Failed to merge up workspace path ${path}:`, error);
    throw error;
  }
}

export async function mergeDownWorkspacePath(workspaceId: string, path: string): Promise<boolean> {
  try {
    const response = await api.post<{ payload: boolean; message: string; status: string; statusCode: number }>(
      `${API_ROUTES.workspaces}/${workspaceId}/tree/paths/merge-down`,
      { path }
    );
    return response.payload;
  } catch (error) {
    console.error(`Failed to merge down workspace path ${path}:`, error);
    throw error;
  }
}

export async function subtractUpWorkspacePath(workspaceId: string, path: string): Promise<boolean> {
  try {
    const response = await api.post<{ payload: boolean; message: string; status: string; statusCode: number }>(
      `${API_ROUTES.workspaces}/${workspaceId}/tree/paths/subtract-up`,
      { path }
    );
    return response.payload;
  } catch (error) {
    console.error(`Failed to subtract up workspace path ${path}:`, error);
    throw error;
  }
}

export async function subtractDownWorkspacePath(workspaceId: string, path: string): Promise<boolean> {
  try {
    const response = await api.post<{ payload: boolean; message: string; status: string; statusCode: number }>(
      `${API_ROUTES.workspaces}/${workspaceId}/tree/paths/subtract-down`,
      { path }
    );
    return response.payload;
  } catch (error) {
    console.error(`Failed to subtract down workspace path ${path}:`, error);
    throw error;
  }
}

export async function pasteDocumentsToWorkspacePath(workspaceId: string, path: string, documentIds: number[]): Promise<boolean> {
  try {
    // This would use the document insertion API with the specified path
    const ids = normalizeDocumentIds(Array.isArray(documentIds) ? documentIds : [documentIds])
    await api.post<{ payload: any; message: string; status: string; statusCode: number }>(
      `${API_ROUTES.workspaces}/${workspaceId}/documents`,
      { documentIds: ids, contextSpec: path }
    );
    return true;
  } catch (error) {
    console.error(`Failed to paste documents to workspace path ${path}:`, error);
    throw error;
  }
}

export async function importDocumentsToWorkspacePath(workspaceId: string, path: string, documents: any[]): Promise<boolean> {
  try {
    // Import new documents to workspace at the specified path
    const docs = Array.isArray(documents) ? documents : [documents]
    await api.post<{ payload: any; message: string; status: string; statusCode: number }>(
      `${API_ROUTES.workspaces}/${workspaceId}/documents`,
      { documents: docs, contextSpec: path }
    );
    return true;
  } catch (error) {
    console.error(`Failed to import documents to workspace path ${path}:`, error);
    throw error;
  }
}

// Layers API
export interface Layer {
  id: string;
  type: string;
  name: string;
  label: string;
  description: string;
  color: string | null;
  locked?: boolean;
  lockedBy?: string[];
}

export async function listWorkspaceLayers(workspaceId: string): Promise<Layer[]> {
  const res = await api.get<{ payload: Layer[] }>(`${API_ROUTES.workspaces}/${workspaceId}/layers`)
  return res.payload || []
}

export async function getWorkspaceLayer(workspaceId: string, layerId: string): Promise<Layer> {
  const res = await api.get<{ payload: Layer }>(`${API_ROUTES.workspaces}/${workspaceId}/layers/${layerId}`)
  return res.payload
}

export async function renameWorkspaceLayer(workspaceId: string, layerId: string, newName: string): Promise<Layer> {
  const res = await api.patch<{ payload: Layer }>(`${API_ROUTES.workspaces}/${workspaceId}/layers/${layerId}`, { name: newName })
  return res.payload
}

export async function lockWorkspaceLayer(workspaceId: string, layerId: string, lockBy: string): Promise<boolean> {
  await api.post(`${API_ROUTES.workspaces}/${workspaceId}/layers/${layerId}/lock`, { lockBy })
  return true
}

export async function unlockWorkspaceLayer(workspaceId: string, layerId: string, lockBy: string): Promise<boolean> {
  await api.post(`${API_ROUTES.workspaces}/${workspaceId}/layers/${layerId}/unlock`, { lockBy })
  return true
}

export async function destroyWorkspaceLayer(workspaceId: string, layerId: string): Promise<boolean> {
  await api.delete(`${API_ROUTES.workspaces}/${workspaceId}/layers/${layerId}`)
  return true
}

// ─────────────────────────────────────────────────────────────────────────
// Workspace documents
// ─────────────────────────────────────────────────────────────────────────

function normalizeDocumentIds(documentIds: readonly (string | number)[]): number[] {
  const ids = documentIds.map((v) => (typeof v === 'number' ? v : Number(v)))
  if (ids.some((n) => !Number.isFinite(n))) {
    throw new Error(`Invalid document ID(s): expected numbers (or numeric strings), got ${JSON.stringify(documentIds)}`)
  }
  return ids
}

export async function removeWorkspaceDocuments(
  workspaceId: string,
  documentIds: readonly (string | number)[],
  contextSpec: string = '/',
  featureArray: string[] = []
): Promise<boolean> {
  const params = new URLSearchParams()
  if (contextSpec) params.append('contextSpec', contextSpec)
  featureArray.forEach(f => params.append('featureArray', f))
  const ids = normalizeDocumentIds(documentIds)
  await api.delete(`${API_ROUTES.workspaces}/${workspaceId}/documents/remove?${params.toString()}`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ids),
  })
  return true
}

export async function deleteWorkspaceDocuments(
  workspaceId: string,
  documentIds: readonly (string | number)[],
  contextSpec: string = '/',
  featureArray: string[] = []
): Promise<boolean> {
  const params = new URLSearchParams()
  if (contextSpec) params.append('contextSpec', contextSpec)
  featureArray.forEach(f => params.append('featureArray', f))
  const ids = normalizeDocumentIds(documentIds)
  await api.delete(`${API_ROUTES.workspaces}/${workspaceId}/documents?${params.toString()}`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ids),
  })
  return true
}

// ─────────────────────────────────────────────────────────────────────────
// Workspace Services API
// ─────────────────────────────────────────────────────────────────────────

export interface WorkspaceServiceStatus {
  enabled: boolean;
  initialized?: boolean;
  path?: string;
  transports?: string[];
}

export interface WorkspaceServicesStatus {
  dotfiles: WorkspaceServiceStatus;
  home: WorkspaceServiceStatus;
}

/**
 * Get status of all services for a workspace
 */
export async function getWorkspaceServicesStatus(workspaceId: string): Promise<WorkspaceServicesStatus> {
  try {
    const response = await api.get<{ payload: WorkspaceServicesStatus }>(`${API_ROUTES.workspaces}/${workspaceId}/services`);
    return response.payload;
  } catch (error) {
    console.error(`Failed to get workspace services status:`, error);
    throw error;
  }
}

/**
 * Enable a service for a workspace
 */
export async function enableWorkspaceService(
  workspaceId: string,
  serviceName: 'dotfiles' | 'home'
): Promise<{ success: boolean; path?: string }> {
  try {
    const response = await api.post<{ payload: { success: boolean; path?: string } }>(
      `${API_ROUTES.workspaces}/${workspaceId}/services/${serviceName}/enable`
    );
    return response.payload;
  } catch (error) {
    console.error(`Failed to enable ${serviceName} service:`, error);
    throw error;
  }
}

/**
 * Disable a service for a workspace
 */
export async function disableWorkspaceService(
  workspaceId: string,
  serviceName: 'dotfiles' | 'home'
): Promise<{ success: boolean }> {
  try {
    const response = await api.post<{ payload: { success: boolean } }>(
      `${API_ROUTES.workspaces}/${workspaceId}/services/${serviceName}/disable`
    );
    return response.payload;
  } catch (error) {
    console.error(`Failed to disable ${serviceName} service:`, error);
    throw error;
  }
}
