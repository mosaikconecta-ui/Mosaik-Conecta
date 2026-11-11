/**
 * Configuração da experiência 3D. Tudo que é "direção de arte" da cena
 * (modelo, material, luzes, partículas, roteiro de câmera) fica aqui.
 */

/** Estado animável do "rig" (dente + câmera + luzes). */
export interface RigState {
  /** deslocamento horizontal em fração da meia-largura visível (-1 … 1) */
  x: number
  /** deslocamento vertical em fração da meia-altura visível (-1 … 1) */
  y: number
  rotX: number
  rotY: number
  rotZ: number
  scale: number
  /** distância da câmera ao dente (zoom) */
  camZ: number
  /** multiplicador da luz principal */
  key: number
  /** multiplicador da luz de contorno verde-menta */
  rim: number
  /** multiplicador do brilho atmosférico / bloom */
  glow: number
}

/** Âncora do roteiro: seção (id do DOM) + progresso local dentro dela (0–1). */
export interface Keyframe {
  section: string
  at: number
  state: RigState
}

const TAU = Math.PI * 2

/**
 * Roteiro cinematográfico — desktop / notebook / tablet horizontal.
 *
 * Convenção das âncoras: `at = 0` quando o topo da seção encosta no topo da
 * viewport; `at = 1` quando a base da seção encosta no topo da viewport.
 * Ou seja, `hero@1` e `intro@0` representam o mesmo instante (seção intro
 * ocupando a tela).
 *
 * Fases: 1 introdução · 2 primeiro scroll · 3 transição · 4 exploração · 5 encerramento
 */
export const keyframesDesktop: Keyframe[] = [
  // Fase 1 — hero: dente à direita, 3/4 elegante
  { section: 'hero', at: 0, state: { x: 0.42, y: 0.0, rotX: 0.16, rotY: -0.6, rotZ: 0.14, scale: 1, camZ: 6.4, key: 1, rim: 1, glow: 1 } },
  // Fase 2 — primeiro scroll: gira, câmera aproxima, luz se transforma, textos saem
  { section: 'hero', at: 0.5, state: { x: 0.06, y: 0.02, rotX: 0.5, rotY: 0.7, rotZ: -0.1, scale: 1, camZ: 4.5, key: 1.3, rim: 1.7, glow: 1.4 } },
  // Fase 3 — transição: desloca para a esquerda enquanto o conteúdo surge à direita
  { section: 'intro', at: 0, state: { x: -0.5, y: 0.0, rotX: 0.22, rotY: 1.8, rotZ: 0.1, scale: 1, camZ: 5.4, key: 1.1, rim: 1.25, glow: 1.05 } },
  // Fase 4 — exploração: rotações controladas e aproximações (oclusal, raízes, perfil)
  { section: 'explore', at: 0, state: { x: 0.46, y: -0.04, rotX: 0.95, rotY: 2.85, rotZ: 0.0, scale: 1, camZ: 4.4, key: 1.35, rim: 1.1, glow: 1.15 } },
  { section: 'explore', at: 0.3333, state: { x: -0.46, y: -0.02, rotX: -0.4, rotY: 3.95, rotZ: -0.16, scale: 1, camZ: 4.9, key: 1.0, rim: 1.9, glow: 1.45 } },
  { section: 'explore', at: 0.6667, state: { x: 0.46, y: -0.02, rotX: 0.12, rotY: 5.0, rotZ: 0.24, scale: 1, camZ: 4.8, key: 1.2, rim: 1.4, glow: 1.2 } },
  // Fase 5 — encerramento: câmera se afasta e o dente volta a uma pose elegante
  { section: 'closing', at: 0, state: { x: 0, y: 0.36, rotX: 0.16, rotY: TAU - 0.5, rotZ: 0.12, scale: 0.85, camZ: 8.6, key: 1, rim: 1.35, glow: 1.25 } },
]

/**
 * Roteiro mobile / tablet vertical: o dente ocupa a metade superior e os textos
 * a inferior — deslocamentos verticais em vez de laterais, sem cobrir conteúdo.
 */
export const keyframesMobile: Keyframe[] = keyframesDesktop.map((k, i) => {
  const ys = [0.5, 0.36, 0.48, 0.5, 0.5, 0.5, 0.5]
  const xs = [0, 0, -0.1, 0.1, -0.1, 0.1, 0]
  return {
    ...k,
    state: { ...k.state, x: xs[i] ?? 0, y: ys[i] ?? 0.4, camZ: k.state.camZ * 1.5 + 1.2, scale: k.state.scale },
  }
})

export const sceneConfig = {
  /** Modelo GLB — substitua por um modelo licenciado mantendo o caminho ou altere aqui. */
  modelUrl: '/models/tooth.glb',
  /** altura do modelo em unidades de cena após normalização */
  modelHeight: 2.1,
  fov: 32,
  /** cor do fundo / névoa (deve casar com theme.colors.deep) */
  background: '#092F27',
  fog: { near: 6, far: 16 },
  material: {
    color: '#ffffff',
    roughness: 0.26,
    clearcoat: 1,
    clearcoatRoughness: 0.14,
    sheen: 0.25,
    sheenRoughness: 0.5,
    sheenColor: '#e6fff5',
    specularIntensity: 0.8,
    ior: 1.62,
    /** translucidez — usada apenas no nível "high" */
    transmission: 0.08,
    thickness: 1.4,
    attenuationColor: '#f3e7d2',
    attenuationDistance: 2.4,
    envMapIntensity: 1.05,
  },
  lights: {
    ambient: { color: '#cfeee3', intensity: 0.22 },
    key: { color: '#fff8ef', intensity: 2.6, position: [-3.5, 4, 4] as [number, number, number] },
    rim: { color: '#8CE8CD', intensity: 38, position: [3.2, 1.8, -3.2] as [number, number, number] },
    fill: { color: '#207A65', intensity: 1.4, position: [0, -4, 2] as [number, number, number] },
  },
  float: { amplitude: 0.07, speed: 0.6, rotAmplitude: 0.05 },
  pointer: { rotation: 0.22, translate: 0.08, damping: 3.2 },
  /** amortecimento (por segundo) aplicado ao estado de scroll — suaviza sem atrasar demais */
  damping: 5,
  particles: { high: 900, medium: 380, low: 160 },
  bloom: { intensity: 0.55, threshold: 0.82, smoothing: 0.25 },
  /** limite de pixel ratio por nível de qualidade */
  dpr: { high: [1, 2] as [number, number], medium: [1, 1.6] as [number, number], low: [0.85, 1.2] as [number, number] },
} as const

export type QualityTier = 'high' | 'medium' | 'low'
