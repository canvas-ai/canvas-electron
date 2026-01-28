import { getCanvasConfigDir } from '../paths';

type AppConfigSchema = {
  shortcuts?: {
    contextLauncher?: string;
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
};

type ConfigStore = {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
  delete: (key: string) => void;
};

let confInstance: Promise<ConfigStore> | null = null;

const DEFAULT_CONTEXT_LAUNCHER_SHORTCUT = 'Ctrl+Space';

async function getConfig(): Promise<ConfigStore> {
  if (!confInstance) {
    confInstance = import('conf').then(({ default: ConfCtor }) => {
      const config = new (ConfCtor as any)({
        cwd: getCanvasConfigDir(),
        configName: 'electron',
        // Make config diffs readable like a civilized project.
        serialize: (value: AppConfigSchema) => JSON.stringify(value, null, 2),
        deserialize: (text: string) => JSON.parse(text) as AppConfigSchema,
        defaults: {
          shortcuts: {
            contextLauncher: DEFAULT_CONTEXT_LAUNCHER_SHORTCUT,
          },
        },
      });
      return config as ConfigStore;
    });
  }
  return confInstance;
}

export async function getContextLauncherShortcut(): Promise<string> {
  const config = await getConfig();
  const shortcut = config.get('shortcuts.contextLauncher') as string | undefined;

  // Migrate legacy default so Windows/Linux users don't keep a broken binding.
  if (!shortcut || shortcut === 'Super+C') {
    config.set('shortcuts.contextLauncher', DEFAULT_CONTEXT_LAUNCHER_SHORTCUT);
    return DEFAULT_CONTEXT_LAUNCHER_SHORTCUT;
  }

  return shortcut;
}

export async function setContextLauncherShortcut(shortcut: string): Promise<void> {
  const config = await getConfig();
  config.set('shortcuts.contextLauncher', shortcut);
}

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
