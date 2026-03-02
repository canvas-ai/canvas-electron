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
  GRID_GET_OFFSET: 'config:get-grid-offset',
  GRID_SET_OFFSET: 'config:set-grid-offset',
  WS_SUBSCRIBE: 'ws:subscribe',
  WS_UNSUBSCRIBE: 'ws:unsubscribe',
} as const;

const api = {
  // Auth
  getAuthConfig: () => ipcRenderer.invoke(IPC.AUTH_GET),
  setAuthConfig: (auth: { serverUrl: string; token: string; email?: string }) =>
    ipcRenderer.invoke(IPC.AUTH_SET, auth),
  clearAuthConfig: () => ipcRenderer.invoke(IPC.AUTH_CLEAR),

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

  // Menu state
  getMenuState: () => ipcRenderer.invoke(IPC.STATE_GET_MENU),
  setMenuState: (state: {
    view?: string;
    workspaceId?: string;
    workspaceName?: string;
    contextId?: string;
    contextMode?: string;
  }) => ipcRenderer.invoke(IPC.STATE_SET_MENU, state),

  // Grid
  getGridOffset: () => ipcRenderer.invoke(IPC.GRID_GET_OFFSET),
  setGridOffset: (offset: { x: number; y: number }) =>
    ipcRenderer.invoke(IPC.GRID_SET_OFFSET, offset),

  // WebSocket (centralized in main process)
  wsSubscribe: (channel: string) => ipcRenderer.invoke(IPC.WS_SUBSCRIBE, channel),
  wsUnsubscribe: (channel: string) => ipcRenderer.invoke(IPC.WS_UNSUBSCRIBE, channel),
  onWsEvent: (handler: (event: string, payload: unknown) => void) => {
    const listener = (_: unknown, event: string, payload: unknown) => handler(event, payload);
    ipcRenderer.on('ws:event', listener);
    return () => ipcRenderer.removeListener('ws:event', listener);
  },
};

contextBridge.exposeInMainWorld('canvas', api);

declare global {
  interface Window {
    canvas?: typeof api;
  }
}
