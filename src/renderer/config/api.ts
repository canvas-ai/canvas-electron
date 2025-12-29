const DEFAULT_API_URL = 'http://localhost:8001/rest/v2'

export function getApiUrl(): string {
  return localStorage.getItem('canvasApiUrl') || import.meta.env.VITE_API_URL || DEFAULT_API_URL
}

export function setApiUrl(apiUrl: string) {
  localStorage.setItem('canvasApiUrl', apiUrl)
}

export function getWsUrl(): string {
  // Don't convert to WebSocket protocol here - the socket.io client will handle that
  return getApiUrl().split('/rest')[0]
}

export const API_ROUTES = {
  // Auth routes
  login: `/auth/login`,
  register: `/auth/register`,
  logout: `/auth/logout`,
  me: `/auth/me`,
  authConfig: `/auth/config`,
  verifyEmailRequest: `/auth/verify-email`,

  // API Tokens
  tokens: `/auth/tokens`,

  // Users
  users: `/users`,
  currentUser: `/auth/me`,

  // Workspaces
  workspaces: `/workspaces`,

  // Contexts
  contexts: `/contexts`,

  // Admin routes
  admin: {
    users: `/admin/users`,
    workspaces: `/admin/workspaces`,
  },

  // Roles
  roles: `/roles`,
  roleTemplates: `/role-templates`,
}
