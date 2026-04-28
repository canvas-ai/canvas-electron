import { BrowserWindow, screen } from 'electron';

export class CanvasWindow {
  private static windows = new Map<string, CanvasWindow>();
  private window: BrowserWindow | null = null;

  static open(serverUrl: string, token: string, canvasPath?: string) {
    const key = `${serverUrl}::${canvasPath ?? '/'}`;
    const existing = CanvasWindow.windows.get(key);
    if (existing?.window) {
      existing.window.focus();
      return existing;
    }
    const win = new CanvasWindow(serverUrl, token, canvasPath);
    CanvasWindow.windows.set(key, win);
    return win;
  }

  private constructor(
    private readonly serverUrl: string,
    private readonly token: string,
    private readonly canvasPath?: string,
  ) {
    this.createWindow();
  }

  private buildTargetUrl(): string {
    const base = this.serverUrl.replace(/\/$/, '');
    if (!this.canvasPath) return `${base}/workspaces`;

    // workspace://path/to/folder → /workspaces/workspace/path/to/folder
    const wsMatch = this.canvasPath.match(/^([^:]+):\/\/(.*)$/);
    if (wsMatch) {
      const ws = wsMatch[1];
      const rest = wsMatch[2].replace(/^\/+/, '');
      return rest ? `${base}/workspaces/${ws}/${rest}` : `${base}/workspaces/${ws}`;
    }

    return `${base}/workspaces`;
  }

  private createWindow() {
    const { workArea } = screen.getPrimaryDisplay();
    const width = Math.min(1200, workArea.width - 80);
    const height = Math.min(800, workArea.height - 80);

    this.window = new BrowserWindow({
      width,
      height,
      x: workArea.x + Math.floor((workArea.width - width) / 2),
      y: workArea.y + Math.floor((workArea.height - height) / 2),
      frame: true,
      autoHideMenuBar: true,
      title: 'Canvas',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
    });

    this.window.setMenu(null);

    const targetUrl = this.buildTargetUrl();
    const base = this.serverUrl.replace(/\/$/, '');
    const loginUrl = `${base}/login`;

    void this.window.loadURL(loginUrl);

    // Inject token into localStorage then navigate to target
    const safeToken = this.token.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safeTarget = targetUrl.replace(/'/g, "\\'");
    this.window.webContents.once('did-finish-load', () => {
      void this.window?.webContents.executeJavaScript(
        `window.localStorage.setItem('authToken','${safeToken}');window.location.replace('${safeTarget}');`
      );
    });

    this.window.on('closed', () => {
      this.window = null;
      for (const [k, v] of CanvasWindow.windows.entries()) {
        if (v === this) {
          CanvasWindow.windows.delete(k);
          break;
        }
      }
    });
  }
}
