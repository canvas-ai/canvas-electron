import { api } from '@/lib/api';
import { API_ROUTES } from '@/config/api';

// Role interfaces
export interface Role {
  id: string;
  name: string;
  type: 'global' | 'workspace';
  template: string;
  status: 'created' | 'configured' | 'starting' | 'running' | 'stopping' | 'stopped' | 'error' | 'removed';
  userId?: string;
  workspaceId?: string;
  createdAt: string;
  updatedAt: string;
  container?: {
    name: string;
    image: string;
    status: string;
  };
  scope?: string;
  communication?: string;
  capabilities?: Record<string, any>;
}

export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  version: string;
  type: 'global' | 'workspace';
  category: string;
  tags: string[];
  container: {
    image: string;
    ports?: Record<string, string>;
  };
  volumes?: Array<{
    host: string;
    container: string;
    mode: string;
  }>;
  environment?: Record<string, string>;
  lifecycle?: {
    autoStart?: boolean;
    dependencies?: string[];
  };
  resources?: {
    cpu?: string;
    memory?: string;
    storage?: string;
  };
  documentation?: {
    readme?: string;
    urls?: Record<string, string>;
  };
}

export interface CreateRoleData {
  template: string;
  name: string;
  type: 'global' | 'workspace';
  userId?: string;
  workspaceId?: string;
  config?: Record<string, any>;
}

export interface RoleLog {
  timestamp: string;
  message: string;
  level?: string;
}

export interface RoleStats {
  cpu?: {
    usage: number;
    limit: number;
  };
  memory?: {
    usage: number;
    limit: number;
  };
  network?: {
    rx: number;
    tx: number;
  };
}

export interface RoleHealth {
  status: 'healthy' | 'unhealthy' | 'stopped' | 'unknown';
  reason?: string;
  failingStreak?: number;
  log?: any[];
}

// Role Service
export const roleService = {
  /**
   * List all roles
   */
  async listRoles(filters?: {
    type?: string;
    userId?: string;
    workspaceId?: string;
    status?: string;
  }): Promise<Role[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.workspaceId) params.append('workspaceId', filters.workspaceId);
    if (filters?.status) params.append('status', filters.status);

    const queryString = params.toString();
    const url = queryString ? `${API_ROUTES.roles}?${queryString}` : API_ROUTES.roles;

    const response = await api.get<{ success: boolean; roles: Role[]; total: number }>(url);
    return response.roles || [];
  },

  /**
   * Get role by ID
   */
  async getRole(roleId: string): Promise<Role> {
    const response = await api.get<{ success: boolean; role: Role }>(`${API_ROUTES.roles}/${roleId}`);
    return response.role;
  },

  /**
   * Create a new role
   */
  async createRole(roleData: CreateRoleData): Promise<Role> {
    const response = await api.post<{ success: boolean; role: Role }>(API_ROUTES.roles, roleData);
    return response.role;
  },

  /**
   * Update role
   */
  async updateRole(roleId: string, updates: Partial<CreateRoleData>): Promise<Role> {
    const response = await api.put<{ success: boolean; role: Role }>(
      `${API_ROUTES.roles}/${roleId}`,
      updates
    );
    return response.role;
  },

  /**
   * Delete role
   */
  async deleteRole(roleId: string, force: boolean = false): Promise<void> {
    const params = force ? '?force=true' : '';
    await api.delete(`${API_ROUTES.roles}/${roleId}${params}`);
  },

  /**
   * Start role
   */
  async startRole(roleId: string): Promise<Role> {
    const response = await api.post<{ success: boolean; role: Role }>(
      `${API_ROUTES.roles}/${roleId}/start`,
      {}
    );
    return response.role;
  },

  /**
   * Stop role
   */
  async stopRole(roleId: string): Promise<void> {
    await api.post(`${API_ROUTES.roles}/${roleId}/stop`, {});
  },

  /**
   * Restart role
   */
  async restartRole(roleId: string): Promise<Role> {
    const response = await api.post<{ success: boolean; role: Role }>(
      `${API_ROUTES.roles}/${roleId}/restart`,
      {}
    );
    return response.role;
  },

  /**
   * Get role logs
   */
  async getRoleLogs(roleId: string, tail: number = 100): Promise<string[]> {
    const response = await api.get<{ success: boolean; logs: string[] }>(
      `${API_ROUTES.roles}/${roleId}/logs?tail=${tail}`
    );
    return response.logs || [];
  },

  /**
   * Get role stats
   */
  async getRoleStats(roleId: string): Promise<RoleStats> {
    const response = await api.get<{ success: boolean; stats: RoleStats }>(
      `${API_ROUTES.roles}/${roleId}/stats`
    );
    return response.stats;
  },

  /**
   * Get role health
   */
  async getRoleHealth(roleId: string): Promise<RoleHealth> {
    const response = await api.get<{ success: boolean; health: RoleHealth }>(
      `${API_ROUTES.roles}/${roleId}/health`
    );
    return response.health;
  },

  /**
   * List available role templates
   */
  async listTemplates(): Promise<RoleTemplate[]> {
    const response = await api.get<{ success: boolean; templates: RoleTemplate[] }>(
      `${API_ROUTES.roleTemplates}`
    );
    return response.templates || [];
  },

  /**
   * Get role template by name
   */
  async getTemplate(templateName: string): Promise<RoleTemplate> {
    const response = await api.get<{ success: boolean; template: RoleTemplate }>(
      `${API_ROUTES.roleTemplates}/${templateName}`
    );
    return response.template;
  },
};
