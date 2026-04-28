import { app, BrowserWindow, screen } from 'electron';
import { join } from 'path';

export type ToolboxMode = 'dot' | 'ruler' | 'toolbox' | 'extended';

const DOT_SIZE = 48;
const RULER_WIDTH = 44;
const TOOLBOX_WIDTH = 400;
const EXTENDED_WIDTH = 780;
const PADDING = 16;

export class ToolboxWindow {
  private window: BrowserWindow | null = null;
  private _mode: ToolboxMode = 'dot';
  private dotOffset = { right: 32, bottom: 32 };

  constructor() {
    this.createWindow();
  }

  // ── Getters ──────────────────────────────────────────────

  get mode(): ToolboxMode {
    return this._mode;
  }

  get isVisible(): boolean {
    return this.window?.isVisible() ?? false;
  }

  // ── Public API ───────────────────────────────────────────

  toggle() {
    if (this.isVisible) this.hide();
    else this.show();
  }

  show() {
    if (!this.window) return;
    this.applyBounds();
    this.window.show();
  }

  hide() {
    this.window?.hide();
  }

  setMode(mode: ToolboxMode) {
    this._mode = mode;
    this.applyBounds();
    this.window?.webContents.send('toolbox:mode-changed', mode);
  }

  cycleMode() {
    const modes: ToolboxMode[] = ['dot', 'ruler', 'toolbox', 'extended'];
    const next = modes[(modes.indexOf(this._mode) + 1) % modes.length];
    this.setMode(next);
  }

  // ── Window creation ──────────────────────────────────────

  private createWindow() {
    const isDev = !app.isPackaged;
    const bounds = this.calcBounds();
    this.window = new BrowserWindow({
      ...bounds,
      show: false,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../preload.js'),
        backgroundThrottling: false,
      },
    });

    this.window.setMenu(null);
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    if (isDev) {
      this.window.loadURL('http://localhost:3000/toolbox.html');
    } else {
      this.window.loadFile(join(app.getAppPath(), 'dist/renderer/toolbox.html'));
    }

    this.window.on('close', (event) => {
      if ((app as any).isQuitting) return;
      event.preventDefault();
      this.window?.hide();
    });

    this.window.on('closed', () => {
      this.window = null;
    });
  }

  // ── Positioning ──────────────────────────────────────────

  private calcBounds() {
    const { workArea } = screen.getPrimaryDisplay();

    if (this._mode === 'dot') {
      return {
        width: DOT_SIZE,
        height: DOT_SIZE,
        x: workArea.x + workArea.width - DOT_SIZE - this.dotOffset.right,
        y: workArea.y + workArea.height - DOT_SIZE - this.dotOffset.bottom,
      };
    }

    const widths: Record<string, number> = {
      ruler: RULER_WIDTH,
      toolbox: TOOLBOX_WIDTH,
      extended: EXTENDED_WIDTH,
    };
    const w = widths[this._mode];

    return {
      width: w,
      height: workArea.height - PADDING * 2,
      x: workArea.x + workArea.width - w - PADDING,
      y: workArea.y + PADDING,
    };
  }

  private applyBounds() {
    if (!this.window) return;
    this.window.setBounds(this.calcBounds());
  }
}
