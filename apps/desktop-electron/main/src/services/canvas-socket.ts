import { BrowserWindow, webContents } from 'electron';

type EventCallback = (event: string, payload: unknown) => void;

export class CanvasSocket {
  private socket: any = null;
  private subscriptions = new Map<string, Set<number>>();
  private serverChannels = new Set<string>();
  private eventListeners: EventCallback[] = [];

  // ── Public API ──────────────────────────────────────────

  async connect(serverUrl: string, token: string) {
    this.disconnect();

    const { io } = await import('socket.io-client');
    const baseUrl = serverUrl.replace(/\/+$/, '');

    this.socket = io(baseUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      auth: { token },
    });

    this.socket.onAny((event: string, payload: unknown) => {
      this.handleEvent(event, payload);
    });

    this.socket.on('connect', () => {
      this.resubscribeAll();
    });
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.close();
    this.socket = null;
    this.serverChannels.clear();
  }

  subscribe(webContentsId: number, channel: string) {
    let subs = this.subscriptions.get(channel);
    if (!subs) {
      subs = new Set();
      this.subscriptions.set(channel, subs);
    }
    subs.add(webContentsId);

    this.trackWebContentsDestroy(webContentsId);

    if (!this.serverChannels.has(channel) && this.socket?.connected) {
      this.socket.emit('subscribe', { channel });
      this.serverChannels.add(channel);
    }
  }

  unsubscribe(webContentsId: number, channel: string) {
    const subs = this.subscriptions.get(channel);
    if (!subs) return;
    subs.delete(webContentsId);

    if (subs.size === 0) {
      this.subscriptions.delete(channel);
      if (this.serverChannels.has(channel) && this.socket?.connected) {
        this.socket.emit('unsubscribe', { channel });
        this.serverChannels.delete(channel);
      }
    }
  }

  onEvent(callback: EventCallback) {
    this.eventListeners.push(callback);
  }

  // ── Internals ───────────────────────────────────────────

  private trackedWebContents = new Set<number>();

  private trackWebContentsDestroy(id: number) {
    if (this.trackedWebContents.has(id)) return;
    this.trackedWebContents.add(id);

    const wc = webContents.fromId(id);
    if (!wc) return;
    wc.on('destroyed', () => {
      this.trackedWebContents.delete(id);
      for (const [channel, subs] of this.subscriptions) {
        subs.delete(id);
        if (subs.size === 0) {
          this.subscriptions.delete(channel);
          if (this.serverChannels.has(channel) && this.socket?.connected) {
            this.socket.emit('unsubscribe', { channel });
            this.serverChannels.delete(channel);
          }
        }
      }
    });
  }

  private resubscribeAll() {
    if (!this.socket?.connected) return;
    for (const channel of this.subscriptions.keys()) {
      this.socket.emit('subscribe', { channel });
      this.serverChannels.add(channel);
    }
  }

  private handleEvent(event: string, payload: unknown) {
    const data = payload as Record<string, unknown> | undefined;
    const contextId = data?.contextId as string | undefined;
    const workspaceId = data?.workspaceId as string | undefined;

    const matchingChannels: string[] = [];
    if (contextId) matchingChannels.push(`context:${contextId}`);
    if (workspaceId) matchingChannels.push(`workspace:${workspaceId}`);

    const targetIds = new Set<number>();
    for (const channel of matchingChannels) {
      const subs = this.subscriptions.get(channel);
      if (subs) subs.forEach((id) => targetIds.add(id));
    }

    for (const id of targetIds) {
      try {
        const wc = webContents.fromId(id);
        wc?.send('ws:event', event, payload);
      } catch {
        // webContents may have been destroyed between check and send
      }
    }

    for (const cb of this.eventListeners) {
      try { cb(event, payload); } catch { /* don't let one bad listener break others */ }
    }
  }
}
