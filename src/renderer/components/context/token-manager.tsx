import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast-container'
import { Plus, Copy, Trash2, Eye, EyeOff, Check } from 'lucide-react'
import { api } from '@/lib/api'

interface ContextToken {
  tokenHash: string
  permissions: ('documentRead' | 'documentWrite' | 'documentReadWrite')[]
  description: string
  createdAt: string
  expiresAt: string | null
  type?: 'standard' | 'secret-link'
  maxUses?: number
  currentUses?: number
}

interface ContextTokenManagerProps {
  contextId: string
}

export function ContextTokenManager({ contextId }: ContextTokenManagerProps) {
  const [tokens, setTokens] = useState<ContextToken[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newTokenDescription, setNewTokenDescription] = useState('')
  const [newTokenPermissions, setNewTokenPermissions] = useState<('documentRead' | 'documentWrite' | 'documentReadWrite')[]>(['documentRead'])
  const [newTokenExpiry, setNewTokenExpiry] = useState('')
  const [neverExpires, setNeverExpires] = useState(true)
  const [showNewTokenForm, setShowNewTokenForm] = useState(false)
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set())
  const [newTokenValue, setNewTokenValue] = useState('')
  const [copiedNewToken, setCopiedNewToken] = useState(false)
  const [linkType, setLinkType] = useState<'standard' | 'secret-link'>('standard')
  const [maxUses, setMaxUses] = useState<number | ''>('')
  const { showToast } = useToast()

  useEffect(() => {
    loadTokens()
  }, [contextId])

  const loadTokens = async () => {
    try {
      setIsLoading(true)
      const response = await api.get<{ payload: ContextToken[] }>(`/contexts/${contextId}/tokens`)
      setTokens(response.payload || [])
    } catch (error) {
      showToast({ title: 'Error', description: 'Failed to load context tokens', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const createToken = async () => {
    if (!newTokenDescription.trim()) {
      showToast({ title: 'Error', description: 'Token description is required', variant: 'destructive' })
      return
    }

    try {
      setIsCreating(true)

      let expiresAt = null as string | null
      if (!neverExpires && newTokenExpiry) {
        const date = new Date(newTokenExpiry)
        date.setHours(23, 59, 59, 999)
        expiresAt = date.toISOString()
      }

      const payload: any = {
        description: newTokenDescription,
        permissions: newTokenPermissions,
        expiresAt,
        type: linkType,
      }
      if (linkType === 'secret-link' && typeof maxUses === 'number') {
        payload.maxUses = maxUses
      }

      const response = await api.post<{ payload: { token: string; tokenHash: string } }>(`/contexts/${contextId}/tokens`, payload)

      if (response.payload && response.payload.token) {
        setNewTokenValue(response.payload.token)
      }

      setNewTokenDescription('')
      setNewTokenPermissions(['documentRead'])
      setNewTokenExpiry('')
      setNeverExpires(true)
      setLinkType('standard')
      setMaxUses('')
      setShowNewTokenForm(false)

      await loadTokens()

      showToast({ title: 'Success', description: 'Context sharing token created successfully' })
    } catch (error) {
      showToast({ title: 'Error', description: 'Failed to create token', variant: 'destructive' })
    } finally {
      setIsCreating(false)
    }
  }

  const revokeToken = async (tokenHash: string) => {
    try {
      await api.delete(`/contexts/${contextId}/tokens/${tokenHash}`)
      showToast({ title: 'Success', description: 'Token revoked successfully' })
      await loadTokens()
    } catch (error) {
      showToast({ title: 'Error', description: 'Failed to revoke token', variant: 'destructive' })
    }
  }

  const toggleTokenVisibility = (tokenHash: string) => {
    const s = new Set(visibleTokens)
    s.has(tokenHash) ? s.delete(tokenHash) : s.add(tokenHash)
    setVisibleTokens(s)
  }

  const formatTokenHash = (hash: string) => (visibleTokens.has(hash) ? hash : `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast({ title: 'Copied', description: 'Token hash copied to clipboard' })
    } catch {
      showToast({ title: 'Error', description: 'Failed to copy to clipboard', variant: 'destructive' })
    }
  }

  const copyNewTokenToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(newTokenValue)
      setCopiedNewToken(true)
      showToast({ title: 'Success', description: 'Token copied to clipboard' })
      setTimeout(() => setCopiedNewToken(false), 2000)
    } catch {
      showToast({ title: 'Error', description: 'Failed to copy token to clipboard', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Context Sharing Tokens</h3>
        <Button onClick={() => setShowNewTokenForm(!showNewTokenForm)} size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Create Token
        </Button>
      </div>

      {showNewTokenForm && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
          <Input placeholder="Token description" value={newTokenDescription} onChange={(e) => setNewTokenDescription(e.target.value)} />

          <div>
            <label className="text-sm font-medium mb-2 block">Permissions</label>
            <div className="flex gap-2 flex-wrap">
              {['documentRead', 'documentWrite', 'documentReadWrite'].map((permission) => (
                <label key={permission} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newTokenPermissions.includes(permission as any)}
                    onChange={(e) => {
                      if (e.target.checked) setNewTokenPermissions([...newTokenPermissions, permission as any])
                      else setNewTokenPermissions(newTokenPermissions.filter((p) => p !== permission))
                    }}
                  />
                  <span className="text-sm">{permission}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium mb-2 block">Link Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" checked={linkType === 'standard'} onChange={() => setLinkType('standard')} />
                <span className="text-sm">Standard</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={linkType === 'secret-link'} onChange={() => setLinkType('secret-link')} />
                <span className="text-sm">Secret link</span>
              </label>
            </div>
            {linkType === 'secret-link' && (
              <div className="flex items-center gap-2">
                <span className="text-sm">Max uses</span>
                <Input
                  type="number"
                  min={1}
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-28"
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Token Expiry</label>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={neverExpires}
                  onChange={(e) => {
                    setNeverExpires(e.target.checked)
                    if (e.target.checked) setNewTokenExpiry('')
                  }}
                />
                <span className="text-sm">Never expires</span>
              </label>
              {!neverExpires && (
                <Input type="date" placeholder="Expiry date" value={newTokenExpiry} onChange={(e) => setNewTokenExpiry(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={createToken} disabled={isCreating}>Create Token</Button>
            <Button variant="outline" onClick={() => setShowNewTokenForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {newTokenValue && (
        <div className="p-4 border rounded-md bg-muted/50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Your New Context Sharing Token</h3>
            <Button variant="outline" size="sm" onClick={copyNewTokenToClipboard}>
              {copiedNewToken ? (<><Check className="mr-2 h-4 w-4" />Copied</>) : (<><Copy className="mr-2 h-4 w-4" />Copy</>)}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-2">Copy your token now. You won't be able to see it again.</p>
          <div className="p-2 bg-background border rounded font-mono text-sm break-all">{newTokenValue}</div>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setNewTokenValue('')}>Dismiss</Button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading tokens...</p>
        </div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No sharing tokens created yet.</p>
          <p className="text-sm">Create a token to share this context.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map((token) => (
            <div key={token.tokenHash} className="border rounded-lg p-3 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{token.description}</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded">{token.permissions.join(', ')}</span>
                  {token.type === 'secret-link' && (
                    <span className="text-xs bg-yellow-100 text-yellow-900 px-2 py-1 rounded">secret</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{formatTokenHash(token.tokenHash)}</span>
                  <Button size="sm" variant="ghost" onClick={() => toggleTokenVisibility(token.tokenHash)}>
                    {visibleTokens.has(token.tokenHash) ? (<EyeOff className="h-3 w-3" />) : (<Eye className="h-3 w-3" />)}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => copyToClipboard(token.tokenHash)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(token.createdAt).toLocaleDateString()}
                  {token.expiresAt ? (<span> • Expires: {new Date(token.expiresAt).toLocaleDateString()}</span>) : (<span> • Never expires</span>)}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => revokeToken(token.tokenHash)} className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


