import { randomUUID } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import {
  type CanvasAccountRef,
  getCanvasAccountDevicesPath,
  getCanvasAccountWorkspacesPath,
  getCanvasDevicePath,
  getCanvasRemotesPath,
} from '../paths';

export type RemoteAuthType = 'password' | 'token';

export type RemoteAuthConfig = {
  type: RemoteAuthType;
  token: string;
};

export type CanvasRemoteConfig = {
  id: string;
  serverUrl: string;
  serverFqdn: string;
  user: string;
  email?: string;
  auth: RemoteAuthConfig;
  selectedDeviceId?: string;
  deviceToken?: string;
  createdAt: string;
  updatedAt: string;
};

export type CanvasRemotesConfig = {
  activeRemoteId?: string;
  remotes: CanvasRemoteConfig[];
};

export type CanvasDeviceBinding = {
  deviceId: string;
  deviceToken?: string;
  updatedAt: string;
};

export type CanvasDeviceConfig = {
  machineId: string;
  name: string;
  description?: string;
  remotes: Record<string, CanvasDeviceBinding>;
};

export type ActiveAuthConfig = {
  serverUrl: string;
  token: string;
  email?: string;
};

type SaveRemoteInput = {
  serverUrl: string;
  user: string;
  email?: string;
  auth: RemoteAuthConfig;
  devices: unknown[];
  workspaces: unknown[];
  makeActive?: boolean;
};

type SaveDeviceInput = {
  remoteId: string;
  name: string;
  description?: string;
  deviceId: string;
  deviceToken?: string;
};

function ensureDir(path: string) {
  mkdirSync(path, { recursive: true });
}

function readJsonFile<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile(path: string, value: unknown) {
  ensureDir(dirname(path));
  writeFileSync(path, JSON.stringify(value, null, 2));
}

function normalizeUser(value: string): string {
  const trimmed = value.trim();
  const emailLocalPart = trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
  return emailLocalPart
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'user';
}

function normalizeServerUrl(serverUrl: string): string {
  return serverUrl.trim().replace(/\/+$/g, '');
}

export function normalizeServerFqdn(serverUrl: string): string {
  try {
    return new URL(serverUrl).hostname.toLowerCase();
  } catch {
    return serverUrl
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .replace(/:\d+$/, '')
      .toLowerCase();
  }
}

function getAccountRef(remote: Pick<CanvasRemoteConfig, 'user' | 'serverFqdn'>): CanvasAccountRef {
  return {
    user: remote.user,
    remoteId: remote.serverFqdn,
  };
}

export function getRemotesConfig(): CanvasRemotesConfig {
  return readJsonFile<CanvasRemotesConfig>(getCanvasRemotesPath(), { remotes: [] });
}

export function getRemoteList(): CanvasRemoteConfig[] {
  return getRemotesConfig().remotes;
}

export function getActiveRemote(): CanvasRemoteConfig | null {
  const config = getRemotesConfig();
  if (!config.activeRemoteId) return null;
  return config.remotes.find((remote) => remote.id === config.activeRemoteId) ?? null;
}

export function saveRemote(input: SaveRemoteInput): CanvasRemoteConfig {
  const now = new Date().toISOString();
  const serverFqdn = normalizeServerFqdn(input.serverUrl);
  const user = normalizeUser(input.user);
  const id = `${user}@${serverFqdn}`;
  const config = getRemotesConfig();
  const existing = config.remotes.find((remote) => remote.id === id);
  const remote: CanvasRemoteConfig = {
    id,
    serverUrl: input.serverUrl,
    serverFqdn,
    user,
    email: input.email,
    auth: input.auth,
    selectedDeviceId: existing?.selectedDeviceId,
    deviceToken: existing?.deviceToken,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const remotes = config.remotes.filter((entry) => entry.id !== id);
  remotes.push(remote);
  writeJsonFile(getCanvasRemotesPath(), {
    activeRemoteId: input.makeActive || !config.activeRemoteId ? id : config.activeRemoteId,
    remotes,
  } satisfies CanvasRemotesConfig);

  const ref = getAccountRef(remote);
  writeJsonFile(getCanvasAccountDevicesPath(ref), input.devices);
  writeJsonFile(getCanvasAccountWorkspacesPath(ref), input.workspaces);
  return remote;
}

export function setActiveRemote(remoteId: string): CanvasRemoteConfig | null {
  const config = getRemotesConfig();
  const remote = config.remotes.find((entry) => entry.id === remoteId) ?? null;
  if (!remote) return null;
  writeJsonFile(getCanvasRemotesPath(), {
    ...config,
    activeRemoteId: remoteId,
  } satisfies CanvasRemotesConfig);
  return remote;
}

export function clearActiveRemote(): void {
  const config = getRemotesConfig();
  writeJsonFile(getCanvasRemotesPath(), {
    ...config,
    activeRemoteId: undefined,
  } satisfies CanvasRemotesConfig);
}

export function getActiveAuthConfig(): ActiveAuthConfig | null {
  const remote = getActiveRemote();
  if (!remote?.auth?.token || !remote.serverUrl) return null;
  return {
    serverUrl: remote.serverUrl,
    token: remote.auth.token,
    email: remote.email,
  };
}

export function setActiveAuthConfig(auth: ActiveAuthConfig): CanvasRemoteConfig {
  const now = new Date().toISOString();
  const serverUrl = normalizeServerUrl(auth.serverUrl);
  const serverFqdn = normalizeServerFqdn(serverUrl);
  const config = getRemotesConfig();
  const currentActive = config.activeRemoteId
    ? config.remotes.find((remote) => remote.id === config.activeRemoteId) ?? null
    : null;
  const matchingRemote = currentActive
    ?? config.remotes.find((remote) => normalizeServerUrl(remote.serverUrl) === serverUrl)
    ?? (auth.email ? config.remotes.find((remote) => remote.email === auth.email) ?? null : null);
  const user = matchingRemote?.user || normalizeUser(auth.email || serverFqdn);
  const id = matchingRemote?.id || `${user}@${serverFqdn}`;

  const remote: CanvasRemoteConfig = {
    id,
    serverUrl,
    serverFqdn,
    user,
    email: auth.email ?? matchingRemote?.email,
    auth: {
      type: matchingRemote?.auth?.type ?? 'token',
      token: auth.token,
    },
    selectedDeviceId: matchingRemote?.selectedDeviceId,
    deviceToken: matchingRemote?.deviceToken,
    createdAt: matchingRemote?.createdAt ?? now,
    updatedAt: now,
  };

  writeJsonFile(getCanvasRemotesPath(), {
    activeRemoteId: id,
    remotes: [
      ...config.remotes.filter((entry) => entry.id !== id),
      remote,
    ],
  } satisfies CanvasRemotesConfig);

  return remote;
}

export function getDeviceConfig(): CanvasDeviceConfig {
  const path = getCanvasDevicePath();
  const existing = readJsonFile<CanvasDeviceConfig | null>(path, null);
  if (existing?.machineId) {
    return {
      machineId: existing.machineId,
      name: existing.name ?? '',
      description: existing.description,
      remotes: existing.remotes ?? {},
    };
  }

  const initial: CanvasDeviceConfig = {
    machineId: randomUUID(),
    name: '',
    remotes: {},
  };
  writeJsonFile(path, initial);
  return initial;
}

export function saveDeviceConfig(input: SaveDeviceInput): CanvasDeviceConfig {
  const current = getDeviceConfig();
  const next: CanvasDeviceConfig = {
    ...current,
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    remotes: {
      ...current.remotes,
      [input.remoteId]: {
        deviceId: input.deviceId,
        deviceToken: input.deviceToken,
        updatedAt: new Date().toISOString(),
      },
    },
  };
  writeJsonFile(getCanvasDevicePath(), next);

  const remotes = getRemotesConfig();
  const remote = remotes.remotes.find((entry) => entry.id === input.remoteId);
  if (remote) {
    writeJsonFile(getCanvasRemotesPath(), {
      ...remotes,
      remotes: remotes.remotes.map((entry) => {
        if (entry.id !== input.remoteId) return entry;
        return {
          ...entry,
          selectedDeviceId: input.deviceId,
          deviceToken: input.deviceToken ?? entry.deviceToken,
          updatedAt: new Date().toISOString(),
        };
      }),
    } satisfies CanvasRemotesConfig);
  }

  return next;
}
