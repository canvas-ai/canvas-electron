import { useEffect, useRef, useState } from 'react'

function CanvasLogo({ className }: { className?: string }) {
  const [imgError, setImgError] = useState(false)
  const paths = ['/icons/logo-wr_64x64.png', './icons/logo-wr_64x64.png', 'icons/logo-wr_64x64.png']
  const [pathIndex, setPathIndex] = useState(0)

  if (imgError || pathIndex >= paths.length) {
    // Fallback: simple geometric logo
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

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
}

export function ParticlePanel() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const particles: Particle[] = []
    const count = 40
    const maxDist = 120

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    const reset = () => {
      particles.length = 0
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      for (let i = 0; i < count; i += 1) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
        })
      }
    }

    let frameId = 0
    const tick = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
      }

      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i]
        ctx.beginPath()
        ctx.arc(a.x, a.y, 2, 0, Math.PI * 2)
        ctx.fill()

        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist < maxDist) {
            ctx.globalAlpha = 1 - dist / maxDist
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }
      ctx.globalAlpha = 1
      frameId = requestAnimationFrame(tick)
    }

    resize()
    reset()
    tick()

    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [])

  return (
    <div className="relative h-full w-full bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
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
