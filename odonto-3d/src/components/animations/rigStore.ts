import type { Keyframe, RigState } from '../../config/scene'

/**
 * Estado mutável compartilhado entre GSAP (DOM/scroll) e o loop do React Three Fiber.
 * Não é estado React: escrever aqui não causa re-render — o useFrame lê a cada quadro.
 * Isso evita conflitos entre GSAP e React e mantém a rolagem fluida.
 */
export const rigStore = {
  /** progresso global da narrativa (0–1), suavizado pelo scrub do ScrollTrigger */
  progress: 0,
  /** progresso da animação de entrada (Fase 1) */
  intro: 0,
  /** frações (0–1) onde cada seção começa/termina dentro da narrativa */
  sections: new Map<string, { start: number; end: number }>(),
  keyframes: [] as Keyframe[],
  /** ponteiro normalizado (-1 … 1) */
  pointer: { x: 0, y: 0, active: false },
  reducedMotion: false,
}

const easeInOut = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t)

/** Converte uma âncora (seção + progresso local) em progresso global. */
function resolve(k: Keyframe) {
  const s = rigStore.sections.get(k.section)
  if (!s) return 0
  return s.start + (s.end - s.start) * k.at
}

const KEYS: (keyof RigState)[] = ['x', 'y', 'rotX', 'rotY', 'rotZ', 'scale', 'camZ', 'key', 'rim', 'glow']

/** Avalia o roteiro em um progresso global, interpolando entre keyframes com easing. */
export function sampleRig(progress: number, out: RigState): RigState {
  const kfs = rigStore.keyframes
  if (!kfs.length) return out
  let a = kfs[0]
  let b = kfs[kfs.length - 1]
  let pa = resolve(a)
  let pb = resolve(b)
  if (progress <= pa) {
    b = a
    pb = pa
  } else if (progress >= pb) {
    a = b
    pa = pb
  } else {
    for (let i = 0; i < kfs.length - 1; i++) {
      const p0 = resolve(kfs[i])
      const p1 = resolve(kfs[i + 1])
      if (progress >= p0 && progress <= p1) {
        a = kfs[i]
        b = kfs[i + 1]
        pa = p0
        pb = p1
        break
      }
    }
  }
  const t = pb > pa ? easeInOut((progress - pa) / (pb - pa)) : 0
  for (const key of KEYS) out[key] = a.state[key] + (b.state[key] - a.state[key]) * t
  return out
}
