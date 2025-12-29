import { useEffect } from 'react'
import { Socket } from 'socket.io-client'

export interface EventHandlers {
  [event: string]: (...args: any[]) => void
}

/**
 * Generic hook to subscribe to a Canvas WebSocket topic and wire event handlers.
 *
 * It automatically handles:
 *   • fastify-side `subscribe` / `unsubscribe` messages
 *   • attaching & detaching event listeners
 *
 * Usage example:
  *   useSocketSubscription(socket, 'agent', {
 *     'agent:created': (data) => { ... },
 *     'agent:deleted': (data) => { ... },
 *   })
 */
export function useSocketSubscription(
  socket: Socket | null,
  topic: string,
  handlers: EventHandlers
) {
  useEffect(() => {
    if (!socket) return

    // Subscribe to the channel once connected
    socket.emit('subscribe', { channel: topic })

    // Register event listeners
    for (const [event, handler] of Object.entries(handlers)) {
      socket.on(event, handler)
    }

    // Cleanup on unmount or socket change
    return () => {
      socket.emit('unsubscribe', { channel: topic })
      for (const [event, handler] of Object.entries(handlers)) {
        socket.off(event, handler as any)
      }
    }
  }, [socket, topic])
}
