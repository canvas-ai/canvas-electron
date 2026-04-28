import { app, BrowserWindow, screen } from 'electron';
import { join } from 'path';

export type MenuShellStage = 'collapsed' | 'tree' | 'mainMenu';

const COLLAPSED_WIDTH = 420;
const COLLAPSED_HEIGHT = 84;
/** Keep in sync with renderer `index.css` (--m0-width + --m1-width). */
const M0_WIDTH = 48;
const M1_WIDTH = 280;
const EXPANDED_WIDTH = M0_WIDTH + M1_WIDTH;
const PADDING = 16;
const TOP_OFFSET = 28;

export class MenuWindow {
  private window: BrowserWindow | null = null;
  private stage: MenuShellStage = 'collapsed';

  constructor() {
    this.createWindow();
  }

  // ── Getters ──────────────────────────────────────────────

  get isVisible(): boolean {
    return this.window?.isVisible() ?? false;
  }

  get shellStage(): MenuShellStage {
    return this.stage;
  }

  // ── Public API ───────────────────────────────────────────

  toggle() {
    this.advanceStage();
  }

  show() {
    if (!this.window) return;
    this.updateBounds();
    this.window.show();
  }

  showCollapsed() {
    this.setStage('collapsed');
  }

  showTree() {
    this.setStage('tree');
  }

  showMainMenu() {
    this.setStage('mainMenu');
  }

  setStage(stage: MenuShellStage) {
    this.stage = stage;
    if (stage === 'collapsed') {
      this.window?.hide();
    } else {
      this.updateBounds();
      this.window?.show();
    }
    this.window?.webContents.send('menu:shell-stage-changed', stage);
  }

  advanceStage() {
    const next: MenuShellStage =
      this.stage === 'collapsed' ? 'tree' :
      this.stage === 'tree' ? 'mainMenu' :
      'collapsed';
    this.setStage(next);
  }

  sendNavTree(direction: 'up' | 'down') {
    this.window?.webContents.send('menu:nav-tree', direction);
  }

  hide() {
    this.window?.hide();
  }

  close() {
    this.window?.close();
  }

  // ── Window creation ──────────────────────────────────────

  private createWindow() {
    const isDev = !app.isPackaged;
    const bounds = this.calcBounds();
    const iconPath = isDev
      ? join(__dirname, '../../../../public/icons/logo_256x256.png')
      : join(process.resourcesPath, 'public/icons/logo_256x256.png');

    this.window = new BrowserWindow({
      ...bounds,
      show: false,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      autoHideMenuBar: true,
      icon: iconPath,
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
      this.window.loadURL('http://localhost:3000/menu.html');
    } else {
      this.window.loadFile(join(app.getAppPath(), 'dist/renderer/menu.html'));
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
    if (this.stage === 'collapsed') {
      return {
        width: COLLAPSED_WIDTH,
        height: COLLAPSED_HEIGHT,
        x: workArea.x + PADDING,
        y: workArea.y + TOP_OFFSET,
      };
    }

    return {
      width: EXPANDED_WIDTH,
      height: workArea.height - PADDING * 2,
      x: workArea.x + PADDING,
      y: workArea.y + PADDING,
    };
  }

  private updateBounds() {
    if (!this.window) return;
    const bounds = this.calcBounds();
    this.window.setBounds(bounds);
  }
}
