import { getApiUrl } from '@/config/api'
import { handleApiError } from './error-handler'

// Keep track of redirects to prevent loops
let isRedirecting = false;

function getAppName(): string {
  let appName = localStorage.getItem('appName')
  if (!appName) {
    appName = window.location.hostname
    localStorage.setItem('appName', appName)
  }
  return appName
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

// Get the authorization token from localStorage
function getAuthToken(): string | null {
  const token = localStorage.getItem('authToken');
  return token;
}

// Validate that a token is either a valid JWT or API token
function isValidTokenFormat(token: string): boolean {
  if (!token) return false;

  // Check for API token format (starts with canvas-)
  if (token.startsWith('canvas-') && token.length > 10) {
    return true;
  }

  // Basic JWT structure validation
  const jwtRegex = /^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/;
  return jwtRegex.test(token);
}

async function fetchWithDefaults(endpoint: string, options: RequestOptions = {}): Promise<Response> {
  const { skipAuth = false, headers = {}, body, ...rest } = options;

  // Don't make requests if we're already redirecting
  if (isRedirecting && !skipAuth) {
    throw new Error('Authentication required');
  }

  // Get auth token if available and not explicitly skipped
  const authToken = !skipAuth ? getAuthToken() : null;

  // For authenticated requests, verify we have a valid token
  if (!skipAuth && !authToken) {
    console.warn('Attempting authenticated request without token');
    isRedirecting = true;
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Authentication required');
  }

  // Validate token format for authenticated requests
  if (!skipAuth && authToken && !isValidTokenFormat(authToken)) {
    console.warn('Invalid token format detected, clearing');
    localStorage.removeItem('authToken');
    isRedirecting = true;
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Invalid authentication token format');
  }

  // Merge default headers with provided headers
  const defaultHeaders: HeadersInit = {
    'X-App-Name': getAppName(),
    ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    ...headers,
  };

  let requestBody = body;

  // If Content-Type is application/json and body is undefined, ensure body is at least null or an empty string for some servers.
  // However, Fastify specifically complains about empty body with this content-type.
  // The best approach is to ensure Content-Type is only set when a JSON body *exists*.

  // Log request for debugging
  // Enhanced logging for body to avoid printing large objects
  let loggedBody: any = requestBody;
  if (typeof requestBody === 'string' && requestBody.length > 200) {
    loggedBody = requestBody.substring(0, 200) + '...[TRUNCATED]';
  } else if (typeof requestBody === 'object' && requestBody !== null) {
    loggedBody = '[OBJECT]'; // Avoid logging potentially large objects
  }

  console.log(`API Request: ${rest.method || 'GET'} ${endpoint}`, {
    headers: { ...defaultHeaders, Authorization: authToken ? 'Bearer [REDACTED]' : undefined },
    body: loggedBody
  });

  // Construct the full URL if a relative path is provided
  const url = endpoint.startsWith('http') ? endpoint : `${getApiUrl()}${endpoint}`;

  try {
    const response = await fetch(url, {
      credentials: 'include', // Always include credentials for cookie support
      headers: defaultHeaders,
      body: requestBody,
      ...rest,
    });

    // Log response status for debugging
    console.log(`API Response: ${endpoint}`, {
      status: response.status,
      ok: response.ok
    });

    if (!response.ok) {
      // Handle 401 Unauthorized specifically
      if (response.status === 401 && !skipAuth && !isRedirecting) {
        console.error('Authentication failed, redirecting to login');

        // Clear token if authentication failed
        localStorage.removeItem('authToken');

        // Set redirecting flag
        isRedirecting = true;

        // Only redirect if we're not already on the login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }

        throw new Error('Authentication required');
      }

      // For other errors, try to get error message from response
      try {
        const errorData = await response.json();
        console.error('API Error response:', errorData);

        // Extract the most detailed error message available
        const errorMessage = errorData.message || errorData.error || response.statusText || 'Request failed';
        const error = new Error(errorMessage);
        handleApiError(error, `${rest.method || 'GET'} ${endpoint}`);
        throw error;
              } catch (jsonError) {
          // If we can't parse the error as JSON, just use the status text
          const error = new Error(response.statusText || 'Request failed');
          handleApiError(error, `${rest.method || 'GET'} ${endpoint}`);
          throw error;
        }
    }

    // Reset redirecting flag on successful response
    isRedirecting = false;
    return response;
  } catch (error) {
    // Check if this is a CORS error
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error(`API Error: CORS error or network failure for ${endpoint}`);
      const networkError = new Error(`Network error: The server might be unavailable or CORS might be misconfigured. Please check your connection and try again.`);
      handleApiError(networkError, `${rest.method || 'GET'} ${endpoint}`);
      throw networkError;
    }

    // Log network errors
    console.error(`API Error: ${endpoint}`, error);
    if (error instanceof Error) {
      handleApiError(error, `${rest.method || 'GET'} ${endpoint}`);
    }
    throw error;
  }
}

// Helper methods for common HTTP methods
export const api = {
  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetchWithDefaults(endpoint, {
      method: 'GET',
      ...options,
    });
    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return Promise.resolve(undefined as T);
    }
    return response.json();
  },

  async post<T>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    let bodyContent: RequestInit['body'];
    const currentHeaders: Record<string, string> = { ...options.headers } as Record<string, string>;

    if (data !== undefined) {
      if (typeof data === 'object' && data !== null && !(data instanceof FormData) && !(data instanceof URLSearchParams) && !(data instanceof Blob)) {
        bodyContent = JSON.stringify(data);
        if (!currentHeaders['Content-Type']) {
            currentHeaders['Content-Type'] = 'application/json';
        }
      } else {
        bodyContent = data as BodyInit;
      }
    }

    const response = await fetchWithDefaults(endpoint, {
      method: 'POST',
      ...options,
      headers: currentHeaders,
      body: bodyContent,
    });

    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return Promise.resolve(undefined as T);
    }

    // Parse the response
    const jsonResponse = await response.json();

    // Log the raw response for debugging
    console.log('API response data:', jsonResponse);

    return jsonResponse;
  },

  async put<T>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    let bodyContent: RequestInit['body'];
    const currentHeaders: Record<string, string> = { ...options.headers } as Record<string, string>;

    if (data !== undefined) {
      if (typeof data === 'object' && data !== null && !(data instanceof FormData) && !(data instanceof URLSearchParams) && !(data instanceof Blob)) {
        bodyContent = JSON.stringify(data);
        if (!currentHeaders['Content-Type']) {
            currentHeaders['Content-Type'] = 'application/json';
        }
      } else {
        bodyContent = data as BodyInit;
      }
    }

    const response = await fetchWithDefaults(endpoint, {
      method: 'PUT',
      ...options,
      headers: currentHeaders,
      body: bodyContent,
    });
    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return Promise.resolve(undefined as T);
    }
    return response.json();
  },

  async patch<T>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    let bodyContent: RequestInit['body'];
    const currentHeaders: Record<string, string> = { ...options.headers } as Record<string, string>;

    if (data !== undefined) {
      if (typeof data === 'object' && data !== null && !(data instanceof FormData) && !(data instanceof URLSearchParams) && !(data instanceof Blob)) {
        bodyContent = JSON.stringify(data);
        if (!currentHeaders['Content-Type']) {
            currentHeaders['Content-Type'] = 'application/json';
        }
      } else {
        bodyContent = data as BodyInit;
      }
    }

    const response = await fetchWithDefaults(endpoint, {
      method: 'PATCH',
      ...options,
      headers: currentHeaders,
      body: bodyContent,
    });
    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return Promise.resolve(undefined as T);
    }
    return response.json();
  },

  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const currentHeaders: Record<string, string> = { ...options.headers } as Record<string, string>;

    // If Content-Type was 'application/json' and there's no body,
    // it's problematic. Remove it to prevent the server error.
    // User can still explicitly set a Content-Type in options.headers if needed.
    if (currentHeaders['Content-Type'] === 'application/json' && !options.body) {
        delete currentHeaders['Content-Type'];
    }

    const response = await fetchWithDefaults(endpoint, {
      method: 'DELETE',
      ...options,
      headers: currentHeaders,
    });
    if (response.status === 204 || response.headers.get('content-length') === '0') {
        return Promise.resolve(undefined as T);
    }
    return response.json();
  },

  // Helper function to set auth token after login
  setAuthToken(token: string): void {
    if (!token) {
      console.warn('Attempted to set empty auth token');
      return;
    }

    // Validate token before setting
    if (!isValidTokenFormat(token)) {
      console.error('Attempted to set invalid token format:', token.substring(0, 10) + '...');
      return;
    }

    localStorage.setItem('authToken', token);
    console.log('Auth token set successfully');

    // Reset redirect flag when setting a new token
    isRedirecting = false;
  },

  // Helper function to clear auth token on logout
  clearAuthToken(): void {
    localStorage.removeItem('authToken');
    console.log('Auth token cleared');
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = getAuthToken();
    return !!token && isValidTokenFormat(token);
  },

  // Streaming API method for real-time data
  async stream(
    endpoint: string,
    data?: unknown,
    options: {
      onChunk?: (chunk: string) => void;
      onError?: (error: Error) => void;
      onComplete?: () => void;
      signal?: AbortSignal;
    } = {}
  ): Promise<void> {
    const { onChunk, onError, onComplete, signal } = options;

    try {
      let bodyContent: RequestInit['body'];
      const currentHeaders: Record<string, string> = {};

      if (data !== undefined) {
        if (typeof data === 'object' && data !== null && !(data instanceof FormData) && !(data instanceof URLSearchParams) && !(data instanceof Blob)) {
          bodyContent = JSON.stringify(data);
          currentHeaders['Content-Type'] = 'application/json';
        } else {
          bodyContent = data as BodyInit;
        }
      }

      const response = await fetchWithDefaults(endpoint, {
        method: 'POST',
        headers: currentHeaders,
        body: bodyContent,
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if the response body exists and supports streaming
      if (!response.body) {
        throw new Error('Response body is null - streaming not supported');
      }

      // Check if getReader is available on the response body
      if (typeof response.body.getReader !== 'function') {
        // Fallback: try to read the entire response as text
        console.warn('ReadableStream.getReader not available, falling back to text response');
        const text = await response.text();
        if (onChunk) {
          onChunk(text);
        }
        if (onComplete) {
          onComplete();
        }
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          // Check for abort signal
          if (signal?.aborted) {
            reader.cancel();
            throw new Error('Stream aborted');
          }

          const { done, value } = await reader.read();

          if (done) {
            if (onComplete) {
              onComplete();
            }
            break;
          }

          // Decode the chunk and process it
          const chunk = decoder.decode(value, { stream: true });
          if (chunk && onChunk) {
            onChunk(chunk);
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error('Streaming error:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
      throw error;
    }
  }
}
