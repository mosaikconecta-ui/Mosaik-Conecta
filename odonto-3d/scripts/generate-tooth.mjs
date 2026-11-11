/**
 * Procedural tooth generator — Alvéa Odontologia template.
 *
 * Builds an ORIGINAL, license-free 3D lower first molar from a signed distance
 * field (SDF), polygonises it with Surface Nets, projects every vertex back onto
 * the exact implicit surface, simplifies it with meshoptimizer and writes an
 * optimised GLB (quantised + meshopt-compressed) to public/models/tooth.glb.
 *
 * Because the model is computed from math written in this file, there are no
 * third-party rights involved: the output can be shipped commercially.
 *
 * The scene loads ANY GLB placed at the configured path (see
 * src/config/scene.ts), so a professionally sculpted/licensed model can replace
 * this one without code changes.
 *
 * Usage: npm run model:generate  [-- --res 220 --target 90000]
 */
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Document, NodeIO } from '@gltf-transform/core'
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions'
import { quantize, meshopt as meshoptCompress } from '@gltf-transform/functions'
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer'

const require = createRequire(import.meta.url)
const { surfaceNets } = require('isosurface')

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../public/models/tooth.glb')

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? Number(process.argv[i + 1]) : fallback
}
const RES = arg('res', 200) // voxel resolution along the longest axis
const TARGET_TRIS = arg('target', 80000)

/* ------------------------------------------------------------------ */
/* SDF toolkit                                                         */
/* ------------------------------------------------------------------ */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const mix = (a, b, t) => a + (b - a) * t
const len3 = (x, y, z) => Math.hypot(x, y, z)

/** polynomial smooth min (iq) */
function smin(a, b, k) {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1)
  return mix(b, a, h) - k * h * (1 - h)
}
/** smooth subtraction: removes b from a */
function ssub(a, b, k) {
  const h = clamp(0.5 - (0.5 * (a + b)) / k, 0, 1)
  return mix(a, -b, h) + k * h * (1 - h)
}
/** ellipsoid (iq, bound-corrected approximation) */
function ellipsoid(x, y, z, rx, ry, rz) {
  const k0 = len3(x / rx, y / ry, z / rz)
  const k1 = len3(x / (rx * rx), y / (ry * ry), z / (rz * rz))
  return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1
}
/** capsule between a and b */
function capsule(px, py, pz, ax, ay, az, bx, by, bz, r) {
  const pax = px - ax, pay = py - ay, paz = pz - az
  const bax = bx - ax, bay = by - ay, baz = bz - az
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1)
  return len3(pax - bax * h, pay - bay * h, paz - baz * h) - r
}
/** round cone between a (radius r1) and b (radius r2) — iq */
function roundCone(px, py, pz, ax, ay, az, bx, by, bz, r1, r2) {
  const bax = bx - ax, bay = by - ay, baz = bz - az
  const l2 = bax * bax + bay * bay + baz * baz
  const rr = r1 - r2
  const a2 = l2 - rr * rr
  const il2 = 1 / l2
  const pax = px - ax, pay = py - ay, paz = pz - az
  const y = pax * bax + pay * bay + paz * baz
  const z = y - l2
  const xx = (pax * l2 - bax * y) ** 2 + (pay * l2 - bay * y) ** 2 + (paz * l2 - baz * y) ** 2
  const y2 = y * y * l2
  const z2 = z * z * l2
  const k = Math.sign(rr) * rr * rr * xx
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(xx + z2) * il2 - r2
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(xx + y2) * il2 - r1
  return (Math.sqrt(xx * a2 * il2) + y * rr) * il2 - r1
}

/* tiny deterministic value noise for organic micro-variation */
function hash(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return s - Math.floor(s)
}
function vnoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z)
  const fx = x - ix, fy = y - iy, fz = z - iz
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz)
  let r = 0
  for (let dz = 0; dz < 2; dz++)
    for (let dy = 0; dy < 2; dy++)
      for (let dx = 0; dx < 2; dx++) {
        const w = (dx ? ux : 1 - ux) * (dy ? uy : 1 - uy) * (dz ? uz : 1 - uz)
        r += w * hash(ix + dx, iy + dy, iz + dz)
      }
  return r * 2 - 1
}

/* ------------------------------------------------------------------ */
/* Anatomy: mandibular first molar (5 cusps, 2 roots)                  */
/* units: ~1 = crown mesio-distal width. y up, x mesio-distal,         */
/* z bucco-lingual (+z buccal)                                          */
/* ------------------------------------------------------------------ */
const CEJ_Y = 0.0 // cemento-enamel junction height

/** 2D rounded rectangle SDF (half sizes hx,hz; corner radius r) */
function roundRect(x, z, hx, hz, r) {
  const qx = Math.abs(x) - (hx - r)
  const qz = Math.abs(z) - (hz - r)
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r
}
/** extrude a 2D distance between y0..y1 with rounded edges of radius re */
function extrude(d2, y, y0, y1, re) {
  const dy = Math.max(y0 - y, y - y1)
  const wx = d2 + re
  const wy = dy + re
  return Math.min(Math.max(wx, wy), 0) + Math.hypot(Math.max(wx, 0), Math.max(wy, 0)) - re
}

/**
 * Crown built from five developmental LOBES (one per cusp). Each lobe is a tall
 * ellipsoid running from the cervical third to its cusp tip; blending them with
 * a smooth union yields the natural vertical depressions between cusps and a
 * convex, organic silhouette (no box-like walls, no collar).
 */
const LOBES = [
  // x, z, tipY, lobe radii (rx, rz), tip radii (rx, ry, rz)
  [-0.235, 0.165, 0.6, 0.21, 0.2, 0.16, 0.13, 0.15], // mesiobuccal
  [0.065, 0.19, 0.585, 0.19, 0.19, 0.15, 0.125, 0.14], // distobuccal
  [0.3, 0.085, 0.55, 0.16, 0.17, 0.125, 0.11, 0.13], // distal
  [-0.2, -0.165, 0.645, 0.2, 0.19, 0.15, 0.14, 0.14], // mesiolingual
  [0.165, -0.175, 0.63, 0.19, 0.18, 0.145, 0.135, 0.135], // distolingual
]

function crown(x, y, z) {
  // core volume that fills the space between lobes
  let d = ellipsoid(x - 0.02, y - 0.3, z, 0.45, 0.3, 0.385)
  for (const [cx, cz, tipY, lrx, lrz, trx, try_, trz] of LOBES) {
    const lobe = ellipsoid(x - cx * 0.92, y - 0.33, z - cz * 0.9, lrx, 0.33, lrz)
    const tip = ellipsoid(x - cx, y - tipY, z - cz, trx, try_, trz)
    d = smin(d, smin(lobe, tip, 0.1), 0.085)
  }
  // central fossa / occlusal valley (elongated mesio-distally)
  d = ssub(d, ellipsoid(x - 0.02, y - 0.77, z, 0.3, 0.13, 0.085), 0.08)
  // fine central developmental groove, ends hidden in mesial/distal pits
  d = ssub(d, capsule(x, y, z, -0.24, 0.655, 0.005, 0.26, 0.64, -0.005, 0.016), 0.035)
  // buccal & lingual grooves (soft notches between lobes)
  d = ssub(d, capsule(x, y, z, -0.08, 0.66, 0.05, -0.085, 0.42, 0.42, 0.018), 0.045)
  d = ssub(d, capsule(x, y, z, -0.02, 0.67, -0.05, -0.02, 0.48, -0.4, 0.018), 0.045)
  return d
}

function roots(x, y, z) {
  // Root trunk: tapers smoothly from the cervical outline (no collar)
  const zs = 0.84 // roots are flatter mesio-distally, broad bucco-lingually
  const trunk = roundCone(x, y, z * 0.95, 0.0, 0.06, 0, 0.0, -0.36, 0, 0.36, 0.31)
  const trunkX = roundCone(x * 0.82, y, z, 0.0, 0.06, 0, 0.0, -0.36, 0, 0.3, 0.26)
  let d = Math.max(trunk, trunkX) // rounded-rect-like cross section

  // Distal curvature of the roots with depth
  const bend = (yy) => 0.07 * yy * yy
  const mx = x + bend(y)
  const mesial = roundCone(mx, y, z * zs, -0.2, -0.2, 0, -0.185, -1.3, 0, 0.18, 0.05)
  const dx = x + bend(y) * 0.55
  const distal = roundCone(dx, y, z * zs, 0.2, -0.2, 0, 0.265, -1.18, 0, 0.17, 0.055)

  d = smin(d, mesial, 0.15)
  d = smin(d, distal, 0.15)
  // Furcation between the roots
  d = ssub(d, ellipsoid(x - 0.02, y + 0.86, z, 0.11, 0.42, 0.7), 0.12)
  return d
}

/** Complete tooth SDF */
function toothSDF(x, y, z) {
  const c = crown(x, y, z)
  const r = roots(x, y, z)
  // Cervical constriction: union with a soft blend so the neck narrows
  let d = smin(c, r, 0.12)
  // micro organic variation (very subtle, avoids a "CG perfect" look)
  d += 0.002 * vnoise(x * 7, y * 7, z * 7)
  return d
}

/* ------------------------------------------------------------------ */
/* Mesh extraction                                                     */
/* ------------------------------------------------------------------ */
const bounds = [
  [-0.72, -1.5, -0.66],
  [0.72, 0.92, 0.66],
]
const ext = bounds[1].map((v, i) => v - bounds[0][i])
const maxExt = Math.max(...ext)
const dims = ext.map((e) => Math.ceil((e / maxExt) * RES))

console.log(`[tooth] sampling SDF on ${dims.join('×')} grid…`)
const t0 = performance.now()
const raw = surfaceNets(dims, (x, y, z) => toothSDF(x, y, z), bounds)
console.log(`[tooth] surface nets: ${raw.positions.length} verts, ${raw.cells.length} cells (${(performance.now() - t0).toFixed(0)} ms)`)

// gradient via central differences
const EPS = 1e-4
function grad(x, y, z) {
  const gx = toothSDF(x + EPS, y, z) - toothSDF(x - EPS, y, z)
  const gy = toothSDF(x, y + EPS, z) - toothSDF(x, y - EPS, z)
  const gz = toothSDF(x, y, z + EPS) - toothSDF(x, y, z - EPS)
  const l = Math.hypot(gx, gy, gz) || 1
  return [gx / l, gy / l, gz / l]
}
/** Newton projection of a point onto the zero level set */
function project(p) {
  let [x, y, z] = p
  for (let i = 0; i < 4; i++) {
    const d = toothSDF(x, y, z)
    if (Math.abs(d) < 1e-6) break
    const [nx, ny, nz] = grad(x, y, z)
    x -= nx * d
    y -= ny * d
    z -= nz * d
  }
  return [x, y, z]
}

// triangulate (surface nets yields quads)
const tris = []
for (const c of raw.cells) {
  if (c.length === 3) tris.push(c[0], c[1], c[2])
  else if (c.length === 4) tris.push(c[0], c[1], c[2], c[0], c[2], c[3])
}
let positions = new Float32Array(raw.positions.length * 3)
raw.positions.forEach((p, i) => {
  const q = project(p)
  positions.set(q, i * 3)
})
let indices = new Uint32Array(tris)

// fix winding so faces point outward (compare face normal with SDF gradient)
{
  let agree = 0
  for (let i = 0; i < Math.min(indices.length, 30000); i += 3) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3
    const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2]
    const vx = positions[c] - positions[a], vy = positions[c + 1] - positions[a + 1], vz = positions[c + 2] - positions[a + 2]
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx
    const g = grad(positions[a], positions[a + 1], positions[a + 2])
    agree += nx * g[0] + ny * g[1] + nz * g[2] > 0 ? 1 : -1
  }
  if (agree < 0) {
    for (let i = 0; i < indices.length; i += 3) {
      const t = indices[i + 1]
      indices[i + 1] = indices[i + 2]
      indices[i + 2] = t
    }
    console.log('[tooth] winding flipped to outward-facing')
  }
}

// simplify while preserving shape
await MeshoptSimplifier.ready
const triCount = indices.length / 3
if (triCount > TARGET_TRIS) {
  const [simplified, err] = MeshoptSimplifier.simplify(indices, positions, 3, TARGET_TRIS * 3, 0.0008, [])
  console.log(`[tooth] simplified ${triCount} → ${simplified.length / 3} tris (error ${(err * 100).toFixed(4)}%)`)
  indices = simplified
}

// compact vertex buffer
{
  const remap = new Int32Array(positions.length / 3).fill(-1)
  const out = []
  let n = 0
  for (let i = 0; i < indices.length; i++) {
    const v = indices[i]
    if (remap[v] < 0) {
      remap[v] = n++
      out.push(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2])
    }
    indices[i] = remap[v]
  }
  positions = new Float32Array(out)
}

// re-project after simplification + analytic normals + vertex colours
const vCount = positions.length / 3
const normals = new Float32Array(vCount * 3)
const colors = new Float32Array(vCount * 4)
let minY = Infinity, maxY = -Infinity
for (let i = 0; i < vCount; i++) {
  const q = project([positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]])
  positions.set(q, i * 3)
  normals.set(grad(q[0], q[1], q[2]), i * 3)
  minY = Math.min(minY, q[1])
  maxY = Math.max(maxY, q[1])
}

// Colour: enamel (cool porcelain white) → cementum (warm ivory) across the CEJ.
// Alpha channel stores a "enamel mask" usable by custom shaders.
const enamel = [0.965, 0.975, 0.97]
const cementum = [0.86, 0.82, 0.74]
const groove = [0.84, 0.87, 0.85]
for (let i = 0; i < vCount; i++) {
  const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2]
  // CEJ follows a gentle scalloped curve
  const cej = CEJ_Y + 0.05 * Math.cos(x * 4.2) * (Math.abs(z) > 0.2 ? 1 : 0.4)
  const t = clamp((y - (cej - 0.06)) / 0.12, 0, 1)
  const s = t * t * (3 - 2 * t)
  let r = mix(cementum[0], enamel[0], s)
  let g = mix(cementum[1], enamel[1], s)
  let b = mix(cementum[2], enamel[2], s)
  // occlusal grooves slightly darker for definition
  if (y > 0.55) {
    const cav = clamp((0.035 - Math.abs(toothSDF(x, y, z) - crown(x, y, z))) / 0.035, 0, 1)
    const depth = clamp((0.86 - y) / 0.2, 0, 1) * 0.35
    r = mix(r, groove[0], depth * (1 - cav * 0))
    g = mix(g, groove[1], depth)
    b = mix(b, groove[2], depth)
  }
  // root tips slightly deeper tone
  const tip = clamp((-0.8 - y) / 0.5, 0, 1)
  r = mix(r, 0.8, tip * 0.4)
  g = mix(g, 0.74, tip * 0.4)
  b = mix(b, 0.64, tip * 0.4)
  colors.set([r, g, b, s], i * 4)
}

// centre on bounding box & normalise height to 2 units
let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
for (let i = 0; i < vCount; i++) {
  minX = Math.min(minX, positions[i * 3]); maxX = Math.max(maxX, positions[i * 3])
  minZ = Math.min(minZ, positions[i * 3 + 2]); maxZ = Math.max(maxZ, positions[i * 3 + 2])
}
const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2
const scale = 2 / (maxY - minY)
for (let i = 0; i < vCount; i++) {
  positions[i * 3] = (positions[i * 3] - cx) * scale
  positions[i * 3 + 1] = (positions[i * 3 + 1] - cy) * scale
  positions[i * 3 + 2] = (positions[i * 3 + 2] - cz) * scale
}

/* ------------------------------------------------------------------ */
/* GLB export                                                          */
/* ------------------------------------------------------------------ */
const doc = new Document()
doc.createBuffer()
const material = doc
  .createMaterial('ToothPorcelain')
  .setBaseColorFactor([1, 1, 1, 1])
  .setRoughnessFactor(0.32)
  .setMetallicFactor(0)
const prim = doc
  .createPrimitive()
  .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(positions))
  .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(normals))
  .setAttribute('COLOR_0', doc.createAccessor().setType('VEC4').setArray(colors))
  .setIndices(doc.createAccessor().setType('SCALAR').setArray(vCount > 65535 ? indices : new Uint16Array(indices)))
  .setMaterial(material)
const mesh = doc.createMesh('Tooth').addPrimitive(prim)
const node = doc.createNode('Tooth').setMesh(mesh)
doc.createScene('Scene').addChild(node)
doc.getRoot().getAsset().generator = 'Alvea procedural tooth generator (original work)'
doc.getRoot().getAsset().copyright = 'Original procedural model — free for commercial use within this template'

await MeshoptEncoder.ready
await doc.transform(
  quantize({ quantizePosition: 16, quantizeNormal: 12, quantizeColor: 10 }),
  meshoptCompress({ encoder: MeshoptEncoder, level: 'high' }),
)
doc.createExtension(KHRMeshQuantization).setRequired(true)

mkdirSync(dirname(OUT), { recursive: true })
const io = new NodeIO()
  .registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
await io.write(OUT, doc)
console.log(`[tooth] wrote ${OUT} — ${vCount} verts, ${indices.length / 3} tris`)
