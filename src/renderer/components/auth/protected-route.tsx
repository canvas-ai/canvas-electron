import { Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getCurrentUser, isAuthenticated } from '@/services/auth'
import { api } from '@/lib/api'
import { Loader } from '@/components/ui/loader'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check localStorage token
        if (!isAuthenticated()) {
          console.log('No authentication token found, redirecting to login')
          setAuthState('unauthenticated')
          return
        }

        // Then verify the token by getting the current user
        const user = await getCurrentUser()
        if (user) {
          console.log('User authenticated:', user.email)
          setAuthState('authenticated')
        } else {
          console.log('User not authenticated or token expired')
          // getCurrentUser already clears the token on auth failure
          setAuthState('unauthenticated')
        }
      } catch (error) {
        console.error('Authentication check failed:', error)
        // Clear token on any authentication error
        if (error instanceof Error && error.message.includes('Authentication required')) {
          console.log('Clearing invalid token from ProtectedRoute')
          api.clearAuthToken()
        }
        setAuthState('unauthenticated')
      }
    }

    checkAuth()
  }, [])

  // Show loading indicator while checking authentication
  if (authState === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader className="h-8 w-8" />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (authState === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  // If authenticated, render the children
  return <>{children}</>
}
