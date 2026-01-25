type AuthConfig = {
  serverUrl: string
  token: string
  email?: string
}

declare global {
  interface Window {
    canvas?: {
      getAuthConfig: () => Promise<AuthConfig | null>
      setAuthConfig: (auth: AuthConfig) => Promise<void>
      clearAuthConfig: () => Promise<void>
      getContextSelection: () => Promise<{ selectedId?: string; selectedUrl?: string } | null>
      setContextSelection: (selection: { selectedId?: string; selectedUrl?: string }) => Promise<void>
      clearContextSelection: () => Promise<void>
      onLauncherFocusInput: (handler: () => void) => () => void
    }
  }
}

export {}
