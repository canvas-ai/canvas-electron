import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { useState, useEffect, useCallback } from "react"
import { LogOut, LayoutGrid, Layers3, Settings, FolderOpen, Brain, Shield, Server, Users, PanelLeftClose, PanelLeftOpen, Minus, Square, X, Power } from "lucide-react"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast-container"
import { getCurrentUserFromToken } from "@/services/auth"
import { listContexts } from "@/services/context"
import { listWorkspaces } from "@/services/workspace"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

function getWorkspaceStatusIndicator(status: string) {
  switch (status) {
    case 'active':
      return <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2" title="Running" />
    case 'inactive':
    case 'available':
      return <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-2" title="Stopped" />
    case 'error':
      return <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2" title="Error" />
    default:
      return <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-2" title={status} />
  }
}

function NavList({ title, items, type, isLoading, navigateTo, currentPath, className, onClose }: any) {
  return (
    <div className={`bg-sidebar flex flex-col h-full shrink-0 ${className}`}>
      <div className="p-4 border-b h-[60px] flex items-center justify-between font-semibold text-sm shrink-0">
        <span>{title}</span>
        {onClose && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <PanelLeftClose className="h-4 w-4" />
            </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-2 mb-2">
           <button
             onClick={() => navigateTo(`/${type}`)}
             className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${currentPath === `/${type}` ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-muted-foreground'}`}
           >
             All {title}
           </button>
        </div>
        {isLoading ? (
          <div className="px-5 py-2 text-xs text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-1 px-2">
            {items.map((item: any) => {
               const path = type === 'contexts' ? `/contexts/${item.id}` : `/workspaces/${item.name}`;
               const isActive = currentPath === path;
               const isInactive = type === 'workspaces' && item.status !== 'active';
               return (
                <button
                  key={item.id}
                  onClick={() => !isInactive && navigateTo(path)}
                  disabled={isInactive}
                  className={`w-full flex items-center text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    isInactive
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  } ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-muted-foreground'}`}
                  title={type === 'contexts' ? item.id : `${item.label || item.name}${isInactive ? ' (inactive - start to access)' : ''}`}
                >
                  {type === 'workspaces' && getWorkspaceStatusIndicator(item.status)}
                  <span className="truncate">{type === 'contexts' ? item.id : (item.label || item.name)}</span>
                </button>
               )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Separate component for sidebar content
function DashboardSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { isMobile, setOpen: setSidebarOpen } = useSidebar()
  const [user, setUser] = useState<{ id: string; email: string; userType: string } | null>(null)

  const [contexts, setContexts] = useState<any[]>([])
  const [workspaces, setWorkspaces] = useState<any[]>([])
  const [isLoadingContexts, setIsLoadingContexts] = useState(false)
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState(false)
  const [hasFetchedContexts, setHasFetchedContexts] = useState(false)
  const [hasFetchedWorkspaces, setHasFetchedWorkspaces] = useState(false)
  const [secondarySidebarOpen, setSecondarySidebarOpen] = useState(true)

  // Get user information from token
  useEffect(() => {
    const currentUser = getCurrentUserFromToken()
    setUser(currentUser)
  }, [])

  const isActive = useCallback((path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/")
  }, [location.pathname])

  const isContextsActive = isActive('/contexts')
  const isWorkspacesActive = isActive('/workspaces')

  const pathSegments = location.pathname.split('/').filter(Boolean)
  const isDetailView = pathSegments.length > 1 && (pathSegments[0] === 'contexts' || pathSegments[0] === 'workspaces')

  // Auto-collapse main sidebar when secondary menu is open to save space
  useEffect(() => {
    if ((isContextsActive || isWorkspacesActive) && secondarySidebarOpen && !isMobile) {
        setSidebarOpen(false)
    }
  }, [isContextsActive, isWorkspacesActive, secondarySidebarOpen, isMobile, setSidebarOpen])

  // Re-open secondary sidebar when navigating to a section, but only if it's not explicitly closed?
  // Actually, let's just open it when switching main sections if the user navigates to the root
  useEffect(() => {
      if (location.pathname === '/contexts' || location.pathname === '/workspaces') {
          setSecondarySidebarOpen(true)
      }
  }, [location.pathname])

  // Fetch contexts when active
  useEffect(() => {
    if (isContextsActive && !hasFetchedContexts && !isLoadingContexts) {
      setIsLoadingContexts(true)
      listContexts()
        .then(data => {
          setContexts(data || [])
          setHasFetchedContexts(true)
        })
        .catch(err => {
          console.error('Failed to fetch contexts:', err)
          setHasFetchedContexts(true)
        })
        .finally(() => setIsLoadingContexts(false))
    }
  }, [isContextsActive, hasFetchedContexts, isLoadingContexts])

  // Fetch workspaces when active
  useEffect(() => {
    if (isWorkspacesActive && !hasFetchedWorkspaces && !isLoadingWorkspaces) {
      setIsLoadingWorkspaces(true)
      listWorkspaces()
        .then(data => {
          setWorkspaces(data || [])
          setHasFetchedWorkspaces(true)
        })
        .catch(err => {
          console.error('Failed to fetch workspaces:', err)
          setHasFetchedWorkspaces(true)
        })
        .finally(() => setIsLoadingWorkspaces(false))
    }
  }, [isWorkspacesActive, hasFetchedWorkspaces, isLoadingWorkspaces])

  // Refresh workspaces list on start/stop/etc.
  useEffect(() => {
    const onChanged = () => {
      if (!isWorkspacesActive || isLoadingWorkspaces) return
      setIsLoadingWorkspaces(true)
      listWorkspaces()
        .then(data => setWorkspaces(data || []))
        .catch(err => console.error('Failed to refresh workspaces:', err))
        .finally(() => setIsLoadingWorkspaces(false))
    }
    window.addEventListener('workspaces:changed', onChanged)
    return () => window.removeEventListener('workspaces:changed', onChanged)
  }, [isWorkspacesActive, isLoadingWorkspaces])

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout')
      localStorage.removeItem('authToken')
      await (window as any).electronAPI?.clearAuthSession?.()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed', error)
      showToast({
        title: 'Error',
        description: 'Logout failed',
        variant: 'destructive'
      })
    }
  }

  const canControlWindow = typeof window !== 'undefined' && !!(window as any).electronAPI?.quitApp

  const handleQuit = () => {
    ;(window as any).electronAPI?.quitApp?.()
  }

  const navigateTo = useCallback((path: string) => {
    if (location.pathname !== path) {
      navigate(path)
    }
  }, [location.pathname, navigate])

  const getUserInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map(part => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2)
  }

  const isAdmin = user?.userType === 'admin'

  return (
    <>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <button
                  onClick={() => navigateTo('/workspaces')}
                  className="flex items-center"
                  type="button"
                >
                  <div className="flex aspect-square size-8 items-center justify-center text-sidebar-primary-foreground">
                    <img
                      src={`${import.meta.env.BASE_URL}icons/logo-wr_128x128.png`}
                      alt="Canvas Logo"
                      className="size-6"
                    />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Canvas</span>
                  </div>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Main navigation items */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isContextsActive}
                    tooltip="Manage your contexts"
                  >
                    <button
                      onClick={() => {
                          navigateTo('/contexts')
                          setSecondarySidebarOpen(true)
                      }}
                      className="flex items-center"
                      type="button"
                    >
                      <Layers3 className="size-4" />
                      <span>Contexts</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isWorkspacesActive}
                    tooltip="Manage your workspaces"
                  >
                    <button
                      onClick={() => {
                          navigateTo('/workspaces')
                          setSecondarySidebarOpen(true)
                      }}
                      className="flex items-center"
                      type="button"
                    >
                      <LayoutGrid className="size-4" />
                      <span>Workspaces</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/agents')}
                    tooltip="Manage your AI agents"
                  >
                    <button
                      onClick={() => navigateTo('/agents')}
                      className="flex items-center"
                      type="button"
                    >
                      <Brain className="size-4" />
                      <span>Agents</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/roles')}
                    tooltip="Manage roles (coming soon)"
                  >
                    <button
                      onClick={() => navigateTo('/roles')}
                      className="flex items-center"
                      type="button"
                    >
                      <Shield className="size-4" />
                      <span>Roles</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/remotes')}
                    tooltip="Manage remotes (coming soon)"
                  >
                    <button
                      onClick={() => navigateTo('/remotes')}
                      className="flex items-center"
                      type="button"
                    >
                      <Server className="size-4" />
                      <span>Remotes</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Admin section */}
          {isAdmin && (
            <>
              <SidebarGroup>
                <SidebarGroupLabel>Administration</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive('/admin/users')}
                        tooltip="Manage all users"
                      >
                        <button
                          onClick={() => navigateTo('/admin/users')}
                          className="flex items-center"
                          type="button"
                        >
                          <Users className="size-4" />
                          <span>All Users</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive('/admin/contexts')}
                        tooltip="Manage all contexts"
                      >
                        <button
                          onClick={() => navigateTo('/admin/contexts')}
                          className="flex items-center"
                          type="button"
                        >
                          <Layers3 className="size-4" />
                          <span>All Contexts</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive('/admin/workspaces')}
                        tooltip="Manage all workspaces"
                      >
                        <button
                          onClick={() => navigateTo('/admin/workspaces')}
                          className="flex items-center"
                          type="button"
                        >
                          <FolderOpen className="size-4" />
                          <span>All Workspaces</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive('/admin/agents')}
                        tooltip="Manage all agents"
                      >
                        <button
                          onClick={() => navigateTo('/admin/agents')}
                          className="flex items-center"
                          type="button"
                        >
                          <Brain className="size-4" />
                          <span>All Agents</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive('/admin/roles')}
                        tooltip="Manage all roles (coming soon)"
                      >
                        <button
                          onClick={() => navigateTo('/admin/roles')}
                          className="flex items-center"
                          type="button"
                        >
                          <Shield className="size-4" />
                          <span>All Roles</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarSeparator />
            </>
          )}

          {/* Settings section */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/api-tokens')}
                    tooltip="Manage your API tokens"
                  >
                    <button
                      onClick={() => navigateTo('/api-tokens')}
                      className="flex items-center"
                      type="button"
                    >
                      <Settings className="size-4" />
                      <span>Settings</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                asChild
                tooltip={`${user?.email?.split('@')[0] || "User"} - Go to Home`}
              >
                <button
                  onClick={() => navigateTo('/home')}
                  className="flex items-center gap-2 p-2"
                  type="button"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={user?.email || "User"} />
                    <AvatarFallback className="text-xs">
                      {user?.email ? getUserInitials(user.email) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.email?.split('@')[0] || "User"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email || "user@example.com"}
                    </span>
                  </div>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <SidebarSeparator />

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Logout"
                >
                  <LogOut className="size-4" />
                  <span>Logout</span>
                </Button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {canControlWindow && (
            <>
              <SidebarSeparator />
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Button
                      variant="ghost"
                      onClick={handleQuit}
                      className="w-full justify-start"
                      title="Exit"
                    >
                      <Power className="size-4" />
                      <span>Exit</span>
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </>
          )}
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        {/* Header spans full width of the content area (including secondary sidebar if present) */}
        <header className="titlebar flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b px-4">
          <div className="no-drag flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-sidebar-border" />
            {(isContextsActive || isWorkspacesActive) && !secondarySidebarOpen && (
                 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSecondarySidebarOpen(true)}>
                    <PanelLeftOpen className="h-4 w-4" />
                 </Button>
            )}
            <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {location.pathname === '/home' && 'Home'}
                {location.pathname === '/workspaces' && 'Workspaces'}
                {location.pathname.startsWith('/workspaces/') && location.pathname !== '/workspaces' && 'Workspace Details'}
                {location.pathname === '/contexts' && 'Contexts'}
                {location.pathname.startsWith('/contexts/') && location.pathname !== '/contexts' && 'Context Details'}
                {location.pathname.startsWith('/users/') && location.pathname.includes('/contexts/') && 'Shared Context Details'}
                {location.pathname === '/api-tokens' && 'Settings'}
                {location.pathname === '/agents' && 'Agents'}
                {location.pathname.startsWith('/agents/') && location.pathname !== '/agents' && 'Agent Details'}
                {location.pathname === '/roles' && 'Roles'}
                {location.pathname === '/remotes' && 'Remotes'}
                {location.pathname === '/admin/users' && 'User Management'}
                {location.pathname === '/admin/contexts' && 'All Contexts'}
                {location.pathname === '/admin/workspaces' && 'All Workspaces'}
                {location.pathname === '/admin/agents' && 'All Agents'}
                {location.pathname === '/admin/roles' && 'All Roles'}
              </span>
            </nav>
          </div>
          <div className="flex-1" />
          {canControlWindow && (
            <div className="no-drag flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => (window as any).electronAPI?.minimizeWindow?.()}
                title="Minimize"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => (window as any).electronAPI?.toggleMaximizeWindow?.()}
                title="Maximize / Restore"
              >
                <Square className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => (window as any).electronAPI?.closeWindow?.()}
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Secondary Sidebar */}
          {isContextsActive && secondarySidebarOpen && (!isMobile || !isDetailView) && (
            <NavList
              title="Contexts"
              items={contexts}
              type="contexts"
              isLoading={isLoadingContexts}
              navigateTo={navigateTo}
              currentPath={location.pathname}
              className={isMobile ? "w-full border-r-0" : "w-64 border-r"}
              onClose={() => setSecondarySidebarOpen(false)}
            />
          )}
          {isWorkspacesActive && secondarySidebarOpen && (!isMobile || !isDetailView) && (
            <NavList
              title="Workspaces"
              items={workspaces}
              type="workspaces"
              isLoading={isLoadingWorkspaces}
              navigateTo={navigateTo}
              currentPath={location.pathname}
              className={isMobile ? "w-full border-r-0" : "w-64 border-r"}
              onClose={() => setSecondarySidebarOpen(false)}
            />
          )}

          {/* Main Content Area */}
          <div className={`flex flex-col flex-1 min-w-0 overflow-hidden ${isMobile && !isDetailView && (isContextsActive || isWorkspacesActive) && secondarySidebarOpen ? 'hidden' : ''}`}>
            <main className="flex-1 overflow-auto p-4">
              <Outlet />
            </main>

            {/* Footer */}
            <footer className="border-t py-4 shrink-0 bg-background z-10">
              <div className="container mx-auto px-4 flex justify-between items-center text-sm text-muted-foreground">
                <div>© {new Date().getFullYear()} Canvas. All rights reserved.</div>
                <a
                  href="https://github.com/canvas-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center hover:text-foreground"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 mr-2">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                  </svg>
                  GitHub
                </a>
              </div>
            </footer>
          </div>
        </div>
      </SidebarInset>
    </>
  )
}

export function DashboardLayout() {
  return (
    <SidebarProvider defaultOpen={false}>
      <DashboardSidebar />
    </SidebarProvider>
  )
}
