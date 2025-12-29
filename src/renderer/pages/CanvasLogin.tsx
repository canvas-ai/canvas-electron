import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AuthSession } from '../../shared/types'
import { CanvasShell } from './CanvasShell'

type AuthConfig = {
  strategies?: {
    local?: { enabled?: boolean; passwordPolicy?: any }
    imap?: { enabled?: boolean; domains?: Array<{ domain: string; name: string; requireAppPassword: boolean }> }
  }
}

function normalizeApiUrl(serverUrl: string): { serverUrl: string; apiUrl: string } {
  const trimmed = serverUrl.trim().replace(/\/+$/, '')
  if (!trimmed) return { serverUrl: '', apiUrl: '' }
  if (trimmed.includes('/rest/')) return { serverUrl: trimmed, apiUrl: trimmed }
  if (trimmed.endsWith('/rest')) return { serverUrl: trimmed, apiUrl: `${trimmed}/v2` }
  return { serverUrl: trimmed, apiUrl: `${trimmed}/rest/v2` }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data as T
}

export function CanvasLogin() {
  const [serverUrl, setServerUrl] = React.useState('http://localhost:8001')
  const [apiUrl, setApiUrl] = React.useState('')
  const [step, setStep] = React.useState<'pick' | 'login' | 'register'>('pick')
  const [authConfig, setAuthConfig] = React.useState<AuthConfig | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [session, setSession] = React.useState<AuthSession | null>(null)

  const [strategy, setStrategy] = React.useState<'auto' | 'local' | 'imap'>('auto')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [name, setName] = React.useState('')

  React.useEffect(() => {
    ;(async () => {
      const existing = await window.electronAPI.getAuthSession()
      if (!existing?.token) return
      setServerUrl(existing.serverUrl)
      setApiUrl(existing.apiUrl)
      setSession(existing)
    })()
  }, [])

  const begin = async (next: 'login' | 'register') => {
    setError(null)
    const norm = normalizeApiUrl(serverUrl)
    if (!norm.apiUrl) return setError('Please enter a Canvas server URL.')
    setApiUrl(norm.apiUrl)

    setIsLoading(true)
    try {
      const conf = await fetchJson<any>(`${norm.apiUrl}/auth/config`)
      setAuthConfig(conf?.payload ?? conf)
      setStep(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load auth config')
    } finally {
      setIsLoading(false)
    }
  }

  const doLogin = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const resp = await fetchJson<any>(`${apiUrl}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password, strategy }),
      })
      const payload = resp?.payload ?? resp
      const token = payload?.token ?? payload?.payload?.token
      if (!token) throw new Error('Invalid login response (missing token)')

      const norm = normalizeApiUrl(serverUrl)
      const session: AuthSession = { serverUrl: norm.serverUrl, apiUrl: norm.apiUrl, token }
      await window.electronAPI.setAuthSession(session)
      setSession(session)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const doRegister = async () => {
    setError(null)
    setIsLoading(true)
    try {
      await fetchJson<any>(`${apiUrl}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      })
      setStep('login')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  const showStrategyPicker =
    !!authConfig?.strategies?.imap?.enabled && (authConfig?.strategies?.imap?.domains?.length ?? 0) > 0

  if (session?.token) {
    return (
      <CanvasShell
        session={session}
        onLogout={async () => {
          await window.electronAPI.clearAuthSession()
          setSession(null)
          setStep('pick')
        }}
      />
    )
  }

  return (
    <div className="h-screen w-screen bg-background text-foreground flex items-center justify-center">
      <div className="w-full max-w-lg p-8">
        <div className="mb-6">
          <div className="text-2xl font-semibold">Canvas</div>
          <div className="text-sm text-muted-foreground">Connect to your Canvas server</div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="serverUrl">Canvas server URL</Label>
            <Input
              id="serverUrl"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:8001"
              disabled={isLoading || step === 'done'}
            />
            {apiUrl && step !== 'done' && (
              <div className="text-xs text-muted-foreground">API: {apiUrl}</div>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Run Canvas Server locally</Label>
            <Button variant="outline" disabled>
              Run locally (soon™)
            </Button>
          </div>

          {step === 'pick' && (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => begin('login')} disabled={isLoading}>
                Login
              </Button>
              <Button className="flex-1" variant="outline" onClick={() => begin('register')} disabled={isLoading}>
                Register
              </Button>
            </div>
          )}

          {(step === 'login' || step === 'register') && (
            <div className="space-y-3">
              {step === 'register' && (
                <div className="grid gap-2">
                  <Label htmlFor="name">Username</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} />
                </div>
              )}

              {showStrategyPicker && step === 'login' && (
                <div className="grid gap-2">
                  <Label htmlFor="strategy">Authentication method</Label>
                  <select
                    id="strategy"
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value as any)}
                    disabled={isLoading}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="local">Local Account</option>
                    <option value="imap">Email Server (IMAP)</option>
                  </select>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep('pick')} disabled={isLoading}>
                  Back
                </Button>
                {step === 'login' ? (
                  <Button className="flex-1" onClick={doLogin} disabled={isLoading}>
                    {isLoading ? 'Logging in…' : 'Login'}
                  </Button>
                ) : (
                  <Button className="flex-1" onClick={doRegister} disabled={isLoading}>
                    {isLoading ? 'Registering…' : 'Register'}
                  </Button>
                )}
              </div>
            </div>
          )}

          {error && <div className="text-sm text-red-500">{error}</div>}
        </div>
      </div>
    </div>
  )
}

