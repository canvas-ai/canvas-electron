import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

interface PublicRouteProps {
  children: React.ReactNode
}

export function PublicRoute({ children }: PublicRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.get('/auth/me')
        setIsAuthenticated(true)
      } catch (error) {
        // Clear token on authentication failure
        if (error instanceof Error && error.message.includes('Authentication required')) {
          console.log('Clearing invalid token from PublicRoute')
          api.clearAuthToken()
        }
        setIsAuthenticated(false)
      }
    }
    checkAuth()
  }, [])

  // Show nothing while checking authentication
  if (isAuthenticated === null) {
    return null
  }

  // If authenticated, redirect to workspaces
  if (isAuthenticated) {
    return <Navigate to="/workspaces" replace />
  }

  // If not authenticated, render the children (login/register page)
  return <>{children}</>
}
