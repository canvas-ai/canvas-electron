import { randomUUID } from 'crypto';
import { screen } from 'electron';
import { CanvasWindow, type CanvasWindowId, type WindowBounds } from '../windows/canvas/CanvasWindow';

export class WindowManager {
  private readonly canvases = new Map<CanvasWindowId, CanvasWindow>();
  private lastActiveCanvasId: CanvasWindowId | null = null;
  private readonly onChange?: () => void;

  private static readonly GAP = 24;
  private static readonly TOOLBOX_MIN_WIDTH = 56;

  constructor(onChange?: () => void) {
    this.onChange = onChange;
  }

  public getTilingRect(): WindowBounds {
    const { workArea } = screen.getPrimaryDisplay();

    const height = Math.floor(workArea.height * 0.8);
    const y = Math.floor(workArea.y + (workArea.height - height) / 2);

    const availableWidth =
      workArea.width - (WindowManager.TOOLBOX_MIN_WIDTH + WindowManager.GAP);
    const targetWidth = Math.floor(height * Math.SQRT2); // √2:1 (landscape-ish)
    const width = Math.min(availableWidth, Math.max(720, targetWidth));
    const x = Math.floor(workArea.x + (availableWidth - width) / 2);

    return { x, y, width, height };
  }

  public getToolboxDockRect(): WindowBounds {
    const { workArea } = screen.getPrimaryDisplay();
    const tiling = this.getTilingRect();
    return {
      x: tiling.x + tiling.width + WindowManager.GAP,
      y: tiling.y,
      width: WindowManager.TOOLBOX_MIN_WIDTH,
      height: tiling.height,
    };
  }

  public createLauncherCanvas({ show = true }: { show?: boolean } = {}): CanvasWindowId {
    const id = randomUUID();
    const tiling = this.getTilingRect();

    const canvas = new CanvasWindow({
      id,
      show,
      bounds: tiling,
      onFocus: (canvasId) => this.setLastActiveCanvas(canvasId),
      onNewCanvasRight: (canvasId) => this.createCanvasRightOf(canvasId),
    });

    this.canvases.set(id, canvas);
    this.setLastActiveCanvas(id);
    this.notifyChange();
    return id;
  }

  public getCanvas(id: CanvasWindowId): CanvasWindow | undefined {
    return this.canvases.get(id);
  }

  public openActiveCanvasDevTools(): void {
    const id = this.lastActiveCanvasId ?? this.getCanvasIds()[0];
    if (!id) return;
    this.canvases.get(id)?.openDevTools();
  }

  public reloadActiveCanvas(): void {
    const id = this.lastActiveCanvasId ?? this.getCanvasIds()[0];
    if (!id) return;
    this.canvases.get(id)?.reload();
  }

  public getCanvasBounds(id: CanvasWindowId): WindowBounds | null {
    return this.canvases.get(id)?.getBounds() ?? null;
  }

  public listCanvases(): Array<{ id: CanvasWindowId; label: string; isActive: boolean }> {
    const ids = [...this.canvases.keys()];
    return ids.map((id, idx) => ({
      id,
      label: `Canvas ${idx + 1}`,
      isActive: id === this.lastActiveCanvasId,
    }));
  }

  public getCanvasIds(): CanvasWindowId[] {
    return [...this.canvases.keys()];
  }

  public focusCanvas(id: CanvasWindowId) {
    const canvas = this.canvases.get(id);
    if (!canvas) return;

    if (!canvas.isVisible()) {
      canvas.show();
      this.relayoutVisibleCanvases();
    } else {
      canvas.focus();
    }
    this.setLastActiveCanvas(id);
    this.notifyChange();
  }

  public toggleActiveCanvasVisibility(): void {
    const id = this.lastActiveCanvasId;
    if (!id) return;
    const canvas = this.canvases.get(id);
    if (!canvas) return;

    if (canvas.isVisible()) {
      canvas.hide();
      this.relayoutVisibleCanvases();
      this.notifyChange();
      return;
    }

    canvas.show();
    this.setLastActiveCanvas(id);
    this.relayoutVisibleCanvases();
    this.notifyChange();
  }

  public focusLastActiveCanvas(): boolean {
    if (!this.lastActiveCanvasId) return false;
    this.focusCanvas(this.lastActiveCanvasId);
    return true;
  }

  public createCanvasRightOf(anchorId: CanvasWindowId, gap = WindowManager.GAP): CanvasWindowId | null {
    const resolvedGap = gap;

    // We're intentionally stopping at a 2-canvas "bling-bling" setup for now.
    if (this.canvases.size >= 2) {
      const other = [...this.canvases.keys()].find((id) => id !== anchorId) ?? null;
      if (other) this.focusCanvas(other);
      return other;
    }

    const anchor = this.canvases.get(anchorId);
    if (!anchor) return null;

    const tiling = this.getTilingRect();
    const newWidth = Math.floor((tiling.width - resolvedGap) / 2);
    if (newWidth < 480) return null; // keep it usable; tweak later when we add proper min sizes

    // Place anchor on the left and new canvas on the right (stable layout)
    anchor.setBounds({ x: tiling.x, y: tiling.y, width: newWidth, height: tiling.height });

    const id = randomUUID();
    const bounds: WindowBounds = {
      x: tiling.x + newWidth + resolvedGap,
      y: tiling.y,
      width: newWidth,
      height: tiling.height,
    };

    const canvas = new CanvasWindow({
      id,
      show: true,
      bounds,
      onFocus: (canvasId) => this.setLastActiveCanvas(canvasId),
      onNewCanvasRight: (canvasId) => this.createCanvasRightOf(canvasId, resolvedGap),
    });

    this.canvases.set(id, canvas);
    this.setLastActiveCanvas(id);
    this.relayoutVisibleCanvases();
    this.notifyChange();
    return id;
  }

  public closeCanvas(id: CanvasWindowId) {
    this.canvases.get(id)?.close();
    this.canvases.delete(id);
    if (this.lastActiveCanvasId === id) this.lastActiveCanvasId = null;
    this.relayoutVisibleCanvases();
    this.notifyChange();
  }

  private setLastActiveCanvas(id: CanvasWindowId) {
    if (this.canvases.has(id)) this.lastActiveCanvasId = id;
  }

  private notifyChange() {
    this.onChange?.();
  }

  private relayoutVisibleCanvases() {
    const tiling = this.getTilingRect();
    const visible = [...this.canvases.entries()]
      .filter(([, c]) => c.isVisible())
      .map(([id]) => id);

    if (visible.length === 1) {
      this.canvases.get(visible[0])?.setBounds(tiling);
      return;
    }

    if (visible.length >= 2) {
      const leftId = visible[0];
      const rightId = visible[1];
      const half = Math.floor((tiling.width - WindowManager.GAP) / 2);
      if (half < 480) return;

      this.canvases.get(leftId)?.setBounds({
        x: tiling.x,
        y: tiling.y,
        width: half,
        height: tiling.height,
      });
      this.canvases.get(rightId)?.setBounds({
        x: tiling.x + half + WindowManager.GAP,
        y: tiling.y,
        width: half,
        height: tiling.height,
      });
    }
  }
}

