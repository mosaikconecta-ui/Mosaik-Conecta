/**
 * Página de inspeção do GLB (somente desenvolvimento): `npm run dev` →
 * http://localhost:5173/tools/model-viewer.html — orbite e confira geometria,
 * normais e wireframe antes de aprovar um modelo. Aceita ?view=front|top|side|roots&model=/models/x.glb
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'

const params = new URLSearchParams(location.search)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.setSize(innerWidth, innerHeight)
renderer.toneMapping = THREE.AgXToneMapping
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color('#092F27')
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
const key = new THREE.DirectionalLight('#fff8ef', 2.2)
key.position.set(-3, 4, 4)
scene.add(key)
const rim = new THREE.PointLight('#8CE8CD', 30, 14)
rim.position.set(3, 2, -3)
scene.add(rim)

const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 50)
const views: Record<string, [number, number, number]> = { front: [0, 0.3, 6], side: [6, 0.3, 0], top: [0, 6, 0.6], roots: [0.5, -5, 3] }
camera.position.set(...(views[params.get('view') ?? 'front'] ?? views.front))
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const material = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 })
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
loader.load(params.get('model') ?? '/models/tooth.glb', (gltf) => {
  let tris = 0
  gltf.scene.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) {
      m.material = material
      tris += (m.geometry.index?.count ?? m.geometry.attributes.position.count) / 3
    }
  })
  const box = new THREE.Box3().setFromObject(gltf.scene)
  gltf.scene.position.sub(box.getCenter(new THREE.Vector3()))
  scene.add(gltf.scene)
  document.getElementById('stats')!.textContent = `${tris.toLocaleString('pt-BR')} triângulos`
  document.body.dataset.ready = '1'
})

document.getElementById('wire')!.addEventListener('change', (e) => (material.wireframe = (e.target as HTMLInputElement).checked))
document.getElementById('flat')!.addEventListener('change', (e) => {
  material.vertexColors = !(e.target as HTMLInputElement).checked
  material.needsUpdate = true
})
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})
renderer.setAnimationLoop(() => {
  controls.update()
  renderer.render(scene, camera)
})
