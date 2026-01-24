import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    particlesJS: {
      load: (elementId: string, configPath: string) => void
    }
  }
}

function CanvasLogo({ className }: { className?: string }) {
  return <img src="./icons/logo-wr_64x64.png" alt="" className={className} />
}

export function ParticlePanel() {
  const [scriptLoaded, setScriptLoaded] = useState(false)

  useEffect(() => {
    if (window.particlesJS) {
      setScriptLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = './js/particles.min.js'
    script.onload = () => setScriptLoaded(true)
    document.body.appendChild(script)

    return () => script.parentNode?.removeChild(script)
  }, [])

  useEffect(() => {
    if (scriptLoaded && window.particlesJS) {
      window.particlesJS.load('particles-container', './js/particles.config.json')
    }
  }, [scriptLoaded])

  return (
    <div className="relative h-full w-full bg-black">
      <div id="particles-container" className="absolute inset-0 h-full w-full" />
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
