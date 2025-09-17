import React from 'react'
import { createRoot } from 'react-dom/client'
import { SettingsApp } from './pages/SettingsApp'
import './globals.css'

const container = document.getElementById('settings-root')
if (container) {
  const root = createRoot(container)
  root.render(<SettingsApp />)
}