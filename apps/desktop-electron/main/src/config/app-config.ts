import { getCanvasConfigDir } from '../paths';

// ── Schema ────────────────────────────────────────────────

type AppConfigSchema = {
  shortcuts?: {
    contextLauncher?: string;
    menuToggle?: string;
    devTools?: string;
  };
  grid?: {
    offset?: { x: number; y: number };
  };
  hooks?: {
    enabled?: boolean;
  };
  auth?: {
    serverUrl?: string;
    token?: string;
    email?: string;
  };
  context?: {
    selectedId?: string;
    selectedUrl?: string;
  };
  state?: MenuState;
};

export type MenuState = {
  view?: 'workspaces' | 'contexts' | 'tree';
  workspaceId?: string;
  workspaceName?: string;
  contextId?: string;
  contextMode?: 'bound' | 'explorer';
};

type ConfigStore = {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
  delete: (key: string) => void;
};

// ── Defaults ──────────────────────────────────────────────

const DEFAULTS = {
  shortcuts: {
    contextLauncher: 'Ctrl+Space',
    menuToggle: 'CommandOrControl+Shift+Space',
    devTools: 'CommandOrControl+Shift+F12',
  },
  grid: {
    offset: { x: 0, y: 0 },
  },
} as const;

// ── Singleton ─────────────────────────────────────────────

let confInstance: Promise<ConfigStore> | null = null;

async function getConfig(): Promise<ConfigStore> {
  if (!confInstance) {
    confInstance = import('conf').then(({ default: ConfCtor }) => {
      const config = new (ConfCtor as any)({
        cwd: getCanvasConfigDir(),
        configName: 'canvas-ui',
        serialize: (value: AppConfigSchema) => JSON.stringify(value, null, 2),
        deserialize: (text: string) => JSON.parse(text) as AppConfigSchema,
        defaults: {
          shortcuts: { ...DEFAULTS.shortcuts },
          grid: { ...DEFAULTS.grid },
          hooks: { enabled: true },
        },
      });
      return config as ConfigStore;
    });
  }
  return confInstance;
}

// ── Shortcuts ─────────────────────────────────────────────

export async function getShortcuts() {
  const config = await getConfig();
  const shortcuts = config.get('shortcuts') as AppConfigSchema['shortcuts'] ?? {};
  return {
    contextLauncher: shortcuts.contextLauncher || DEFAULTS.shortcuts.contextLauncher,
    menuToggle: shortcuts.menuToggle || DEFAULTS.shortcuts.menuToggle,
    devTools: shortcuts.devTools || DEFAULTS.shortcuts.devTools,
  };
}

export async function getContextLauncherShortcut(): Promise<string> {
  const { contextLauncher } = await getShortcuts();
  return contextLauncher;
}

export async function setContextLauncherShortcut(shortcut: string): Promise<void> {
  const config = await getConfig();
  config.set('shortcuts.contextLauncher', shortcut);
}

// ── Grid ──────────────────────────────────────────────────

export async function getGridOffset(): Promise<{ x: number; y: number }> {
  const config = await getConfig();
  const offset = config.get('grid.offset') as { x: number; y: number } | undefined;
  return offset ?? { ...DEFAULTS.grid.offset };
}

export async function setGridOffset(offset: { x: number; y: number }): Promise<void> {
  const config = await getConfig();
  config.set('grid.offset', offset);
}

// ── Hooks ─────────────────────────────────────────────────

export async function getHooksEnabled(): Promise<boolean> {
  const config = await getConfig();
  const hooks = config.get('hooks') as AppConfigSchema['hooks'] | undefined;
  return hooks?.enabled !== false;
}

// ── Auth ──────────────────────────────────────────────────

export type AuthConfig = {
  serverUrl: string;
  token: string;
  email?: string;
};

export async function getAuthConfig(): Promise<AuthConfig | null> {
  const config = await getConfig();
  const auth = config.get('auth') as AuthConfig | undefined;
  if (!auth?.serverUrl || !auth?.token) return null;
  return auth;
}

export async function setAuthConfig(auth: AuthConfig): Promise<void> {
  const config = await getConfig();
  config.set('auth', auth);
}

export async function clearAuthConfig(): Promise<void> {
  const config = await getConfig();
  config.delete('auth');
}

// ── Context selection ─────────────────────────────────────

export type ContextSelectionConfig = {
  selectedId?: string;
  selectedUrl?: string;
};

export async function getContextSelection(): Promise<ContextSelectionConfig | null> {
  const config = await getConfig();
  const selection = config.get('context') as ContextSelectionConfig | undefined;
  if (!selection?.selectedId && !selection?.selectedUrl) return null;
  return selection;
}

export async function setContextSelection(selection: ContextSelectionConfig): Promise<void> {
  const config = await getConfig();
  config.set('context', selection);
}

export async function clearContextSelection(): Promise<void> {
  const config = await getConfig();
  config.delete('context');
}

// ── Menu state ────────────────────────────────────────────

export async function getMenuState(): Promise<MenuState | null> {
  const config = await getConfig();
  const state = config.get('state') as MenuState | undefined;
  if (!state?.view) return null;
  return state;
}

export async function setMenuState(state: MenuState): Promise<void> {
  const config = await getConfig();
  config.set('state', state);
}
