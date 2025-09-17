import React from 'react'
import { createRoot } from 'react-dom/client'
import './globals.css'

// This is a placeholder main entry point
// The actual apps are loaded via toolbox.tsx and settings.tsx

function App() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Canvas UI</h1>
        <p className="text-muted-foreground">
          Main renderer entry point - this should not be visible in normal usage.
        </p>
      </div>
    </div>
  )
}

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<App />)
}