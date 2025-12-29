import { api } from '@/lib/api';
import { API_ROUTES } from '@/config/api';

// Admin User interfaces
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  userType: 'user' | 'admin';
  status: 'active' | 'inactive' | 'pending' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password?: string;
  userType?: 'user' | 'admin';
  status?: 'active' | 'inactive' | 'pending' | 'deleted';
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  userType?: 'user' | 'admin';
  status?: 'active' | 'inactive' | 'pending' | 'deleted';
}

// Admin Workspace interfaces
export interface AdminWorkspace {
  id: string;
  name: string;
  label: string;
  description: string;
  color: string;
  owner: string;
  ownerName?: string;
  ownerEmail?: string;
  status: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceData {
  userId: string;
  name: string;
  label?: string;
  description?: string;
  color?: string;
  type?: 'workspace' | 'universe';
  metadata?: Record<string, any>;
}

// User Management Services
export const adminUserService = {
  /**
   * List all users
   */
  async listUsers(filters?: { status?: string; userType?: string }): Promise<AdminUser[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.userType) params.append('userType', filters.userType);

    const queryString = params.toString();
    const url = queryString ? `${API_ROUTES.admin.users}?${queryString}` : API_ROUTES.admin.users;

    const response = await api.get<ApiResponse<AdminUser[]>>(url);
    return response.payload;
  },

  /**
   * Get user by ID
   */
  async getUser(userId: string): Promise<AdminUser> {
    const response = await api.get<ApiResponse<AdminUser>>(`${API_ROUTES.admin.users}/${userId}`);
    return response.payload;
  },

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserData): Promise<AdminUser> {
    const response = await api.post<ApiResponse<AdminUser>>(API_ROUTES.admin.users, userData);
    return response.payload;
  },

  /**
   * Update user
   */
  async updateUser(userId: string, userData: UpdateUserData): Promise<AdminUser> {
    const response = await api.put<ApiResponse<AdminUser>>(`${API_ROUTES.admin.users}/${userId}`, userData);
    return response.payload;
  },

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    await api.delete(`${API_ROUTES.admin.users}/${userId}`);
  },
};

// Workspace Management Services
export const adminWorkspaceService = {
  /**
   * List all workspaces (admin view)
   */
  async listAllWorkspaces(): Promise<AdminWorkspace[]> {
    const response = await api.get<ApiResponse<AdminWorkspace[]>>(API_ROUTES.admin.workspaces);
    return response.payload;
  },

  /**
   * Create workspace for user
   */
  async createWorkspace(workspaceData: CreateWorkspaceData): Promise<AdminWorkspace> {
    const response = await api.post<ApiResponse<AdminWorkspace>>(API_ROUTES.admin.workspaces, workspaceData);
    return response.payload;
  },

  /**
   * Delete workspace
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    await api.delete(`${API_ROUTES.admin.workspaces}/${workspaceId}`);
  },
};

// Combined admin service
export const adminService = {
  users: adminUserService,
  workspaces: adminWorkspaceService,
};
