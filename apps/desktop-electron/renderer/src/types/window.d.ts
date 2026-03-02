type AuthConfig = {
  serverUrl: string
  token: string
  email?: string
}

type MenuState = {
  view?: 'workspaces' | 'contexts' | 'tree'
  workspaceId?: string
  workspaceName?: string
  contextId?: string
  contextMode?: 'bound' | 'explorer'
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
      onAuthChanged: (handler: () => void) => () => void
      getMenuState: () => Promise<MenuState | null>
      setMenuState: (state: MenuState) => Promise<void>
      getGridOffset: () => Promise<{ x: number; y: number }>
      setGridOffset: (offset: { x: number; y: number }) => Promise<void>
      wsSubscribe: (channel: string) => Promise<void>
      wsUnsubscribe: (channel: string) => Promise<void>
      onWsEvent: (handler: (event: string, payload: unknown) => void) => () => void
    }
  }
}

export {}
