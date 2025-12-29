import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast-container';
import { Plus, Copy, Trash2, Eye, EyeOff, Check } from 'lucide-react';
import { api } from '@/lib/api';

interface Token {
  tokenHash: string;
  permissions: ('read' | 'write' | 'admin')[];
  description: string;
  createdAt: string;
  expiresAt: string | null;
}

interface TokenManagerProps {
  workspaceId: string;
}

export function TokenManager({ workspaceId }: TokenManagerProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTokenDescription, setNewTokenDescription] = useState('');
  const [newTokenPermissions, setNewTokenPermissions] = useState<('read' | 'write' | 'admin')[]>(['read']);
  const [newTokenExpiry, setNewTokenExpiry] = useState('');
  const [neverExpires, setNeverExpires] = useState(true);
  const [showNewTokenForm, setShowNewTokenForm] = useState(false);
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set());
  const [newTokenValue, setNewTokenValue] = useState('');
  const [copiedNewToken, setCopiedNewToken] = useState(false);
  const { showToast } = useToast();

  // Load existing tokens
  useEffect(() => {
    loadTokens();
  }, [workspaceId]);

  const loadTokens = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ payload: Token[] }>(`/workspaces/${workspaceId}/tokens`);
      setTokens(response.payload || []);
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to load workspace tokens',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createToken = async () => {
    if (!newTokenDescription.trim()) {
      showToast({
        title: 'Error',
        description: 'Token description is required',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsCreating(true);

      // Format expiry date properly
      let expiresAt = null;
      if (!neverExpires && newTokenExpiry) {
        // Convert date to ISO string with time set to end of day
        const date = new Date(newTokenExpiry);
        date.setHours(23, 59, 59, 999); // Set to end of day
        expiresAt = date.toISOString();
      }

      const payload = {
        description: newTokenDescription,
        permissions: newTokenPermissions,
        expiresAt
      };

      const response = await api.post<{ payload: { token: string; tokenHash: string } }>(`/workspaces/${workspaceId}/tokens`, payload);

      // Store the new token value to display in UI
      if (response.payload && response.payload.token) {
        setNewTokenValue(response.payload.token);
      }

      // Reset form
      setNewTokenDescription('');
      setNewTokenPermissions(['read']);
      setNewTokenExpiry('');
      setNeverExpires(true);
      setShowNewTokenForm(false);

      // Reload tokens
      await loadTokens();

      showToast({
        title: 'Success',
        description: 'Workspace sharing token created successfully',
        variant: 'default'
      });
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to create token',
        variant: 'destructive'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const revokeToken = async (tokenHash: string) => {
    try {
      await api.delete(`/workspaces/${workspaceId}/tokens/${tokenHash}`);
      showToast({
        title: 'Success',
        description: 'Token revoked successfully'
      });
      await loadTokens();
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to revoke token',
        variant: 'destructive'
      });
    }
  };

  const toggleTokenVisibility = (tokenHash: string) => {
    const newVisible = new Set(visibleTokens);
    if (newVisible.has(tokenHash)) {
      newVisible.delete(tokenHash);
    } else {
      newVisible.add(tokenHash);
    }
    setVisibleTokens(newVisible);
  };

  const formatTokenHash = (hash: string) => {
    if (visibleTokens.has(hash)) {
      return hash;
    }
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast({
        title: 'Copied',
        description: 'Token hash copied to clipboard'
      });
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive'
      });
    }
  };

  const copyNewTokenToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(newTokenValue);
      setCopiedNewToken(true);
      showToast({
        title: 'Success',
        description: 'Token copied to clipboard'
      });
      setTimeout(() => setCopiedNewToken(false), 2000);
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to copy token to clipboard',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Workspace Sharing Tokens</h3>
        <Button
          onClick={() => setShowNewTokenForm(!showNewTokenForm)}
          size="sm"
          variant="outline"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Token
        </Button>
      </div>

      {showNewTokenForm && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
          <Input
            placeholder="Token description (e.g., 'John's laptop')"
            value={newTokenDescription}
            onChange={(e) => setNewTokenDescription(e.target.value)}
          />

          <div>
            <label className="text-sm font-medium mb-2 block">Permissions</label>
            <div className="flex gap-2 flex-wrap">
              {['read', 'write', 'admin'].map((permission) => (
                <label key={permission} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newTokenPermissions.includes(permission as any)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewTokenPermissions([...newTokenPermissions, permission as any]);
                      } else {
                        setNewTokenPermissions(newTokenPermissions.filter(p => p !== permission));
                      }
                    }}
                  />
                  <span className="text-sm">{permission}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Token Expiry</label>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={neverExpires}
                  onChange={(e) => {
                    setNeverExpires(e.target.checked);
                    if (e.target.checked) {
                      setNewTokenExpiry('');
                    }
                  }}
                />
                <span className="text-sm">Never expires</span>
              </label>

              {!neverExpires && (
                <Input
                  type="date"
                  placeholder="Expiry date"
                  value={newTokenExpiry}
                  onChange={(e) => setNewTokenExpiry(e.target.value)}
                  min={new Date().toISOString().split('T')[0]} // Don't allow past dates
                />
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={createToken} disabled={isCreating}>
              Create Token
            </Button>
            <Button variant="outline" onClick={() => setShowNewTokenForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {newTokenValue && (
        <div className="p-4 border rounded-md bg-muted/50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Your New Workspace Sharing Token</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={copyNewTokenToClipboard}
            >
              {copiedNewToken ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Make sure to copy your workspace sharing token now. You won't be able to see it again!
          </p>
          <div
            className="p-2 bg-background border rounded font-mono text-sm break-all outline-none focus:ring-2 focus:ring-ring"
          >
            {newTokenValue}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => setNewTokenValue('')}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Email-based shares (local users only) */}
      <WorkspaceEmailShares workspaceId={workspaceId} />

      {isLoading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading tokens...</p>
        </div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No sharing tokens created yet.</p>
          <p className="text-sm">Create a token to share this workspace with others.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map((token) => (
            <div key={token.tokenHash} className="border rounded-lg p-3 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{token.description}</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded">
                    {token.permissions.join(', ')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">
                    {formatTokenHash(token.tokenHash)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleTokenVisibility(token.tokenHash)}
                  >
                    {visibleTokens.has(token.tokenHash) ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(token.tokenHash)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(token.createdAt).toLocaleDateString()}
                  {token.expiresAt ? (
                    <span> • Expires: {new Date(token.expiresAt).toLocaleDateString()}</span>
                  ) : (
                    <span> • Never expires</span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => revokeToken(token.tokenHash)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkspaceEmailShares({ workspaceId }: { workspaceId: string }) {
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [permissions, setPermissions] = useState<('read' | 'write' | 'admin')[]>(['read'])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shares, setShares] = useState<Array<{ userEmail: string; permissions: string[]; description?: string; grantedAt?: string }>>([])

  const loadShares = async () => {
    try {
      const res = await api.get<{ payload: typeof shares }>(`/workspaces/${workspaceId}/shares`)
      setShares(res.payload || [])
    } catch (e) {
      // silent
    }
  }

  useEffect(() => { loadShares() }, [workspaceId])

  const addShare = async () => {
    if (!email.trim()) return
    try {
      setIsSubmitting(true)
      await api.post(`/workspaces/${workspaceId}/shares`, { userEmail: email.trim(), permissions })
      setEmail('')
      setPermissions(['read'])
      await loadShares()
      showToast({ title: 'Success', description: 'Access granted' })
    } catch (err) {
      showToast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to grant access', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const revokeShare = async (userEmail: string) => {
    try {
      await api.delete(`/workspaces/${workspaceId}/shares/${encodeURIComponent(userEmail)}`)
      await loadShares()
      showToast({ title: 'Success', description: 'Access revoked' })
    } catch (err) {
      showToast({ title: 'Error', description: err instanceof Error ? err.message : 'Failed to revoke', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium">Email-based Shares</h4>
      <div className="flex gap-2 flex-wrap items-center">
        <Input placeholder="user@local.server" value={email} onChange={(e) => setEmail(e.target.value)} className="max-w-xs" />
        <div className="flex gap-2">
          {['read','write','admin'].map(p => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={permissions.includes(p as any)} onChange={(e) => {
                if (e.target.checked) setPermissions([...permissions, p as any])
                else setPermissions(permissions.filter(x => x !== (p as any)))
              }} />
              {p}
            </label>
          ))}
        </div>
        <Button size="sm" onClick={addShare} disabled={isSubmitting}>Add</Button>
      </div>

      {shares.length > 0 && (
        <div className="space-y-2">
          {shares.map((s) => (
            <div key={s.userEmail} className="flex items-center justify-between border rounded p-2">
              <div className="text-sm">
                <div className="font-medium">{s.userEmail}</div>
                <div className="text-xs text-muted-foreground">{s.permissions.join(', ')}{s.grantedAt ? ` • ${new Date(s.grantedAt).toLocaleDateString()}` : ''}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => revokeShare(s.userEmail)} className="text-destructive hover:text-destructive">Revoke</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
