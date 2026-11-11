import { Suspense, lazy, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { sceneConfig, type QualityTier } from '../../config/scene'
import { detectQualityTier } from '../../utils/device'
import { ToothRig } from './ToothRig'
import { Particles } from './Particles'
import { StudioEnvironment } from './StudioEnvironment'
import { disposeToothCache } from './Tooth'

const Effects = lazy(() => import('./Effects'))

const downgrade: Record<QualityTier, QualityTier> = { high: 'medium', medium: 'low', low: 'low' }

interface ToothSceneProps {
  onReady?: () => void
}

/**
 * Canvas WebGL da hero. Carregado sob demanda (React.lazy) apenas na página inicial.
 * Ajusta automaticamente a qualidade (pixel ratio, partículas, pós-processamento)
 * e libera todos os recursos de GPU ao desmontar.
 */
export default function ToothScene({ onReady }: ToothSceneProps) {
  const [tier, setTier] = useState<QualityTier>(() => detectQualityTier())

  useEffect(() => () => {
    disposeToothCache()
  }, [])

  return (
    <Canvas
      dpr={sceneConfig.dpr[tier]}
      camera={{ fov: sceneConfig.fov, position: [0, 0, 7], near: 0.1, far: 40 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
        toneMapping: THREE.AgXToneMapping,
        toneMappingExposure: 1,
      }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace
      }}
      aria-hidden="true"
      tabIndex={-1}
    >
      <color attach="background" args={[sceneConfig.background]} />
      <fog attach="fog" args={[sceneConfig.background, sceneConfig.fog.near, sceneConfig.fog.far]} />

      <PerformanceMonitor flipflops={2} onDecline={() => setTier((t) => downgrade[t])} />
      <AdaptiveDpr />

      <Suspense fallback={null}>
        <StudioEnvironment resolution={tier === 'low' ? 128 : 256} />
        <ToothRig tier={tier} />
        <ReadySignal onReady={onReady} />
      </Suspense>

      <Particles count={sceneConfig.particles[tier]} />

      {tier === 'high' && (
        <Suspense fallback={null}>
          <Effects />
        </Suspense>
      )}
    </Canvas>
  )
}

/** Dispara quando o modelo terminou de carregar (fica dentro do Suspense). */
function ReadySignal({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    onReady?.()
  }, [onReady])
  return null
}

useGLTF.preload(sceneConfig.modelUrl, false, true)
