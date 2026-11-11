import { Environment, Lightformer } from '@react-three/drei'

/**
 * Mapa de ambiente gerado em tempo real a partir de "softboxes" (Lightformers).
 * Produz reflexos de estúdio sem baixar HDRIs de terceiros (sem questões de licença).
 */
export function StudioEnvironment({ resolution = 256 }: { resolution?: number }) {
  return (
    <Environment resolution={resolution} frames={1} environmentIntensity={1}>
      <color attach="background" args={['#0b3a30']} />
      {/* softbox principal superior */}
      <Lightformer form="rect" intensity={3.2} color="#ffffff" position={[0, 5, 2]} rotation-x={Math.PI / 2} scale={[8, 4, 1]} />
      {/* faixa lateral esquerda (reflexo vertical longo na porcelana) */}
      <Lightformer form="rect" intensity={2.2} color="#f4fffb" position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[1.2, 9, 1]} />
      {/* faixa direita verde-menta */}
      <Lightformer form="rect" intensity={1.6} color="#8CE8CD" position={[5, 0.5, -1]} rotation-y={-Math.PI / 2} scale={[1.5, 8, 1]} />
      {/* contraluz esmeralda */}
      <Lightformer form="ring" intensity={1.4} color="#207A65" position={[0, 0, -6]} scale={6} />
      {/* rebatedor inferior suave */}
      <Lightformer form="rect" intensity={0.6} color="#A4FFE1" position={[0, -5, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} />
    </Environment>
  )
}
