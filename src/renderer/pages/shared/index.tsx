import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast-container'

export default function SharedViewerPage() {
  const location = useLocation()
  const { showToast } = useToast()
  const params = new URLSearchParams(location.search)
  const normalizeResourceUrl = (input: string) => {
    try {
      const u = new URL(input)
      if (u.pathname.includes('/rest/v2/workspaces/') && !u.pathname.includes('/rest/v2/pub/')) {
        u.pathname = u.pathname.replace('/rest/v2/workspaces/', '/rest/v2/pub/workspaces/')
      } else if (u.pathname.includes('/rest/v2/contexts/') && !u.pathname.includes('/rest/v2/pub/')) {
        u.pathname = u.pathname.replace('/rest/v2/contexts/', '/rest/v2/pub/contexts/')
      }
      return u.toString()
    } catch {
      return input
    }
  }

  const initialUrlRaw = params.get('url') || ''
  const initialUrl = normalizeResourceUrl(initialUrlRaw)
  const initialToken = params.get('token') || ''

  const [resourceUrl, setResourceUrl] = useState(initialUrl)
  const [token, setToken] = useState(initialToken)
  const [meta, setMeta] = useState<any>(null)
  const [documents, setDocuments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const kind = useMemo(() => {
    try {
      const u = new URL(resourceUrl)
      if (u.pathname.includes('/pub/workspaces/')) return 'workspace'
      if (u.pathname.includes('/pub/contexts/')) return 'context'
      return 'unknown'
    } catch { return 'unknown' }
  }, [resourceUrl])

  const buildWithToken = (base: string) => {
    const hasQuery = base.includes('?')
    return `${base}${hasQuery ? '&' : '?'}token=${encodeURIComponent(token)}`
  }

  const load = async () => {
    if (!resourceUrl || !token) return
    setIsLoading(true)
    try {
      const normalized = normalizeResourceUrl(resourceUrl)
      // Fetch meta
      const metaResp = await api.get<any>(buildWithToken(normalized), { skipAuth: true })
      setMeta(metaResp.payload || metaResp)
      // Fetch documents
      const docsResp = await api.get<any>(buildWithToken(`${normalized}/documents`), { skipAuth: true })
      const list = (docsResp.payload && Array.isArray(docsResp.payload.data)) ? docsResp.payload.data : (Array.isArray(docsResp.payload) ? docsResp.payload : docsResp.data || [])
      setDocuments(Array.isArray(list) ? list : [])
    } catch (err) {
      const hint = resourceUrl.includes('/rest/v2/workspaces/') ? 'Ensure the URL uses /rest/v2/pub/workspaces/<workspace-id> and the token matches that workspace.' : resourceUrl.includes('/rest/v2/contexts/') ? 'Ensure the URL uses /rest/v2/pub/contexts/<context-id>.' : undefined
      showToast({ title: 'Error', description: `${err instanceof Error ? err.message : 'Failed to load shared resource'}${hint ? ` — ${hint}` : ''}`, variant: 'destructive' })
      setMeta(null)
      setDocuments([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { if (resourceUrl && token) load() }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Shared Resource Viewer</h1>
      <div className="grid gap-2 md:grid-cols-3">
        <Input value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} placeholder="Full pub URL" />
        <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Access token (canvas-...)" />
        <Button onClick={load} disabled={isLoading || !resourceUrl || !token}>Load</Button>
      </div>

      <div className="text-sm text-muted-foreground">Type: {kind}</div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="border rounded p-3">
            <h2 className="font-semibold mb-2">Metadata</h2>
            <pre className="text-xs overflow-auto max-h-80">{JSON.stringify(meta, null, 2)}</pre>
          </div>
          <div className="border rounded p-3">
            <h2 className="font-semibold mb-2">Documents ({documents.length})</h2>
            {documents.length === 0 ? (
              <div className="text-sm text-muted-foreground">No documents</div>
            ) : (
              <ul className="space-y-2 text-sm">
                {documents.slice(0, 100).map((d, i) => (
                  <li key={i} className="border rounded p-2">
                    <div className="font-mono text-xs">{d.id}</div>
                    <div className="text-xs text-muted-foreground">{d.schema}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


