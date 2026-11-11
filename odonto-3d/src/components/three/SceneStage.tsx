import { Suspense, lazy, useEffect, useState } from 'react'
import { hasWebGL } from '../../utils/device'
import { StaticToothFallback } from './StaticToothFallback'

const ToothScene = lazy(() => import('./ToothScene'))

interface SceneStageProps {
  onReady: () => void
  ready: boolean
}

/**
 * Palco da cena: decide entre WebGL (carregado sob demanda) e fallback estático,
 * exibe um indicador discreto enquanto o GLB carrega e faz o fade-in do canvas.
 */
export function SceneStage({ onReady, ready }: SceneStageProps) {
  const [webgl, setWebgl] = useState<boolean | null>(null)
  useEffect(() => {
    setWebgl(hasWebGL())
  }, [])

  return (
    <div className="scene-backdrop absolute inset-0 overflow-hidden">
      {webgl === false && <StaticToothFallback />}
      {webgl && (
        <div className={`absolute inset-0 transition-opacity duration-[1400ms] ease-out ${ready ? 'opacity-100' : 'opacity-0'}`}>
          <Suspense fallback={null}>
            <ToothScene onReady={onReady} />
          </Suspense>
        </div>
      )}
      {webgl && !ready && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center md:place-items-center md:justify-end md:pr-[18vw]" role="status">
          <span className="loader-ring" aria-hidden="true" />
          <span className="sr-only">Carregando visualização 3D</span>
        </div>
      )}
      {/* gradiente inferior para legibilidade do texto sobre a cena */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-deep/80 to-transparent" />
    </div>
  )
}
