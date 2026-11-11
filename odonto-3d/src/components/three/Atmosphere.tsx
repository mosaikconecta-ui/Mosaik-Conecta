import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const fragment = /* glsl */ `
  uniform vec3 uInner;
  uniform vec3 uOuter;
  uniform float uIntensity;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float glow = pow(clamp(1.0 - d, 0.0, 1.0), 2.2);
    vec3 col = mix(uOuter, uInner, glow);
    gl_FragColor = vec4(col * uIntensity, glow * uIntensity);
  }
`

interface AtmosphereProps {
  /** referência ao objeto que o halo deve seguir */
  follow: React.RefObject<THREE.Object3D | null>
  glow: React.RefObject<number>
}

/** Halo esmeralda atrás do dente — profundidade atmosférica sem custo de pós-processamento. */
export function Atmosphere({ follow, glow }: AtmosphereProps) {
  const mesh = useRef<THREE.Mesh>(null)
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uInner: { value: new THREE.Color('#2a9c80') },
          uOuter: { value: new THREE.Color('#092F27') },
          uIntensity: { value: 0 },
        },
      }),
    [],
  )
  useEffect(() => () => {
    material.dispose()
  }, [material])

  const tmp = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, delta) => {
    if (!mesh.current || !follow.current) return
    follow.current.getWorldPosition(tmp)
    mesh.current.position.x = THREE.MathUtils.damp(mesh.current.position.x, tmp.x * 0.85, 3, delta)
    mesh.current.position.y = THREE.MathUtils.damp(mesh.current.position.y, tmp.y * 0.85, 3, delta)
    material.uniforms.uIntensity.value = THREE.MathUtils.damp(material.uniforms.uIntensity.value, 0.55 * (glow.current ?? 1), 3, delta)
  })

  return (
    <mesh ref={mesh} position={[0, 0, -3.5]} material={material} renderOrder={-1}>
      <planeGeometry args={[11, 11]} />
    </mesh>
  )
}
