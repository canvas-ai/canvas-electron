import { contextBridge, ipcRenderer } from 'electron';

const IPC = {
  AUTH_GET: 'auth:get-config',
  AUTH_SET: 'auth:set-config',
  AUTH_CLEAR: 'auth:clear-config',
  CONTEXT_GET: 'context:get-selection',
  CONTEXT_SET: 'context:set-selection',
  CONTEXT_CLEAR: 'context:clear-selection',
  LAUNCHER_FOCUS_INPUT: 'launcher:focus-input',
  STATE_GET_MENU: 'state:get-menu',
  STATE_SET_MENU: 'state:set-menu',
  MENU_GET_SHELL_STAGE: 'menu:get-shell-stage',
  MENU_SET_SHELL_STAGE: 'menu:set-shell-stage',
  MENU_ADVANCE_SHELL_STAGE: 'menu:advance-shell-stage',
  GRID_GET_OFFSET: 'config:get-grid-offset',
  GRID_SET_OFFSET: 'config:set-grid-offset',
  SETUP_GET_STATE: 'setup:get-state',
  SETUP_GET_REMOTES: 'setup:get-remotes',
  SETUP_GET_DEVICE: 'setup:get-device',
  SETUP_SAVE_REMOTE: 'setup:save-remote',
  SETUP_SAVE_DEVICE: 'setup:save-device',
  SETUP_COMPLETE: 'setup:complete',
  WS_SUBSCRIBE: 'ws:subscribe',
  WS_UNSUBSCRIBE: 'ws:unsubscribe',
} as const;

const api = {
  // Auth
  getAuthConfig: () => ipcRenderer.invoke(IPC.AUTH_GET),
  setAuthConfig: (auth: { serverUrl: string; token: string; email?: string }) =>
    ipcRenderer.invoke(IPC.AUTH_SET, auth),
  clearAuthConfig: () => ipcRenderer.invoke(IPC.AUTH_CLEAR),

  // Setup wizard
  getSetupState: () => ipcRenderer.invoke(IPC.SETUP_GET_STATE),
  getSetupRemotes: () => ipcRenderer.invoke(IPC.SETUP_GET_REMOTES),
  getSetupDevice: () => ipcRenderer.invoke(IPC.SETUP_GET_DEVICE),
  saveSetupRemote: (payload: {
    serverUrl: string;
    user: string;
    email?: string;
    auth: { type: 'password' | 'token'; token: string };
    devices: unknown[];
    workspaces: unknown[];
    makeActive?: boolean;
  }) => ipcRenderer.invoke(IPC.SETUP_SAVE_REMOTE, payload),
  saveSetupDevice: (payload: {
    remoteId: string;
    name: string;
    description?: string;
    deviceId: string;
    deviceToken?: string;
  }) => ipcRenderer.invoke(IPC.SETUP_SAVE_DEVICE, payload),
  completeSetup: (remoteId?: string) => ipcRenderer.invoke(IPC.SETUP_COMPLETE, remoteId),

  // Context selection
  getContextSelection: () => ipcRenderer.invoke(IPC.CONTEXT_GET),
  setContextSelection: (selection: { selectedId?: string; selectedUrl?: string }) =>
    ipcRenderer.invoke(IPC.CONTEXT_SET, selection),
  clearContextSelection: () => ipcRenderer.invoke(IPC.CONTEXT_CLEAR),

  // Events
  onLauncherFocusInput: (handler: () => void) => {
    const listener = () => handler();
    ipcRenderer.on(IPC.LAUNCHER_FOCUS_INPUT, listener);
    return () => ipcRenderer.removeListener(IPC.LAUNCHER_FOCUS_INPUT, listener);
  },
  onAuthChanged: (handler: () => void) => {
    const listener = () => handler();
    ipcRenderer.on('auth:changed', listener);
    return () => ipcRenderer.removeListener('auth:changed', listener);
  },
  onSetupChanged: (handler: () => void) => {
    const listener = () => handler();
    ipcRenderer.on('setup:changed', listener);
    return () => ipcRenderer.removeListener('setup:changed', listener);
  },

  // Menu state
  getMenuState: () => ipcRenderer.invoke(IPC.STATE_GET_MENU),
  setMenuState: (state: {
    view?: string;
    workspaceId?: string;
    workspaceName?: string;
    contextId?: string;
    contextMode?: string;
  }) => ipcRenderer.invoke(IPC.STATE_SET_MENU, state),
  getMenuShellStage: () => ipcRenderer.invoke(IPC.MENU_GET_SHELL_STAGE),
  setMenuShellStage: (stage: 'collapsed' | 'tree' | 'mainMenu') =>
    ipcRenderer.invoke(IPC.MENU_SET_SHELL_STAGE, stage),
  advanceMenuShellStage: () => ipcRenderer.invoke(IPC.MENU_ADVANCE_SHELL_STAGE),
  onMenuShellStageChanged: (handler: (stage: 'collapsed' | 'tree' | 'mainMenu') => void) => {
    const listener = (_: unknown, stage: 'collapsed' | 'tree' | 'mainMenu') => handler(stage);
    ipcRenderer.on('menu:shell-stage-changed', listener);
    return () => ipcRenderer.removeListener('menu:shell-stage-changed', listener);
  },

  // Grid
  getGridOffset: () => ipcRenderer.invoke(IPC.GRID_GET_OFFSET),
  setGridOffset: (offset: { x: number; y: number }) =>
    ipcRenderer.invoke(IPC.GRID_SET_OFFSET, offset),

  // Toolbox
  getToolboxMode: () => ipcRenderer.invoke('toolbox:get-mode'),
  setToolboxMode: (mode: string) => ipcRenderer.invoke('toolbox:set-mode', mode),
  onToolboxModeChanged: (handler: (mode: string) => void) => {
    const listener = (_: unknown, mode: string) => handler(mode);
    ipcRenderer.on('toolbox:mode-changed', listener);
    return () => ipcRenderer.removeListener('toolbox:mode-changed', listener);
  },

  // WebSocket (centralized in main process)
  wsSubscribe: (channel: string) => ipcRenderer.invoke(IPC.WS_SUBSCRIBE, channel),
  wsUnsubscribe: (channel: string) => ipcRenderer.invoke(IPC.WS_UNSUBSCRIBE, channel),
  onWsEvent: (handler: (event: string, payload: unknown) => void) => {
    const listener = (_: unknown, event: string, payload: unknown) => handler(event, payload);
    ipcRenderer.on('ws:event', listener);
    return () => ipcRenderer.removeListener('ws:event', listener);
  },

  quitApp: () => ipcRenderer.invoke('app:quit'),
};

contextBridge.exposeInMainWorld('canvas', api);

declare global {
  interface Window {
    canvas?: typeof api;
  }
}
