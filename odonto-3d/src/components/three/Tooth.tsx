import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { sceneConfig, type QualityTier } from '../../config/scene'

interface ToothProps {
  tier: QualityTier
}

/**
 * Carrega o GLB do dente, normaliza escala/centro e aplica o material
 * "porcelana odontológica" (PBR físico com clearcoat, sheen e translucidez sutil).
 * Qualquer GLB colocado em sceneConfig.modelUrl funciona — inclusive modelos
 * com várias malhas ou materiais próprios (basta `keepOriginalMaterials`).
 */
export function Tooth({ tier }: ToothProps) {
  // draco desativado (não usado pelo nosso GLB → evita baixar o decoder); meshopt ativo
  const gltf = useGLTF(sceneConfig.modelUrl, false, true)

  const material = useMemo(() => {
    const m = sceneConfig.material
    return new THREE.MeshPhysicalMaterial({
      color: m.color,
      vertexColors: true,
      roughness: m.roughness,
      metalness: 0,
      clearcoat: m.clearcoat,
      clearcoatRoughness: m.clearcoatRoughness,
      sheen: m.sheen,
      sheenRoughness: m.sheenRoughness,
      sheenColor: new THREE.Color(m.sheenColor),
      specularIntensity: m.specularIntensity,
      ior: m.ior,
      envMapIntensity: m.envMapIntensity,
      // Translucidez real (transmission) só em GPUs fortes: exige um passe extra.
      transmission: tier === 'high' ? m.transmission : 0,
      thickness: m.thickness,
      attenuationColor: new THREE.Color(m.attenuationColor),
      attenuationDistance: m.attenuationDistance,
    })
  }, [tier])

  // Normaliza: centraliza e escala para sceneConfig.modelHeight
  const { object, scale } = useMemo(() => {
    const root = gltf.scene.clone(true)
    const box = new THREE.Box3().setFromObject(root)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    root.position.sub(center)
    root.traverse((child) => {
      const mesh = child as THREE.Mesh
      if (mesh.isMesh) {
        mesh.material = material
        mesh.castShadow = false
        mesh.receiveShadow = false
        // vertex colors ausentes em modelos de terceiros → desliga para não escurecer
        if (!mesh.geometry.getAttribute('color')) (mesh.material as THREE.MeshPhysicalMaterial).vertexColors = false
      }
    })
    return { object: root, scale: sceneConfig.modelHeight / Math.max(size.y, 1e-6) }
  }, [gltf.scene, material])

  useEffect(() => () => {
    material.dispose()
  }, [material])

  return (
    <group scale={scale}>
      <primitive object={object} />
    </group>
  )
}

/** Libera geometrias do cache do loader (chamado quando a cena é desmontada). */
export function disposeToothCache() {
  try {
    const cached = useGLTF.clear as unknown as (url: string) => void
    cached(sceneConfig.modelUrl)
  } catch {
    /* noop */
  }
}
