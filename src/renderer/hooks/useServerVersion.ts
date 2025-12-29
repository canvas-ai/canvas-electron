import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface ServerInfo {
  appName: string;
  version: string;
  status: string;
}

interface UseServerVersionReturn {
  serverVersion: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useServerVersion(): UseServerVersionReturn {
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchServerVersion() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await api.get<{
          status: string;
          statusCode: number;
          message: string;
          payload: ServerInfo;
        }>('/ping', { skipAuth: true });

        if (isMounted) {
          if (response.status === 'success' && response.statusCode === 200 && response.payload?.version) {
            setServerVersion(response.payload.version);
          } else {
            setError('Invalid server response');
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to fetch server version:', err);
          setError('Unable to connect to server');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchServerVersion();

    // Set up periodic refresh every 30 seconds
    const interval = setInterval(fetchServerVersion, 30000);

    // Cleanup function
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return {
    serverVersion,
    isLoading,
    error,
  };
}
