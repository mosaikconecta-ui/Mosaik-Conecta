import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { sceneConfig } from '../../config/scene'

/** Pós-processamento moderado (somente nível "high"): bloom suave + vinheta + tone mapping. */
export default function Effects() {
  const b = sceneConfig.bloom
  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur intensity={b.intensity} luminanceThreshold={b.threshold} luminanceSmoothing={b.smoothing} />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <Vignette offset={0.25} darkness={0.55} />
    </EffectComposer>
  )
}
