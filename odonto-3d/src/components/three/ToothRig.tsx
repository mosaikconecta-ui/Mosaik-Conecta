import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { sceneConfig, type QualityTier, type RigState } from '../../config/scene'
import { rigStore, sampleRig } from '../animations/rigStore'
import { Tooth } from './Tooth'
import { Atmosphere } from './Atmosphere'

const { damp } = THREE.MathUtils

/**
 * Compõe as quatro animações do dente em camadas independentes (sem conflito):
 *  - rig   → deslocamento lateral/vertical + escala (scroll)
 *  - float → flutuação contínua sutil (tempo)
 *  - spin  → rotação 3D (scroll) + reação ao ponteiro
 *  - câmera → zoom (scroll) + parallax (ponteiro)
 * O alvo vem do rigStore (GSAP/ScrollTrigger) e é amortecido aqui a cada quadro.
 */
export function ToothRig({ tier }: { tier: QualityTier }) {
  const rig = useRef<THREE.Group>(null)
  const float = useRef<THREE.Group>(null)
  const spin = useRef<THREE.Group>(null)
  const keyLight = useRef<THREE.DirectionalLight>(null)
  const rimLight = useRef<THREE.PointLight>(null)
  const fillLight = useRef<THREE.PointLight>(null)
  const glow = useRef(1)

  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const size = useThree((s) => s.size)

  const target = useMemo<RigState>(() => ({ ...rigStore.keyframes[0]?.state } as RigState), [])
  const current = useRef<RigState | null>(null)
  const pointer = useRef({ x: 0, y: 0 })

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20) // evita saltos após troca de aba
    if (!rig.current || !float.current || !spin.current) return

    sampleRig(rigStore.progress, target)
    if (!current.current) current.current = { ...target }
    const c = current.current
    const k = sceneConfig.damping
    for (const key of Object.keys(target) as (keyof RigState)[]) c[key] = damp(c[key], target[key], k, delta)

    // ponteiro amortecido
    const pc = sceneConfig.pointer
    const reduced = rigStore.reducedMotion
    pointer.current.x = damp(pointer.current.x, reduced ? 0 : rigStore.pointer.x, pc.damping, delta)
    pointer.current.y = damp(pointer.current.y, reduced ? 0 : rigStore.pointer.y, pc.damping, delta)
    const px = pointer.current.x
    const py = pointer.current.y

    // intro (Fase 1): surge de baixo, cresce e recebe luz
    const intro = rigStore.intro
    const introEase = 1 - Math.pow(1 - intro, 3)

    // --- deslocamento (em fração da área visível à distância da câmera) ---
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * c.camZ
    const halfW = halfH * (size.width / Math.max(size.height, 1))
    rig.current.position.set(c.x * halfW, c.y * halfH - (1 - introEase) * 0.6, 0)
    rig.current.scale.setScalar(c.scale * (0.82 + 0.18 * introEase))

    // --- flutuação ---
    const t = state.clock.elapsedTime
    const f = sceneConfig.float
    const amp = reduced ? 0 : 1
    float.current.position.y = Math.sin(t * f.speed) * f.amplitude * amp
    float.current.position.x = Math.sin(t * f.speed * 0.6 + 1.3) * f.amplitude * 0.35 * amp
    float.current.rotation.z = Math.sin(t * f.speed * 0.8) * f.rotAmplitude * amp
    float.current.rotation.x = Math.cos(t * f.speed * 0.7) * f.rotAmplitude * 0.6 * amp

    // --- rotação (scroll + ponteiro + leve giro de entrada) ---
    spin.current.rotation.set(
      c.rotX - py * pc.rotation,
      c.rotY + px * pc.rotation * 1.4 - (1 - introEase) * 0.9,
      c.rotZ,
    )

    // --- zoom + parallax de câmera ---
    camera.position.set(px * pc.translate, -py * pc.translate * 0.6, c.camZ + (1 - introEase) * 1.2)
    camera.lookAt(px * pc.translate * 0.5, 0, 0)

    // --- iluminação dinâmica controlada ---
    const l = sceneConfig.lights
    if (keyLight.current) {
      keyLight.current.intensity = l.key.intensity * c.key * introEase
      keyLight.current.position.set(l.key.position[0] + px * 2, l.key.position[1] + py * 1.5, l.key.position[2])
    }
    if (rimLight.current) {
      rimLight.current.intensity = l.rim.intensity * c.rim * introEase
      rimLight.current.position.set(
        rig.current.position.x + l.rim.position[0] - px * 1.2,
        rig.current.position.y + l.rim.position[1],
        l.rim.position[2],
      )
    }
    if (fillLight.current) fillLight.current.intensity = l.fill.intensity * c.glow * introEase
    glow.current = c.glow * introEase

    // névoa acompanha o zoom: profundidade atmosférica constante sem escurecer o dente
    const fog = state.scene.fog as THREE.Fog | null
    if (fog) {
      fog.near = c.camZ + sceneConfig.fog.near - 6
      fog.far = c.camZ + sceneConfig.fog.far - 6
    }
  })

  const l = sceneConfig.lights
  return (
    <>
      <ambientLight color={l.ambient.color} intensity={l.ambient.intensity} />
      <directionalLight ref={keyLight} color={l.key.color} intensity={0} position={l.key.position} />
      <pointLight ref={rimLight} color={l.rim.color} intensity={0} position={l.rim.position} distance={14} decay={2} />
      <pointLight ref={fillLight} color={l.fill.color} intensity={0} position={l.fill.position} distance={12} decay={1.5} />

      <Atmosphere follow={rig} glow={glow} />

      <group ref={rig}>
        <group ref={float}>
          <group ref={spin}>
            <Tooth tier={tier} />
          </group>
        </group>
      </group>
    </>
  )
}
