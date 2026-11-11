import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rigStore } from '../animations/rigStore'

interface ParticlesProps {
  count: number
  color?: string
}

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSize;
  attribute float aSeed;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    // deriva vertical lenta + ondulação orgânica
    p.y = mod(p.y + uTime * (0.05 + aSeed * 0.08) + 6.0, 12.0) - 6.0;
    p.x += sin(uTime * 0.25 + aSeed * 12.0) * 0.18;
    p.z += cos(uTime * 0.2 + aSeed * 9.0) * 0.18;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (16.0 / -mv.z);
    // some suavemente nas bordas verticais e com a distância (profundidade atmosférica)
    float edge = smoothstep(6.0, 4.0, abs(p.y));
    float depth = smoothstep(18.0, 4.0, -mv.z);
    vAlpha = edge * depth * (0.35 + aSeed * 0.65);
  }
`
const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    gl_FragColor = vec4(uColor, a * vAlpha * uOpacity);
  }
`

/** Partículas discretas (poeira luminosa) em shader próprio — um único draw call. */
export function Particles({ count, color = '#A4FFE1' }: ParticlesProps) {
  const group = useRef<THREE.Group>(null)

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const size = new Float32Array(count)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 1.5
      size[i] = 0.6 + Math.random() * 2.2
      seed[i] = Math.random()
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    return g
  }, [count])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: 1 },
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: 0 },
        },
      }),
    [color],
  )

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  useFrame((state, delta) => {
    const u = material.uniforms
    if (!rigStore.reducedMotion) u.uTime.value += delta
    u.uPixelRatio.value = state.gl.getPixelRatio()
    u.uOpacity.value = THREE.MathUtils.damp(u.uOpacity.value, 0.9 * rigStore.intro, 2, delta)
    // parallax oposto ao ponteiro → sensação de profundidade
    if (group.current) {
      group.current.position.x = THREE.MathUtils.damp(group.current.position.x, -rigStore.pointer.x * 0.35, 2, delta)
      group.current.position.y = THREE.MathUtils.damp(group.current.position.y, -rigStore.pointer.y * 0.2, 2, delta)
      group.current.rotation.y = rigStore.progress * 0.6
    }
  })

  return (
    <group ref={group}>
      <points geometry={geometry} material={material} frustumCulled={false} />
    </group>
  )
}
