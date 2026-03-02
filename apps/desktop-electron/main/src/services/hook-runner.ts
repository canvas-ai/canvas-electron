import { spawn } from 'child_process';
import { accessSync, mkdirSync, openSync, constants } from 'fs';
import path from 'path';
import { getCanvasHooksDir, getCanvasLogsDir } from '../paths';
import { getHooksEnabled } from '../config/app-config';

let hooksEnabled: boolean | null = null;

async function isEnabled(): Promise<boolean> {
  if (hooksEnabled === null) hooksEnabled = await getHooksEnabled();
  return hooksEnabled;
}

function ensureDir(dir: string) {
  try { mkdirSync(dir, { recursive: true }); } catch { /* already exists */ }
}

export async function fireHook(eventName: string, payload: unknown) {
  if (!(await isEnabled())) return;

  const hooksDir = getCanvasHooksDir();
  const scriptPath = path.join(hooksDir, eventName);

  try {
    accessSync(scriptPath, constants.X_OK);
  } catch {
    return;
  }

  const logsDir = getCanvasLogsDir();
  ensureDir(logsDir);

  let logFd: number;
  try {
    logFd = openSync(path.join(logsDir, 'hooks.log'), 'a');
  } catch {
    return;
  }

  try {
    const child = spawn(scriptPath, [eventName], {
      detached: true,
      stdio: ['pipe', logFd, logFd],
      env: { ...process.env, CANVAS_EVENT: eventName },
    });

    child.stdin?.write(JSON.stringify(payload));
    child.stdin?.end();
    child.unref();
  } catch {
    // script failed to launch - nothing to do
  }
}
