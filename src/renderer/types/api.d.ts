interface User {
  id: string
  email: string
  createdAt: string
  updatedAt: string
  userType?: string
  status?: string
}

interface Session {
  id: string
  initializer: string
  user: User
  createdAt: string
  lastActiveAt: string
  isActive: boolean
}

interface Workspace {
  id: string
  name: string
  description: string
  owner: string
  createdAt: string
  updatedAt: string
  status: 'available' | 'not_found' | 'error' | 'active' | 'inactive' | 'removed' | 'destroyed'
  type?: string
  color?: string
  label?: string
  acl: {
    tokens: {
      [tokenHash: string]: {
        permissions: ('read' | 'write' | 'admin')[]
        description: string
        createdAt: string
        expiresAt: string | null
      }
    }
  }
  rootPath?: string
  configPath?: string
  lastAccessed?: string | null
}

interface Context {
  id: string
  url: string
  description?: string
  createdAt: string
  updatedAt: string
  workspace: string
  workspaceId?: string
  workspaceName?: string
  userId: string
  baseUrl?: string
  path?: string
  pathArray?: string[]
  locked?: boolean
  serverContextArray?: any[]
  clientContextArray?: any[]
  contextBitmapArray?: any[]
  featureBitmapArray?: any[]
  filterArray?: any[]
  pendingUrl?: string | null
}

interface ApiToken {
  id: string
  name: string
  createdAt: string
  lastUsedAt: string
  expiresAt: string
}

interface ApiResponse<T = any> {
  status: string
  statusCode: number
  message: string
  payload: T
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
  includeSession?: boolean
}
