import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/toast-container"
import { Plus, Trash, Edit2, X } from "lucide-react"
import { adminService, AdminUser, CreateUserData, UpdateUserData } from "@/services/admin"
import { getCurrentUserFromToken, getAuthConfig, requestEmailVerification } from "@/services/auth"

// Define form data interface
interface UserFormData {
  name: string;
  email: string;
  password: string;
  userType: 'user' | 'admin';
  status: 'active' | 'inactive' | 'pending' | 'deleted';
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [requireEmailVerification, setRequireEmailVerification] = useState<boolean>(false)
  const [filters, setFilters] = useState({
    status: '',
    userType: '',
    search: ''
  })

  // Form data for creating/editing users
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    userType: 'user',
    status: 'active'
  })

  const { showToast } = useToast()
  const currentUser = getCurrentUserFromToken()

  // Check if current user is admin
  const isCurrentUserAdmin = currentUser?.userType === 'admin'

  useEffect(() => {
    if (!isCurrentUserAdmin) {
      setError('Access denied. Admin privileges required.')
      setIsLoading(false)
      return
    }
    fetchUsers()
    // load auth config to decide on resend activation visibility
    ;(async () => {
      try {
        const conf = await getAuthConfig()
        const req = !!conf?.strategies?.local?.requireEmailVerification
        setRequireEmailVerification(req)
      } catch (_) {
        setRequireEmailVerification(false)
      }
    })()
  }, [isCurrentUserAdmin])
  const formatDate = (value?: string) => {
    if (!value) return '-'
    const d = new Date(value)
    return isNaN(d.getTime()) ? '-' : d.toLocaleString()
  }

  const handleResendActivation = async (email: string) => {
    try {
      await requestEmailVerification(email)
      showToast({ title: 'Verification email', description: 'If the account exists, a verification email was sent.' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send verification email'
      showToast({ title: 'Error', description: message, variant: 'destructive' })
    }
  }

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      const { status, userType } = filters
      const fetchedUsers = await adminService.users.listUsers({
        status: status || undefined,
        userType: userType || undefined
      })
      setUsers(fetchedUsers)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users'
      setError(message)
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [filters, showToast])

  useEffect(() => {
    if (isCurrentUserAdmin) {
      fetchUsers()
    }
  }, [fetchUsers, isCurrentUserAdmin])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast({
        title: 'Validation Error',
        description: 'Name and email are required',
        variant: 'destructive'
      })
      return
    }

    setIsCreating(true)
    try {
      const userData: CreateUserData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        userType: formData.userType,
        status: formData.status
      }

      // Only include password if provided
      if (formData.password.trim()) {
        userData.password = formData.password
      }

      await adminService.users.createUser(userData)

      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        userType: 'user',
        status: 'active'
      })
      setIsModalOpen(false)

      await fetchUsers()
      showToast({
        title: 'Success',
        description: 'User created successfully'
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create user'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setIsCreating(true)
    try {
      const userData: UpdateUserData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        userType: formData.userType,
        status: formData.status
      }

      await adminService.users.updateUser(editingUser.id, userData)

      setEditingUser(null)
      setIsModalOpen(false)

      await fetchUsers()
      showToast({
        title: 'Success',
        description: 'User updated successfully'
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update user'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return
    }

    try {
      await adminService.users.deleteUser(userId)
      await fetchUsers()
      showToast({
        title: 'Success',
        description: 'User deleted successfully'
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete user'
      showToast({
        title: 'Error',
        description: message,
        variant: 'destructive'
      })
    }
  }

  const openCreateModal = () => {
    setEditingUser(null)
    setFormData({
      name: '',
      email: '',
      password: '',
      userType: 'user',
      status: 'active'
    })
    setIsModalOpen(true)
  }

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Don't pre-fill password for security
      userType: user.userType,
      status: user.status
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
  }

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    const matchesSearch = filters.search === '' ||
      user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.email.toLowerCase().includes(filters.search.toLowerCase())
    return matchesSearch
  })

  if (!isCurrentUserAdmin) {
    return (
      <div className="text-center space-y-4">
        <div className="text-destructive">Access denied. Admin privileges required.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-2">Manage user accounts and permissions</p>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            placeholder="Search users..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="md:w-64"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="deleted">Deleted</option>
          </select>
          <select
            value={filters.userType}
            onChange={(e) => setFilters(prev => ({ ...prev, userType: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Types</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Create User
        </Button>
      </div>

      {/* Users Table */}
      <div className="space-y-4">
        {isLoading && <p className="text-center text-muted-foreground">Loading users...</p>}

        {error && !users.length && (
          <div className="text-center text-destructive">
            <p>{error}</p>
          </div>
        )}

        {!isLoading && !error && filteredUsers.length === 0 && (
          <p className="text-center text-muted-foreground">No users found</p>
        )}

        {filteredUsers.length > 0 && (
          <div className="border rounded-md">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Created</th>
                    <th className="text-left p-3 font-medium">Updated</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-t">
                      <td className="p-3 font-medium">{user.name}</td>
                      <td className="p-3">{user.email}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.userType === 'admin'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.userType}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : user.status === 'inactive'
                            ? 'bg-yellow-100 text-yellow-800'
                            : user.status === 'pending'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="p-3">{formatDate(user.createdAt)}</td>
                      <td className="p-3">{formatDate(user.updatedAt)}</td>
                      <td className="p-3 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(user)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {requireEmailVerification && user.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendActivation(user.email)}
                            title="Resend activation email"
                          >
                            Resend activation
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={user.id === currentUser?.id}
                          title={user.id === currentUser?.id ? "Cannot delete your own account" : "Delete user"}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h3>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
              <div>
                <Label htmlFor="name">Username</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter username"
                  disabled={isCreating}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  3-39 characters, lowercase letters, numbers, underscores, and hyphens only
                </p>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                  disabled={isCreating}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">
                  Password {editingUser && '(leave blank to keep current)'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                  disabled={isCreating}
                  required={!editingUser}
                />
                {!editingUser && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Must be at least 8 characters long
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="userType">User Type</Label>
                <select
                  id="userType"
                  value={formData.userType}
                  onChange={(e) => setFormData(prev => ({ ...prev, userType: e.target.value as 'user' | 'admin' }))}
                  disabled={isCreating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'pending' | 'deleted' }))}
                  disabled={isCreating}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                  <option value="deleted">Deleted</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1"
                >
                  {isCreating ? 'Processing...' : editingUser ? 'Update User' : 'Create User'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
