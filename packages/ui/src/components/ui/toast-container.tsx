import React, { createContext, useContext, useState, useRef } from 'react'
import { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose } from './toast'

type ToastType = {
  id: string
  title: string
  description: string
  variant?: 'default' | 'destructive'
}

type ToastContextType = {
  showToast: (toast: Omit<ToastType, 'id'>) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastContainer({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastType[]>([])

  // Keep a short-lived set of recent toast keys to avoid accidental spam (e.g. socket events firing multiple times)
  const recentToastKeys = useRef<Set<string>>(new Set())

  const showToast = (toast: Omit<ToastType, 'id'>) => {
    const key = `${toast.title}:${toast.description}`
    // If we already displayed the exact same toast very recently, skip it
    if (recentToastKeys.current.has(key)) {
      return
    }

    recentToastKeys.current.add(key)

    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])

    // Auto-dismiss toast and allow the same key again after timeout
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      recentToastKeys.current.delete(key)
    }, 5000)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      <ToastProvider>
        {children as any}
        {toasts.map((toast) => (
          <Toast key={toast.id} variant={toast.variant}>
            <div className="grid gap-1">
              <ToastTitle>{toast.title}</ToastTitle>
              <ToastDescription>{toast.description}</ToastDescription>
            </div>
            <ToastClose />
          </Toast>
        ))}
        <ToastViewport />
      </ToastProvider>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastContainer')
  }
  return context
}
