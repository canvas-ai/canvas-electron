import { useEffect } from 'react'

declare global {
  interface Window {
    particlesJS: {
      load: (elementId: string, configPath: string, callback?: () => void) => void;
    };
    pJS?: {
      [key: string]: {
        destroy?: () => void;
      };
    };
  }
}

const addParticles = (elementId: string) => {
  window.particlesJS.load(elementId, '/js/particles.config.json', () => {
    console.log('particles.js config loaded for', elementId);
  })
}

export function useParticles(elementId: string) {
  useEffect(() => {
    if (typeof window.particlesJS !== 'undefined') {
      addParticles(elementId);
    } else {
      if(document.getElementById('particles-js-script')) {
        return;
      }
      const script = document.createElement('script');
      script.id = 'particles-js-script';
      script.src = '/js/particles.min.js';
      script.onload = () => {
        console.log('particles.js loaded')
        addParticles(elementId);
      }
      document.head.appendChild(script);
    }
    
    // Cleanup function
    return () => {
      if (window.pJS && window.pJS[elementId]?.destroy) {
        window.pJS[elementId].destroy()
      }
    }
  }, [elementId])
} 