import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_ROUTES } from '@/config/api';

/**
 * Shared Socket.io hook used across the frontend.
 *
 * It looks for the authentication token stored by the `api` helper – this is
 * always saved under the localStorage key `authToken` (see `api.setAuthToken`).
 *
 * Prior to this change the hook was reading from the key `token`, which was
 * never set by our authentication flow. The result was that an **empty token**
 * was sent during the WebSocket handshake and the server responded with
 * `JWT verification failed: invalid signature`. Using the correct key fixes
 * the handshake for all pages that rely on real-time updates (agents,
 * workspaces, contexts …).
 */
export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // Retrieve the token using the same key as the REST helper
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const socketInstance = io(API_ROUTES.ws, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('WebSocket connected');
    });

    socketInstance.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    socketInstance.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.close();
    };
  }, []);

  return socket;
}

