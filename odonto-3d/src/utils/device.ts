import type { QualityTier } from '../config/scene'

/** Detecta suporte a WebGL2/WebGL sem manter o contexto aberto. */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return false
    ;(gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

export const isTouchDevice = () =>
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

/** Heurística inicial de qualidade; o PerformanceMonitor da cena pode rebaixar depois. */
export function detectQualityTier(): QualityTier {
  if (typeof navigator === 'undefined') return 'medium'
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  const cores = nav.hardwareConcurrency ?? 4
  const memory = nav.deviceMemory ?? 8
  const small = window.innerWidth < 768
  if (nav.connection?.saveData) return 'low'
  if (cores <= 4 || memory <= 3) return 'low'
  if (small || isTouchDevice()) return 'medium'
  return 'high'
}
