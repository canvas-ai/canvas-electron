import { contextBridge, ipcRenderer } from 'electron';

const IPC = {
  AUTH_GET: 'auth:get-config',
  AUTH_SET: 'auth:set-config',
  AUTH_CLEAR: 'auth:clear-config',
  CONTEXT_GET: 'context:get-selection',
  CONTEXT_SET: 'context:set-selection',
  CONTEXT_CLEAR: 'context:clear-selection',
  LAUNCHER_FOCUS_INPUT: 'launcher:focus-input',
} as const;

const api = {
  getAuthConfig: () => ipcRenderer.invoke(IPC.AUTH_GET),
  setAuthConfig: (auth: { serverUrl: string; token: string; email?: string }) =>
    ipcRenderer.invoke(IPC.AUTH_SET, auth),
  clearAuthConfig: () => ipcRenderer.invoke(IPC.AUTH_CLEAR),
  getContextSelection: () => ipcRenderer.invoke(IPC.CONTEXT_GET),
  setContextSelection: (selection: { selectedId?: string; selectedUrl?: string }) =>
    ipcRenderer.invoke(IPC.CONTEXT_SET, selection),
  clearContextSelection: () => ipcRenderer.invoke(IPC.CONTEXT_CLEAR),
  onLauncherFocusInput: (handler: () => void) => {
    const listener = () => handler();
    ipcRenderer.on(IPC.LAUNCHER_FOCUS_INPUT, listener);
    return () => ipcRenderer.removeListener(IPC.LAUNCHER_FOCUS_INPUT, listener);
  },
};

contextBridge.exposeInMainWorld('canvas', api);

declare global {
  interface Window {
    canvas?: typeof api;
  }
}
