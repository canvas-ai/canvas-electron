import { API_ROUTES } from '@/config/api'
import { api } from '@/lib/api'
import { openWorkspace } from './workspace'
import socketService from '@/lib/socket'
import { jwtDecode } from 'jwt-decode'

interface UserProfile {
  id: string;
  email: string;
  userType: string;
  status: string;
  created: string;
  updated: string;
}

interface TokenPayload {
  sub: string;
  email: string;
  userType: string;
  ver?: string;
  exp: number;
}

// Define two possible response structures
interface DirectLoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    userType: string;
  };
}

interface NestedLoginResponse {
  payload: {
    token: string;
    user: {
      id: string;
      email: string;
      userType: string;
    };
  };
}

// Generic API response
interface ApiResponse<T> {
  status: string;
  statusCode: number;
  message: string;
  payload: T;
}

// Union type for possible login response structures
type LoginResponseData = DirectLoginResponse | NestedLoginResponse;

export async function loginUser(email: string, password: string, strategy: string = 'auto'): Promise<ApiResponse<any>> {
  try {
    const response = await api.post<ApiResponse<LoginResponseData>>(API_ROUTES.login, {
      email,
      password,
      strategy,
    }, { skipAuth: true });

    console.log('Login response:', response);

    // Check if the response has the expected structure
    const loginData = response.payload;

    // Handle direct token structure (matches DirectLoginResponse)
    if ('token' in loginData) {
      console.log('Setting auth token (direct):', loginData.token.substring(0, 10) + '...');
      api.setAuthToken(loginData.token);

      // Connect WebSocket after successful login
      socketService.connect(loginData.token);

      // After successful login, attempt to open the universe workspace immediately
      try {
        console.log('Attempting to open universe workspace after login');
        await openWorkspace('universe');
      } catch (error) {
        console.warn('Failed to automatically open universe workspace:', error);
      }

      return response;
    }
    // Handle nested payload structure (matches NestedLoginResponse)
    else if (loginData && 'payload' in loginData && loginData.payload && loginData.payload.token) {
      console.log('Setting auth token (nested):', loginData.payload.token.substring(0, 10) + '...');
      api.setAuthToken(loginData.payload.token);

      // Connect WebSocket after successful login
      socketService.connect(loginData.payload.token);

      // After successful login, attempt to open the universe workspace immediately
      try {
        console.log('Attempting to open universe workspace after login');
        await openWorkspace('universe');
      } catch (error) {
        console.warn('Failed to automatically open universe workspace:', error);
      }

      return response;
    } else {
      console.error('Invalid login response structure:', response);
      throw new Error('Invalid login response: missing token');
    }
  } catch (error) {
    // Clear any existing token on error
    console.error('Login error:', error);
    api.clearAuthToken();
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    // Call logout endpoint
    await api.post(API_ROUTES.logout, {});

    // Disconnect WebSocket
    socketService.disconnect();

    // Clear the token regardless of server response
    api.clearAuthToken();

    console.log('User logged out successfully');
  } catch (error) {
    // Still disconnect and clear token on error
    socketService.disconnect();
    api.clearAuthToken();
    console.error('Logout had issues, but token was cleared:', error);
  }
}

export async function registerUser(name: string, email: string, password: string): Promise<any> {
  try {
    return await api.post(API_ROUTES.register, {
      name,
      email,
      password
    }, { skipAuth: true });
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}

export function getCurrentUserFromToken(): { id: string; email: string; userType: string } | null {
  const token = localStorage.getItem('authToken');
  if (!token) return null;

  try {
    const decoded = jwtDecode<TokenPayload>(token);
    // Check if token is expired
    if (decoded.exp * 1000 < Date.now()) {
      // Token is expired, clear it
      api.clearAuthToken();
      return null;
    }

    return {
      id: decoded.sub,
      email: decoded.email,
      userType: decoded.userType || 'user'
    };
  } catch (error) {
    console.error('Failed to decode token:', error);
    api.clearAuthToken(); // Clear invalid token
    return null;
  }
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    // If not authenticated, don't make the request
    if (!api.isAuthenticated()) {
      console.log('Not authenticated, skipping getCurrentUser request');
      return null;
    }

    const response = await api.get<ApiResponse<UserProfile>>(API_ROUTES.me);
    console.log('Current user response:', response);

    // Extract user from the response payload
    if (response && response.payload) {
      // Ensure WebSocket is connected if we have a valid user
      if (!socketService.isConnected()) {
        socketService.reconnect();
      }
      return response.payload;
    } else {
      console.warn('Invalid user profile response structure:', response);
      return null;
    }
  } catch (error) {
    console.error('Failed to get current user:', error);

    // Handle the specific case where user exists in token but not in database
    if (error instanceof Error &&
        (error.message.includes('USER_NOT_FOUND_IN_DATABASE') ||
         error.message.includes('Your session is invalid'))) {
      console.warn('User token is valid but user not found in database - clearing authentication');
      api.clearAuthToken();
      socketService.disconnect();
      return null;
    }

    // Handle authentication errors (401 responses)
    if (error instanceof Error &&
        (error.message.includes('Authentication required') ||
         error.message.includes('user account no longer exists') ||
         error.message.includes('Network error'))) {
      console.warn('Authentication error detected, clearing token:', error.message);
      api.clearAuthToken();
      socketService.disconnect();
      return null;
    }

    console.error('Failed to get current user:', error);
    return null;
  }
}

export function isAuthenticated(): boolean {
  return api.isAuthenticated();
}

export async function getAuthConfig(): Promise<any> {
  try {
    const response = await api.get<ApiResponse<any>>(API_ROUTES.authConfig, { skipAuth: true });
    return response.payload || response;
  } catch (error) {
    console.error('Failed to get auth config:', error);
    // Return default config if API call fails
    return {
      strategies: {
        local: { enabled: true },
        imap: { enabled: false, domains: [] }
      }
    };
  }
}

export async function requestEmailVerification(email: string): Promise<void> {
  try {
    await api.post(API_ROUTES.verifyEmailRequest, { email }, { skipAuth: true });
  } catch (error) {
    console.error('Failed to request email verification:', error);
    throw error;
  }
}
