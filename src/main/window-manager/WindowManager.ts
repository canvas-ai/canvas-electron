import { randomUUID } from 'crypto';
import { screen } from 'electron';
import { CanvasWindow, type CanvasWindowId, type WindowBounds } from '../windows/canvas/CanvasWindow';

export class WindowManager {
  private readonly canvases = new Map<CanvasWindowId, CanvasWindow>();

  public createLauncherCanvas({ show = true }: { show?: boolean } = {}): CanvasWindowId {
    const id = randomUUID();
    const { workArea } = screen.getPrimaryDisplay();
    const height = Math.floor(workArea.height * 0.8);
    const reservedForMinToolbox = 56 + 32 + 32; // toolbox + gap + a bit of breathing room
    const width = Math.min(960, Math.max(640, workArea.width - reservedForMinToolbox));

    const canvas = new CanvasWindow({ id, show, bounds: { width, height } });

    this.canvases.set(id, canvas);
    return id;
  }

  public getCanvas(id: CanvasWindowId): CanvasWindow | undefined {
    return this.canvases.get(id);
  }

  public getCanvasBounds(id: CanvasWindowId): WindowBounds | null {
    return this.canvases.get(id)?.getBounds() ?? null;
  }

  public getCanvasIds(): CanvasWindowId[] {
    return [...this.canvases.keys()];
  }

  public focusCanvas(id: CanvasWindowId) {
    this.canvases.get(id)?.focus();
  }

  public closeCanvas(id: CanvasWindowId) {
    this.canvases.get(id)?.close();
    this.canvases.delete(id);
  }
}

