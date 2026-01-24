import { useMemo, useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { cn } from '../../lib/utils'

type AuthMode = 'password' | 'token'

export type AuthFormData = {
  serverUrl: string
  email?: string
  password?: string
  token?: string
  mode: AuthMode
}

type AuthPanelProps = {
  defaultServerUrl?: string
  defaultEmail?: string
  busy?: boolean
  error?: string | null
  status?: string | null
  onTestConnection: (data: AuthFormData) => Promise<void>
  onLogin: (data: AuthFormData) => Promise<void>
  className?: string
}

export function AuthPanel({
  defaultServerUrl = '',
  defaultEmail = '',
  busy = false,
  error,
  status,
  onTestConnection,
  onLogin,
  className,
}: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>('password')
  const [serverUrl, setServerUrl] = useState(defaultServerUrl)
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')

  const normalizeUrl = (url: string) => {
    const trimmed = url.trim()
    if (!trimmed) return trimmed
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`
    }
    return trimmed
  }

  const formData = useMemo<AuthFormData>(() => ({
    serverUrl: normalizeUrl(serverUrl),
    email,
    password,
    token,
    mode,
  }), [serverUrl, email, password, token, mode])

  return (
    <form
      className={cn("flex h-full w-full flex-col justify-center gap-6 p-10", className)}
      onSubmit={(event) => {
        event.preventDefault()
        if (busy) return
        onLogin(formData)
      }}
    >
      <div className="space-y-2">
        <div className="text-3xl font-semibold">Welcome back</div>
        <div className="text-sm text-muted-foreground">
          Enter your credentials to access your account
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Canvas server URL</label>
          <Input
            value={serverUrl}
            onChange={(event) => setServerUrl(event.target.value)}
            onBlur={() => {
              const normalized = normalizeUrl(serverUrl)
              if (normalized !== serverUrl) setServerUrl(normalized)
            }}
            placeholder="canvas.example.com"
          />
          <div className="text-xs text-muted-foreground">
            https:// is added automatically if no protocol specified
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === 'password' ? 'default' : 'outline'}
            onClick={() => setMode('password')}
            className="flex-1"
          >
            User + Pass
          </Button>
          <Button
            type="button"
            variant={mode === 'token' ? 'default' : 'outline'}
            onClick={() => setMode('token')}
            className="flex-1"
          >
            App Token
          </Button>
        </div>

        {mode === 'password' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                type="password"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">Application token</label>
            <Input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="paste token"
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onTestConnection(formData)}
            className="flex-1"
          >
            Test connection
          </Button>
          <Button
            type="submit"
            disabled={busy}
            className="flex-1"
          >
            Login
          </Button>
        </div>

        {status && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {status}
          </div>
        )}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    </form>
  )
}
