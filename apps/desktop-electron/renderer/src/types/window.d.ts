type AuthConfig = {
  serverUrl: string
  token: string
  email?: string
}

type SetupState = {
  required: boolean
  resetRequested: boolean
  hasUiConfig: boolean
  completedAt?: string
}

type SetupRemote = {
  id: string
  serverUrl: string
  serverFqdn: string
  user: string
  email?: string
  auth: {
    type: 'password' | 'token'
    token: string
  }
  selectedDeviceId?: string
  deviceToken?: string
  createdAt: string
  updatedAt: string
}

type SetupDeviceConfig = {
  machineId: string
  name: string
  description?: string
  remotes: Record<string, {
    deviceId: string
    deviceToken?: string
    updatedAt: string
  }>
}

type MenuState = {
  view?: 'workspaces' | 'contexts' | 'tree'
  workspaceId?: string
  workspaceName?: string
  contextId?: string
  contextMode?: 'bound' | 'explorer'
}

type MenuShellStage = 'collapsed' | 'tree' | 'mainMenu'

type ToolboxMode = 'dot' | 'ruler' | 'toolbox' | 'extended'

declare global {
  interface Window {
    canvas?: {
      getAuthConfig: () => Promise<AuthConfig | null>
      setAuthConfig: (auth: AuthConfig) => Promise<void>
      clearAuthConfig: () => Promise<void>
      getSetupState: () => Promise<SetupState>
      getSetupRemotes: () => Promise<SetupRemote[]>
      getSetupDevice: () => Promise<SetupDeviceConfig>
      saveSetupRemote: (payload: {
        serverUrl: string
        user: string
        email?: string
        auth: { type: 'password' | 'token'; token: string }
        devices: unknown[]
        workspaces: unknown[]
        makeActive?: boolean
      }) => Promise<SetupRemote>
      saveSetupDevice: (payload: {
        remoteId: string
        name: string
        description?: string
        deviceId: string
        deviceToken?: string
      }) => Promise<SetupDeviceConfig>
      completeSetup: (remoteId?: string) => Promise<{ ok: boolean }>
      getContextSelection: () => Promise<{ selectedId?: string; selectedUrl?: string } | null>
      setContextSelection: (selection: { selectedId?: string; selectedUrl?: string }) => Promise<void>
      clearContextSelection: () => Promise<void>
      onLauncherFocusInput: (handler: () => void) => () => void
      onAuthChanged: (handler: () => void) => () => void
      onSetupChanged: (handler: () => void) => () => void
      getMenuState: () => Promise<MenuState | null>
      setMenuState: (state: MenuState) => Promise<void>
      getMenuShellStage: () => Promise<MenuShellStage>
      setMenuShellStage: (stage: MenuShellStage) => Promise<void>
      advanceMenuShellStage: () => Promise<void>
      onMenuShellStageChanged: (handler: (stage: MenuShellStage) => void) => () => void
      getGridOffset: () => Promise<{ x: number; y: number }>
      setGridOffset: (offset: { x: number; y: number }) => Promise<void>
      getToolboxMode: () => Promise<ToolboxMode>
      setToolboxMode: (mode: ToolboxMode) => Promise<void>
      onToolboxModeChanged: (handler: (mode: ToolboxMode) => void) => () => void
      wsSubscribe: (channel: string) => Promise<void>
      wsUnsubscribe: (channel: string) => Promise<void>
      onWsEvent: (handler: (event: string, payload: unknown) => void) => () => void
      quitApp: () => Promise<void>
    }
  }
}

export {}
