import { io, Socket } from 'socket.io-client'
import { getWsUrl } from '@/config/api'

// Get auth token from localStorage
function getAuthToken(): string | null {
  // Only get the real authentication token, not any default value
  const token = localStorage.getItem('authToken')
  if (!token || token === 'canvas-server-token') {
    return null;
  }
  return token;
}

class SocketService {
  private socket: Socket | null = null
  private connected: boolean = false
  private pending: boolean = false
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private handlers: Map<string, Function[]> = new Map()
  private registeredHandlers: Set<string> = new Set() // Track what's been registered to prevent duplicates
  private baseUrl: string
  private connectionId: string = '';
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastPongTime: number = 0;

  constructor() {
    this.baseUrl = getWsUrl()
    console.log('Socket service initialized with base URL:', this.baseUrl)
    // Generate a unique ID for this socket service instance
    this.connectionId = `socket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  connect(token?: string) {
    if (this.connected || this.pending) {
      console.log('Socket already connected or connection pending, skipping connect request');
      return;
    }
    this.pending = true;

    // Use auth token from localStorage if not provided
    const authToken = token || getAuthToken()
    console.log('🔍 DEBUG: Auth token check:', {
      tokenProvided: !!token,
      tokenFromStorage: !!getAuthToken(),
      tokenLength: authToken ? authToken.length : 0,
      tokenPreview: authToken ? authToken.substring(0, 20) + '...' : 'null'
    });

    if (!authToken) {
      console.error('❌ No auth token available for socket connection');
      console.log('🔍 DEBUG: localStorage contents:', Object.keys(localStorage));
      this.pending = false;
      return;
    }

    // Reject any suspicious tokens like hardcoded test values
    if (authToken === 'canvas-server-token') {
      console.error('Invalid token format detected: canvas-server-token');
      this.pending = false;
      return;
    }

    try {
      // Refresh base URL in case the API/server was switched (desktop app)
      this.baseUrl = getWsUrl()
      console.log('🔌 Attempting to connect to WebSocket server at:', this.baseUrl)
      console.log('🔑 Using auth token for socket connection:', authToken.substring(0, 10) + '...')

      // Destroy any existing socket connection
      this.cleanupSocket();

      // Create socket.io connection
      this.socket = io(this.baseUrl, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        forceNew: true,  // Force a new connection to avoid issues with previous connections
        timeout: 10000,  // Connection timeout in ms
        // Include the token in proper Authorization header format
        extraHeaders: {
          Authorization: `Bearer ${authToken}`,
          'X-Connection-ID': this.connectionId
        },
        auth: {
          token: authToken // Send the raw token without modification
        }
      })

      console.log('🎯 Socket.IO client initialized, connecting...')

      // Register basic event handlers
      this.setupDefaultHandlers()
    } catch (error) {
      console.error('💥 Socket connection setup error:', error)
      this.pending = false

      // Clean up any partial socket
      this.cleanupSocket();
    }
  }

  private cleanupSocket() {
    if (this.socket) {
      try {
        this.socket.disconnect();
        this.socket.removeAllListeners();
      } catch (e) {
        console.error('Error while cleaning up socket:', e);
      }
      this.socket = null;
    }

    // Clear registered handlers tracking
    this.registeredHandlers.clear();
    this.stopHeartbeat();
  }

  private startHeartbeat() {
    // Stop existing heartbeat if it exists
    this.stopHeartbeat();

    // Set up new heartbeat
    this.lastPongTime = Date.now();

    this.heartbeatInterval = setInterval(() => {
      if (!this.socket || !this.connected) {
        this.stopHeartbeat();
        return;
      }

      // Check if we haven't received a pong in too long
      if (Date.now() - this.lastPongTime > 30000) { // 30 seconds
        console.warn('No pong received for 30 seconds, reconnecting socket');
        this.reconnect();
        return;
      }

      try {
        // Send ping and set timeout for pong
        this.socket.emit('ping');

        // Set timeout to check for pong response
        if (this.heartbeatTimeout) {
          clearTimeout(this.heartbeatTimeout);
        }

        this.heartbeatTimeout = setTimeout(() => {
          if (this.connected) {
            console.warn('Ping timeout, reconnecting socket');
            this.reconnect();
          }
        }, 5000); // 5 second timeout for pong
      } catch (e) {
        console.error('Error sending heartbeat:', e);
        this.reconnect();
      }
    }, 15000); // Send ping every 15 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  private setupDefaultHandlers() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('✅ Socket connected with ID:', this.socket?.id)
      console.log('🔗 Connection established to:', this.baseUrl)
      this.connected = true
      this.pending = false
      this.reconnectAttempts = 0

      // Register any pending handlers
      this.registerHandlers()

      // Start heartbeat to detect broken connections
      this.startHeartbeat()
    })

    this.socket.on('disconnect', (reason: string) => {
      console.log('🔌 Socket disconnected:', reason)
      console.log('🔍 DEBUG: Disconnect details:', {
        reason,
        wasConnected: this.connected,
        reconnectAttempts: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts
      });
      this.connected = false
      this.pending = false

      // Stop heartbeat
      this.stopHeartbeat()

      // Handle reconnection for transport close (which often happens when an extension is removed)
      if (reason === 'transport close' && this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log(`🔄 Attempting reconnection (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`)
        this.reconnectAttempts++
        // Wait a bit before trying to reconnect
        setTimeout(() => {
          if (!this.connected && !this.pending) {
            this.connect()
          }
        }, 2000)
      }
    })

    this.socket.on('connect_error', (error: any) => {
      console.error('💥 Socket connection error:', error.message)
      console.error('🔍 DEBUG: Connection error details:', {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type,
        transport: error.transport,
        code: error.code
      });
      console.error('🔍 DEBUG: Full error object:', error)
      this.connected = false
      this.pending = false

      // Stop heartbeat on connection error
      this.stopHeartbeat()
    })

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error)
    })

    // Add handler for authenticated event
    this.socket.on('authenticated', (data: any) => {
      console.log('Socket authenticated:', data)
    })

    // Add handler for pong
    this.socket.on('pong', () => {
      this.lastPongTime = Date.now()
      if (this.heartbeatTimeout) {
        clearTimeout(this.heartbeatTimeout)
        this.heartbeatTimeout = null
      }
    })

    // Add handler for connection change events
    this.socket.on('connection:change', (data: any) => {
      console.log('Connection status changed:', data)
    })
  }

  private registerHandlers() {
    if (!this.socket) return

    // Register all pending handlers, but avoid duplicates
    this.handlers.forEach((callbacks, event) => {
      callbacks.forEach((callback, index) => {
        const handlerKey = `${event}:${index}`;

        // Skip if this specific handler is already registered
        if (this.registeredHandlers.has(handlerKey)) {
          return;
        }

        this.socket?.on(event, (...args: any[]) => {
          callback(...args)
        });

        this.registeredHandlers.add(handlerKey);
      })
    })
  }

  // Add event handler
  on(event: string, callback: Function) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }

    const handlers = this.handlers.get(event)
    if (handlers) {
      // Check if this exact callback is already registered
      if (handlers.indexOf(callback) === -1) {
        handlers.push(callback)
      } else {
        console.warn(`Duplicate handler registration prevented for event: ${event}`);
        return () => this.off(event, callback); // Return cleanup function anyway
      }
    }

    // Register with socket if connected
    if (this.socket && this.connected) {
      const handlerKey = `${event}:${handlers!.length - 1}`;

      // Only register if not already registered
      if (!this.registeredHandlers.has(handlerKey)) {
        this.socket.on(event, (...args: any[]) => {
          callback(...args)
        });
        this.registeredHandlers.add(handlerKey);
      }
    }

    return () => this.off(event, callback)
  }

  // Remove event handler
  off(event: string, callback: Function) {
    const handlers = this.handlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(callback)
      if (index !== -1) {
        handlers.splice(index, 1)

        // Also remove from registered handlers tracking
        const handlerKey = `${event}:${index}`;
        this.registeredHandlers.delete(handlerKey);

        // Clean up the Map entry if no handlers left
        if (handlers.length === 0) {
          this.handlers.delete(event);
        }
      }
    }

    // If socket is connected, we should also remove the listener from the socket
    // However, Socket.IO doesn't provide a way to remove a specific wrapped function
    // So we rely on the cleanupSocket() method during reconnections
  }

  // Emit event to server
  emit(event: string, ...args: any[]) {
    if (this.socket && this.connected) {
      try {
        this.socket.emit(event, ...args)
      } catch (error) {
        console.error(`Error emitting event ${event}:`, error)
        // Attempt reconnection if emission fails
        this.reconnect()
      }
    } else {
      console.warn('Socket not connected, cannot emit:', event)
      // Attempt to reconnect if not already connecting
      if (!this.pending && !this.connected) {
        this.connect()
      }
    }
  }

  // Disconnect socket
  disconnect() {
    this.stopHeartbeat()
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
      this.pending = false
      this.reconnectAttempts = 0
    }
  }

  isConnected() {
    return this.connected
  }

  // Manually trigger reconnection
  reconnect() {
    this.cleanupSocket()
    this.connected = false
    this.pending = false

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Reconnecting socket (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      setTimeout(() => {
        this.connect()
      }, 1000)
    } else {
      console.error(`Reached maximum reconnection attempts (${this.maxReconnectAttempts})`)
      // Reset attempts to allow manual reconnection later
      setTimeout(() => {
        this.reconnectAttempts = 0
      }, 30000)
    }
  }
}

export const socketService = new SocketService()
export default socketService
