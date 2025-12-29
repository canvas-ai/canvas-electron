import React from 'react'
import { createRoot } from 'react-dom/client'
import './globals.css'
import { CanvasLogin } from './pages/CanvasLogin'

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<CanvasLogin />)
}
