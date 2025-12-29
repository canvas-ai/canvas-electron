import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthLayout } from "@/components/auth/auth-layout"
import { loginUser, isAuthenticated, getAuthConfig } from "@/services/auth"
import { setApiUrl } from "@/config/api"

interface FormData {
  email: string
  password: string
  strategy: string
}

interface AuthConfig {
  strategies: {
    local: { enabled: boolean }
    imap: {
      enabled: boolean
      domains: Array<{
        domain: string
        name: string
        requireAppPassword: boolean
      }>
    }
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [errors, setErrors] = React.useState<Partial<FormData>>({})
  const [authConfig, setAuthConfig] = React.useState<AuthConfig | null>(null)
  const [serverUrl, setServerUrl] = React.useState<string>("")
  const [isConnecting, setIsConnecting] = React.useState<boolean>(false)
  const [isConnected, setIsConnected] = React.useState<boolean>(false)
  const [connectError, setConnectError] = React.useState<string>("")
  const [formData, setFormData] = React.useState<FormData>({
    email: "",
    password: "",
    strategy: "local",
  })

  function normalizeServerAndApiUrl(input: string): { serverUrl: string; apiUrl: string } {
    const raw = String(input || '').trim().replace(/\/+$/, '')
    if (!raw) return { serverUrl: '', apiUrl: '' }

    // If the user pasted an API URL already (…/rest/v2), keep it.
    const restIdx = raw.indexOf('/rest/')
    if (restIdx >= 0) {
      return { serverUrl: raw.slice(0, restIdx), apiUrl: raw }
    }
    if (raw.endsWith('/rest')) {
      return { serverUrl: raw.slice(0, -5), apiUrl: `${raw}/v2` }
    }
    if (raw.endsWith('/rest/v2')) {
      return { serverUrl: raw.slice(0, -8), apiUrl: raw }
    }
    return { serverUrl: raw, apiUrl: `${raw}/rest/v2` }
  }

  async function connect(nextServerUrl?: string) {
    setConnectError("")
    setIsConnecting(true)
    setIsConnected(false)
    setAuthConfig(null)

    try {
      const { serverUrl: normalizedServerUrl, apiUrl } = normalizeServerAndApiUrl(nextServerUrl ?? serverUrl)
      if (!normalizedServerUrl || !apiUrl) {
        throw new Error("Canvas server URL is required")
      }

      // Persist for subsequent requests (and for register page)
      localStorage.setItem('canvasServerUrl', normalizedServerUrl)
      setApiUrl(apiUrl)

      // Load authentication configuration (supported methods)
      const config = await getAuthConfig()
      setAuthConfig(config)
      setIsConnected(true)

      // Pick a sensible default strategy (first enabled)
      const strategies = config?.strategies || {}
      const preferred = (['local', 'imap', 'ldap'] as const).find((k) => strategies?.[k]?.enabled)
      setFormData(prev => ({ ...prev, strategy: preferred || 'local' }))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to connect'
      setConnectError(msg)
      setIsConnected(false)
    } finally {
      setIsConnecting(false)
    }
  }

  // Check if we're already logged in and try restoring previous server URL
  React.useEffect(() => {
    if (isAuthenticated()) {
      navigate('/workspaces');
    }

    ;(async () => {
      const session = await (window as any).electronAPI?.getAuthSession?.()
      const saved = session?.serverUrl || localStorage.getItem('canvasServerUrl') || ''
      if (saved) {
        setServerUrl(saved)
        // Auto-connect in desktop app for a smoother flow
        connect(saved)
      }
    })()
  }, [navigate]);

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {}

    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    if (!validateForm()) return
    if (!isConnected || !authConfig) {
      setErrors({ password: "Connect to a Canvas server first" })
      return
    }

    setIsLoading(true)
    try {
      console.log('Attempting login with:', formData.email, 'strategy:', formData.strategy);
      const response = await loginUser(formData.email, formData.password, formData.strategy);
      console.log('Login successful, received token:', !!response.payload?.token);

      // Clear any existing errors
      setErrors({})

      const { serverUrl: normalizedServerUrl, apiUrl } = normalizeServerAndApiUrl(serverUrl)
      const token = localStorage.getItem('authToken') || ''
      if (token) {
        await (window as any).electronAPI?.setAuthSession?.({
          serverUrl: normalizedServerUrl,
          apiUrl,
          token,
        })
      }

      // Navigate to home page
      navigate("/home")
    } catch (error) {
      console.error('Login error:', error);

      // Extract the most specific error message from the server response
      let errorMessage = "Login failed";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Handle API response error objects
        const apiError = error as any;
        if (apiError.message) {
          errorMessage = apiError.message;
        } else if (apiError.error) {
          errorMessage = apiError.error;
        } else if (apiError.payload?.message) {
          errorMessage = apiError.payload.message;
        }
      }

      setErrors({
        password: errorMessage
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Connect to Canvas</h1>
          <p className="text-sm text-muted-foreground">
            Choose your server, then sign in
          </p>
        </div>

        <form onSubmit={onSubmit}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="serverUrl">Canvas server URL</Label>
              <Input
                id="serverUrl"
                name="serverUrl"
                placeholder="https://your-canvas.example.com"
                type="url"
                disabled={isLoading || isConnecting}
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading || isConnecting || !serverUrl.trim()}
                  onClick={() => connect()}
                >
                  {isConnecting ? "Checking..." : (isConnected ? "Connected" : "Connect")}
                </Button>
                {connectError && <p className="text-sm text-red-500">{connectError}</p>}
              </div>
            </div>

            {authConfig && (
              <div className="grid gap-2">
                <Label htmlFor="strategy">Authentication method</Label>
                <select
                  id="strategy"
                  name="strategy"
                  value={formData.strategy}
                  onChange={handleInputChange}
                  disabled={isLoading || isConnecting || !isConnected}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {authConfig.strategies.local?.enabled && <option value="local">Local account</option>}
                  {authConfig.strategies.imap?.enabled && <option value="imap">Email (IMAP)</option>}
                  {authConfig.strategies.ldap?.enabled && <option value="ldap">LDAP</option>}
                </select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                placeholder="name@example.com"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={isLoading}
                value={formData.email}
                onChange={handleInputChange}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                disabled={isLoading}
                value={formData.password}
                onChange={handleInputChange}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <div className="flex flex-col space-y-4">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
              <Button
                variant="outline"
                type="button"
                disabled={isLoading}
                onClick={() => navigate("/register")}
              >
                Don't have an account? Sign up
              </Button>
            </div>
          </div>
        </form>
      </div>
    </AuthLayout>
  )
}
