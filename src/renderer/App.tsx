import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import LoginPage from './pages/auth/login'
import RegisterPage from './pages/auth/register'
import WorkspacesPage from './pages/workspaces'
import WorkspaceDetailPage from './pages/workspaces/[workspaceName]'
import HomePage from './pages/home'
import { ProtectedRoute } from './components/auth/protected-route'
import { PublicRoute } from './components/auth/public-route'
import ContextsPage from './pages/contexts'
import ContextDetailPage from './pages/contexts/[contextId]'
import ApiTokensPage from './pages/api-tokens'
import SharedViewerPage from './pages/shared'
import AdminWorkspacesPage from './pages/admin/workspaces'
import AdminContextsPage from './pages/admin/contexts'
import AdminAgentsPage from './pages/admin/agents'
import AdminRolesPage from './pages/admin/roles'
import AdminUsersPage from './pages/admin/users'
import AgentsPage from './pages/agents'
import AgentDetailPage from './pages/agents/[agentId]'
import RolesPage from './pages/roles'
import RemotesPage from './pages/remotes'
import { DashboardLayout } from './components/layouts/dashboard-layout'
import { ToastContainer, useToast } from './components/ui/toast-container'
import { setGlobalErrorHandler } from './lib/error-handler'
import { Loader } from './components/ui/loader'
import { api } from './lib/api'
import { setApiUrl } from './config/api'

function AppContent() {
  const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter
  const { showToast } = useToast()
  const [bootstrapped, setBootstrapped] = useState(false)

  useEffect(() => {
    // Set up global error handler for API errors
    setGlobalErrorHandler((error: Error, context?: string) => {
      showToast({
        title: 'Error',
        description: context ? `${error.message} (${context})` : error.message,
        variant: 'destructive'
      })
    })
  }, [showToast])

  useEffect(() => {
    ;(async () => {
      try {
        const session = await window.electronAPI?.getAuthSession?.()
        if (session?.apiUrl) setApiUrl(session.apiUrl)
        if (session?.token) api.setAuthToken(session.token)
      } finally {
        setBootstrapped(true)
      }
    })()
  }, [])

  if (!bootstrapped) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader className="h-8 w-8" />
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* Authentication routes */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Dashboard layout for authenticated routes */}
        <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/workspaces" replace />} />
          <Route path="home" element={<HomePage />} />
          <Route path="workspaces" element={<WorkspacesPage />} />
          <Route path="workspaces/:workspaceName" element={<WorkspaceDetailPage />} />
          <Route path="workspaces/:workspaceName/*" element={<WorkspaceDetailPage />} />
          <Route path="contexts" element={<ContextsPage />} />
          <Route path="contexts/:contextId" element={<ContextDetailPage />} />
          <Route path="users/:userId/contexts/:contextId" element={<ContextDetailPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="agents/:agentId" element={<AgentDetailPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="remotes" element={<RemotesPage />} />
          <Route path="api-tokens" element={<ApiTokensPage />} />
          <Route path="shared" element={<SharedViewerPage />} />

          {/* Admin routes */}
          <Route path="admin/users" element={<AdminUsersPage />} />
          <Route path="admin/contexts" element={<AdminContextsPage />} />
          <Route path="admin/workspaces" element={<AdminWorkspacesPage />} />
          <Route path="admin/agents" element={<AdminAgentsPage />} />
          <Route path="admin/roles" element={<AdminRolesPage />} />
        </Route>

        {/* Catch-all redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

function App() {
  return (
    <ToastContainer>
      <AppContent />
    </ToastContainer>
  )
}

export default App
