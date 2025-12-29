import { promises as fs } from 'fs';
import { dirname } from 'path';
import { getCanvasSettingsPath } from '../../shared/paths';
import type { AuthSession } from '../../shared/types';

type SettingsFile = {
  ui?: {
    auth?: AuthSession | null;
  };
};

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

export async function getUiAuthSession(): Promise<AuthSession | null> {
  const filePath = getCanvasSettingsPath();
  const settings = await readJsonFile<SettingsFile>(filePath, {});
  return settings.ui?.auth ?? null;
}

export async function setUiAuthSession(session: AuthSession | null): Promise<void> {
  const filePath = getCanvasSettingsPath();
  const settings = await readJsonFile<SettingsFile>(filePath, {});
  const next: SettingsFile = {
    ...settings,
    ui: {
      ...(settings.ui ?? {}),
      auth: session,
    },
  };
  await writeJsonFile(filePath, next);
}

