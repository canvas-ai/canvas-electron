import os from 'os';
import path from 'path';

export type CanvasAccountRef = {
  user: string;
  remoteId: string;
};

export type CanvasWorkspaceRef = CanvasAccountRef & {
  workspace: string;
};

export function getLocalAccountRef(): CanvasAccountRef {
  const user = os.userInfo().username || 'user';
  return { user, remoteId: 'localhost' };
}

export function getCanvasHome(): string {
  const override = process.env.CANVAS_USER_HOME || process.env.CANVAS_HOME;
  if (override) return override;

  const homeDir = os.homedir();
  if (process.platform === 'win32') return path.join(homeDir, 'Canvas');
  return path.join(homeDir, '.canvas');
}

export function getCanvasConfigDir(): string {
  return path.join(getCanvasHome(), 'config');
}

export function getCanvasRemotesPath(): string {
  return path.join(getCanvasConfigDir(), 'remotes.json');
}

export function getCanvasSettingsPath(): string {
  return path.join(getCanvasConfigDir(), 'settings.json');
}

export function getCanvasAccountsDir(): string {
  return path.join(getCanvasHome(), 'accounts');
}

export function getCanvasAccountDir(ref: CanvasAccountRef): string {
  return path.join(getCanvasAccountsDir(), `${ref.user}@${ref.remoteId}`);
}

export function getCanvasWorkspacesDir(ref: CanvasAccountRef): string {
  return path.join(getCanvasAccountDir(ref), 'workspaces');
}

export function getCanvasWorkspaceDir(ref: CanvasWorkspaceRef): string {
  return path.join(getCanvasWorkspacesDir(ref), ref.workspace);
}

export function getCanvasAgentsDir(ref: CanvasAccountRef): string {
  return path.join(getCanvasAccountDir(ref), 'agents');
}

export function getCanvasRolesDir(ref: CanvasAccountRef): string {
  return path.join(getCanvasAccountDir(ref), 'roles');
}

export function getCanvasAgentDir(ref: CanvasAccountRef, agentName: string): string {
  return path.join(getCanvasAgentsDir(ref), agentName);
}

export function getCanvasAgentConversationsDir(ref: CanvasAccountRef, agentName: string): string {
  return path.join(getCanvasAgentDir(ref, agentName), 'conversations');
}

export function getCanvasUiDir(): string {
  return path.join(getCanvasHome(), 'ui');
}

export function getCanvasLogsDir(): string {
  return path.join(getCanvasHome(), 'logs');
}

export function getCanvasTmpDir(): string {
  return path.join(getCanvasHome(), 'tmp');
}

// Keep local server runtime isolated under ~/.canvas/server (or ~/Canvas/server on Windows).
export function getCanvasServerHome(): string {
  return path.join(getCanvasHome(), 'server');
}

export function getCanvasServerLogsDir(): string {
  return path.join(getCanvasServerHome(), 'logs');
}

export function getCanvasServerTmpDir(): string {
  return path.join(getCanvasServerHome(), 'tmp');
}
