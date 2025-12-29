// Ported from server web UI hook: server/src/ui/web/src/hooks/useTreeOperations.ts
// Modified for Electron: uses AuthSession (dynamic apiUrl + IPC token), not localStorage/VITE_API_URL.
import { useCallback } from 'react'
import type { AuthSession } from '../../shared/types'

interface UseTreeOperationsProps {
  session: AuthSession
  contextId?: string
  workspaceId?: string
  onRefresh?: () => void
}

interface ApiResponse {
  status: number
  success: boolean
  data?: any
  message?: string
}

export function useTreeOperations({ session, contextId, workspaceId, onRefresh }: UseTreeOperationsProps) {
  const apiCall = useCallback(
    async (method: string, endpoint: string, body?: any): Promise<ApiResponse> => {
      try {
        if (!session?.token) throw new Error('Authentication token not found')

        const basePath = workspaceId
          ? `/workspaces/${workspaceId}/tree`
          : `/contexts/${contextId}/tree`

        const url = `${session.apiUrl}${basePath}${endpoint}`

        const response = await fetch(url, {
          method,
          headers: {
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            Authorization: `Bearer ${session.token}`,
          },
          body: body ? JSON.stringify(body) : undefined,
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.message || `HTTP error! status: ${response.status}`)
        }

        if (onRefresh && response.ok) {
          setTimeout(onRefresh, 100)
        }

        return {
          status: response.status,
          success: true,
          data: data.data,
          message: data.message,
        }
      } catch (error) {
        console.error(`API call failed for ${method} ${endpoint}:`, error)
        return {
          status: 500,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        }
      }
    },
    [contextId, workspaceId, onRefresh, session]
  )

  const insertPath = useCallback(
    async (path: string, autoCreateLayers: boolean = true): Promise<boolean> => {
      const result = await apiCall('POST', '/paths', { path, autoCreateLayers })
      if (!result.success) throw new Error(result.message || 'Failed to insert path')
      return true
    },
    [apiCall]
  )

  const removePath = useCallback(
    async (path: string, recursive: boolean = false): Promise<boolean> => {
      const result = await apiCall(
        'DELETE',
        `/paths?path=${encodeURIComponent(path)}&recursive=${recursive}`
      )
      if (!result.success) throw new Error(result.message || 'Failed to remove path')
      return true
    },
    [apiCall]
  )

  const movePath = useCallback(
    async (fromPath: string, toPath: string, recursive: boolean = false): Promise<boolean> => {
      const result = await apiCall('POST', '/paths/move', { from: fromPath, to: toPath, recursive })
      if (!result.success) throw new Error(result.message || 'Failed to move path')
      return true
    },
    [apiCall]
  )

  const copyPath = useCallback(
    async (fromPath: string, toPath: string, recursive: boolean = false): Promise<boolean> => {
      const result = await apiCall('POST', '/paths/copy', { from: fromPath, to: toPath, recursive })
      if (!result.success) throw new Error(result.message || 'Failed to copy path')
      return true
    },
    [apiCall]
  )

  const mergeUp = useCallback(
    async (path: string): Promise<boolean> => {
      const result = await apiCall('POST', '/paths/merge-up', { path })
      if (!result.success) throw new Error(result.message || 'Failed to merge up')
      return true
    },
    [apiCall]
  )

  const mergeDown = useCallback(
    async (path: string): Promise<boolean> => {
      const result = await apiCall('POST', '/paths/merge-down', { path })
      if (!result.success) throw new Error(result.message || 'Failed to merge down')
      return true
    },
    [apiCall]
  )

  const subtractUp = useCallback(
    async (path: string): Promise<boolean> => {
      const result = await apiCall('POST', '/paths/subtract-up', { path })
      if (!result.success) throw new Error(result.message || 'Failed to subtract up')
      return true
    },
    [apiCall]
  )

  const subtractDown = useCallback(
    async (path: string): Promise<boolean> => {
      const result = await apiCall('POST', '/paths/subtract-down', { path })
      if (!result.success) throw new Error(result.message || 'Failed to subtract down')
      return true
    },
    [apiCall]
  )

  const mergeLayer = useCallback(
    async (layerId: string, targetLayers: string[]): Promise<any> => {
      const result = await apiCall('POST', '/layers/merge', { layerId, targetLayers })
      if (!result.success) throw new Error(result.message || 'Failed to merge layer')
      return result.data
    },
    [apiCall]
  )

  const subtractLayer = useCallback(
    async (layerId: string, targetLayers: string[]): Promise<any> => {
      const result = await apiCall('POST', '/layers/subtract', { layerId, targetLayers })
      if (!result.success) throw new Error(result.message || 'Failed to subtract layer')
      return result.data
    },
    [apiCall]
  )

  return {
    insertPath,
    removePath,
    movePath,
    copyPath,
    mergeUp,
    mergeDown,
    subtractUp,
    subtractDown,
    mergeLayer,
    subtractLayer,
  }
}

