import { useEffect, useRef, useState } from 'react'

// Global type declaration for particles.js
declare global {
  interface Window {
    particlesJS: {
      (elementId: string, config: unknown): void
      load: (elementId: string, configPath: string, callback?: () => void) => void
    }
  }
}

function CanvasLogo({ className }: { className?: string }) {
  const [imgError, setImgError] = useState(false)
  const paths = ['/icons/logo-wr_64x64.png', './icons/logo-wr_64x64.png', 'icons/logo-wr_64x64.png']
  const [pathIndex, setPathIndex] = useState(0)

  if (imgError || pathIndex >= paths.length) {
    return (
      <svg viewBox="0 0 64 64" className={className} fill="none">
        <rect x="8" y="8" width="48" height="48" rx="8" fill="rgba(255,255,255,0.2)" />
        <path d="M20 44 L32 20 L44 44" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <img
      src={paths[pathIndex]}
      alt=""
      className={className}
      onError={() => {
        if (pathIndex < paths.length - 1) {
          setPathIndex(pathIndex + 1)
        } else {
          setImgError(true)
        }
      }}
    />
  )
}

export function ParticlePanel() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  useEffect(() => {
    // Load particles.js script if not already loaded
    if (window.particlesJS) {
      setScriptLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = '/js/particles.min.js'
    script.async = true
    script.onload = () => setScriptLoaded(true)
    document.body.appendChild(script)

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  useEffect(() => {
    if (scriptLoaded && containerRef.current && window.particlesJS) {
      window.particlesJS.load('particles-container', '/js/particles.config.json')
    }
  }, [scriptLoaded])

  return (
    <div className="relative h-full w-full bg-black">
      <div id="particles-container" ref={containerRef} className="absolute inset-0 h-full w-full" />
      <div className="relative z-10 flex h-full flex-col justify-between p-8 text-white/90">
        <div className="flex items-center gap-3">
          <CanvasLogo className="h-10 w-10" />
          <div className="text-lg font-semibold">Canvas</div>
        </div>
        <div className="text-xs text-white/50">Electron Client</div>
      </div>
    </div>
  )
}
