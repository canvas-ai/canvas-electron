import React from 'react'
import { createRoot } from 'react-dom/client'
import { ToolboxApp } from './pages/ToolboxApp'
import './globals.css'

const container = document.getElementById('toolbox-root')
if (container) {
  const root = createRoot(container)
  root.render(<ToolboxApp />)
}