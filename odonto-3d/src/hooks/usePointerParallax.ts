import { useEffect } from 'react'
import { rigStore } from '../components/animations/rigStore'

/**
 * Alimenta rigStore.pointer com a posição normalizada do cursor (desktop)
 * ou do dedo durante o toque (mobile). Um único listener passivo — sem re-render.
 */
export function usePointerParallax(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const set = (cx: number, cy: number) => {
      rigStore.pointer.x = (cx / window.innerWidth) * 2 - 1
      rigStore.pointer.y = -((cy / window.innerHeight) * 2 - 1)
      rigStore.pointer.active = true
    }
    const reset = () => {
      rigStore.pointer.x = 0
      rigStore.pointer.y = 0
      rigStore.pointer.active = false
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') set(e.clientX, e.clientY)
    }
    // toque: reação limitada (40%) para não competir com a rolagem
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      set(t.clientX, t.clientY)
      rigStore.pointer.x *= 0.4
      rigStore.pointer.y *= 0.4
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchend', reset, { passive: true })
    document.documentElement.addEventListener('mouseleave', reset)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchend', reset)
      document.documentElement.removeEventListener('mouseleave', reset)
      reset()
    }
  }, [enabled])
}
