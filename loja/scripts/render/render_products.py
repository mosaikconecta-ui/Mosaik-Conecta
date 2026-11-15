"""
Gera as imagens de demonstração dos produtos Mosaik com Blender (Cycles, headless).

Uso:
  /opt/bpyenv/bin/python scripts/render/render_products.py [slug ...] [--samples 64] [--size 1000]

As imagens são renderizações 3D procedurais (não são fotos de produtos reais) e são
usadas apenas como material de demonstração. Substitua-as pelas fotos oficiais dos
fornecedores antes de operar a loja.
"""
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "public", "products")
OUT_DIR = os.path.abspath(OUT_DIR)

ARGS = sys.argv[1:]
SAMPLES = 64
SIZE = 1000
if "--samples" in ARGS:
    i = ARGS.index("--samples"); SAMPLES = int(ARGS[i + 1]); del ARGS[i:i + 2]
if "--size" in ARGS:
    i = ARGS.index("--size"); SIZE = int(ARGS[i + 1]); del ARGS[i:i + 2]
ONLY = set(ARGS)


def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (*lin, 1.0)


# ───────────────────────────── cena ─────────────────────────────

def reset_scene(backdrop_hex, wide=False):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    scn.render.engine = "CYCLES"
    scn.cycles.device = "CPU"
    scn.cycles.samples = SAMPLES
    scn.cycles.use_denoising = True
    try:
        scn.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception:
        pass
    scn.cycles.max_bounces = 8
    scn.cycles.transmission_bounces = 8
    scn.render.resolution_x = int(SIZE * (16 / 9)) if wide else SIZE
    scn.render.resolution_y = int(SIZE) if wide else int(SIZE * 1.25)
    scn.render.image_settings.file_format = "JPEG"
    scn.render.image_settings.quality = 90
    scn.view_settings.view_transform = "AgX" if "AgX" in [i.identifier for i in scn.view_settings.bl_rna.properties["view_transform"].enum_items] else "Filmic"
    try:
        scn.view_settings.look = "AgX - Punchy"
    except Exception:
        scn.view_settings.look = "None"
    scn.view_settings.exposure = -0.15

    world = bpy.data.worlds.new("W")
    scn.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = srgb("#f3ede4")
    bg.inputs[1].default_value = 0.25

    make_backdrop(backdrop_hex)
    make_lights()
    return scn


def make_backdrop(hexcol):
    # ciclorama: chão + curva + parede, sem emenda
    verts, faces = [], []
    prof = []
    for i in range(12):
        prof.append((-14 + i * 1.4, 0.0))
    r = 5.0
    for i in range(1, 17):
        a = (i / 16) * (math.pi / 2)
        prof.append((r * math.sin(a) + 2.0, r - r * math.cos(a)))
    for i in range(1, 8):
        prof.append((7.0, r + i * 2.0))
    w = 30
    for x in (-w, w):
        for (y, z) in prof:
            verts.append((x, y, z))
    n = len(prof)
    for i in range(n - 1):
        faces.append((i, i + 1, n + i + 1, n + i))
    me = bpy.data.meshes.new("backdrop")
    me.from_pydata(verts, [], faces)
    me.update()
    ob = bpy.data.objects.new("backdrop", me)
    bpy.context.collection.objects.link(ob)
    for p in me.polygons:
        p.use_smooth = True
    m = mat_basic("backdrop", hexcol, rough=0.9)
    ob.data.materials.append(m)


def make_lights():
    def area(name, loc, rot, size, power, col="#fff6ec"):
        ld = bpy.data.lights.new(name, "AREA")
        ld.shape = "RECTANGLE"
        ld.size = size
        ld.size_y = size * 0.7
        ld.energy = power
        ld.color = srgb(col)[:3]
        ob = bpy.data.objects.new(name, ld)
        ob.location = loc
        ob.rotation_euler = rot
        bpy.context.collection.objects.link(ob)
        return ob

    def aim(ob, target=(0, 0, 1)):
        d = Vector(target) - ob.location
        ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()

    k = area("key", (-5.5, -5.0, 7.0), (0, 0, 0), 6.0, 2600)
    aim(k)
    f = area("fill", (6.5, -4.0, 3.5), (0, 0, 0), 7.0, 500, "#f2f4ff")
    aim(f)
    rim = area("rim", (2.5, 6.0, 6.5), (0, 0, 0), 4.0, 900)
    aim(rim)


def camera(target=(0, 0, 1.2), dist=9.0, elev=12, azim=-18, lens=70):
    cam = bpy.data.cameras.new("cam")
    cam.lens = lens
    ob = bpy.data.objects.new("cam", cam)
    bpy.context.collection.objects.link(ob)
    e, a = math.radians(elev), math.radians(azim)
    t = Vector(target)
    ob.location = t + Vector((dist * math.cos(e) * math.sin(a), -dist * math.cos(e) * math.cos(a), dist * math.sin(e)))
    d = t - ob.location
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = ob
    return ob


# ───────────────────────────── materiais ─────────────────────────────

def mat_basic(name, hexcol, rough=0.5, metal=0.0, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = srgb(hexcol)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if coat:
        b.inputs["Coat Weight"].default_value = coat
        b.inputs["Coat Roughness"].default_value = 0.08
    return m


def mat_ceramic(name, hexcol, rough=0.55, speckle=True, glaze=0.0):
    """Grés com pintas (speckled stoneware) e relevo sutil."""
    m = mat_basic(name, hexcol, rough=rough, coat=glaze)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    if speckle:
        n = nt.nodes.new("ShaderNodeTexNoise")
        n.inputs["Scale"].default_value = 180
        n.inputs["Detail"].default_value = 2
        nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].position = 0.62
        ramp.color_ramp.elements[0].color = (1, 1, 1, 1)
        ramp.color_ramp.elements[1].position = 0.665
        ramp.color_ramp.elements[1].color = (0.25, 0.22, 0.2, 1)
        nt.links.new(n.outputs["Fac"], ramp.inputs["Fac"])
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1.0
        mix.inputs[6].default_value = srgb(hexcol)
        nt.links.new(ramp.outputs["Color"], mix.inputs[7])
        nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    bump_n = nt.nodes.new("ShaderNodeTexNoise")
    bump_n.inputs["Scale"].default_value = 14
    bump_n.inputs["Detail"].default_value = 6
    nt.links.new(tc.outputs["Object"], bump_n.inputs["Vector"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.12
    nt.links.new(bump_n.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


def mat_glass(name, hexcol="#ffffff", rough=0.0, ior=1.47):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = srgb(hexcol)
    b.inputs["Transmission Weight"].default_value = 1.0
    b.inputs["Roughness"].default_value = rough
    b.inputs["IOR"].default_value = ior
    return m


def mat_stone(name, hexcol, vein="#b8a68c", rough=0.6):
    m = mat_basic(name, hexcol, rough=rough)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n = nt.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = 2.2
    n.inputs["Detail"].default_value = 10
    n.inputs["Distortion"].default_value = 0.6
    nt.links.new(tc.outputs["Object"], n.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[0].color = srgb(hexcol)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = srgb(vein)
    nt.links.new(n.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    pits = nt.nodes.new("ShaderNodeTexVoronoi")
    pits.inputs["Scale"].default_value = 40
    nt.links.new(tc.outputs["Object"], pits.inputs["Vector"])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.05
    nt.links.new(pits.outputs["Distance"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
    return m


def mat_wax(name, hexcol="#efe6d6"):
    m = mat_basic(name, hexcol, rough=0.45)
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Subsurface Weight"].default_value = 0.6
    b.inputs["Subsurface Radius"].default_value = (0.4, 0.3, 0.2)
    b.inputs["Subsurface Scale"].default_value = 0.2
    return m


def mat_emit(name, hexcol, strength=6.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != "OUTPUT_MATERIAL":
            nt.nodes.remove(n)
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs[0].default_value = srgb(hexcol)
    e.inputs[1].default_value = strength
    nt.links.new(e.outputs[0], nt.nodes["Material Output"].inputs[0])
    return m


def mat_opal(name, strength=2.2):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = srgb("#fbf6ee")
    b.inputs["Roughness"].default_value = 0.25
    b.inputs["Emission Color"].default_value = srgb("#ffd9a8")
    b.inputs["Emission Strength"].default_value = strength
    b.inputs["Coat Weight"].default_value = 0.5
    return m


# ───────────────────────────── geometria ─────────────────────────────

def lathe(name, profile, mat, loc=(0, 0, 0), steps=96, subsurf=2, scale=(1, 1, 1)):
    """Gira um perfil [(raio, z), ...] em torno do eixo Z."""
    bm = bmesh.new()
    rings = []
    for s in range(steps):
        a = 2 * math.pi * s / steps
        ring = []
        for (r, z) in profile:
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        rings.append(ring)
    n = len(profile)
    for s in range(steps):
        r0, r1 = rings[s], rings[(s + 1) % steps]
        for i in range(n - 1):
            bm.faces.new((r0[i], r1[i], r1[i + 1], r0[i + 1]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    ob.location = loc
    ob.scale = scale
    if subsurf:
        mod = ob.modifiers.new("ss", "SUBSURF")
        mod.levels = subsurf
        mod.render_levels = subsurf
    ob.data.materials.append(mat)
    return ob


def vessel(outer, wall=0.08, bottom=0.1):
    """Constrói perfil fechado (parede externa, lábio arredondado, parede interna)."""
    prof = [(0.0, 0.0)] + outer
    top_r, top_z = outer[-1]
    prof.append((top_r - wall * 0.5, top_z + wall * 0.35))
    inner = []
    for (r, z) in reversed(outer[1:]):
        if z < bottom:
            continue
        inner.append((max(r - wall, 0.001), z))
    prof += inner
    prof.append((0.0, bottom + 0.02))
    return prof


def cylinder(name, r, h, mat, loc=(0, 0, 0), rot=(0, 0, 0), verts=48):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=verts, location=loc, rotation=rot)
    ob = bpy.context.active_object
    ob.name = name
    ob.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return ob


def handle(name, mat, loc, size=0.42, thick=0.07):
    bpy.ops.mesh.primitive_torus_add(major_radius=size, minor_radius=thick, major_segments=48, minor_segments=16,
                                     location=loc, rotation=(math.pi / 2, 0, 0))
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = (0.62, 1.0, 1.18)
    ob.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return ob


def render(path):
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("ok", path, flush=True)


# ───────────────────────────── produtos ─────────────────────────────

def duna(col, scale=1.0, x=0.0, name="duna"):
    outer = [(0.55, 0.0), (0.75, 0.15), (0.95, 0.6), (1.0, 1.0), (0.9, 1.5), (0.62, 2.0), (0.42, 2.35), (0.40, 2.6), (0.46, 2.78)]
    return lathe(name, vessel(outer, 0.07), mat_ceramic(name + col, col),
                 loc=(x, 0, 0), scale=(scale, scale, scale))


def seixo(col, x=0.0):
    outer = [(0.5, 0.0), (0.9, 0.1), (1.25, 0.45), (1.3, 0.75), (1.1, 1.1), (0.55, 1.35), (0.32, 1.45), (0.3, 1.62)]
    return lathe("seixo", vessel(outer, 0.06), mat_ceramic("seixo" + col, col, rough=0.7), loc=(x, 0, 0))


def bowl(col, x=0.0, y=0.0, s=1.0, glaze=0.0):
    outer = [(0.35, 0.0), (0.42, 0.04), (0.8, 0.25), (1.05, 0.55), (1.15, 0.78)]
    return lathe("bowl", vessel(outer, 0.06, bottom=0.06), mat_ceramic("bowl" + col, col, rough=0.35 if glaze else 0.55, glaze=glaze),
                 loc=(x, y, 0), scale=(s, s, s))


def mug(col, x=0.0, y=0.0, rotz=0.0):
    outer = [(0.5, 0.0), (0.56, 0.03), (0.6, 0.2), (0.6, 1.05), (0.61, 1.2)]
    m = mat_ceramic("mug" + col, col, rough=0.4, glaze=0.3)
    body = lathe("mug", vessel(outer, 0.05), m, loc=(0, 0, 0))
    h = handle("handle", m, (0.74, 0, 0.62), size=0.33, thick=0.055)
    bpy.ops.object.select_all(action="DESELECT")
    empty = bpy.data.objects.new("mugroot", None)
    bpy.context.collection.objects.link(empty)
    body.parent = empty
    h.parent = empty
    empty.location = (x, y, 0)
    empty.rotation_euler = (0, 0, rotz)
    return empty


def plate(col, z=0.0, x=0.0, s=1.0):
    outer = [(1.0, 0.0), (1.1, 0.02), (1.5, 0.06), (1.85, 0.16), (2.0, 0.24)]
    return lathe("plate", vessel(outer, 0.05, bottom=0.05), mat_ceramic("plate" + col, col, rough=0.4, glaze=0.25),
                 loc=(x, 0, z), scale=(s, s, s))


def glass_tumbler(x=0.0, y=0.0, water=True):
    outer = [(0.42, 0.0), (0.46, 0.02), (0.5, 0.2), (0.55, 1.25)]
    g = lathe("tumbler", vessel(outer, 0.03, bottom=0.12), mat_glass("glass"), loc=(x, y, 0), steps=96)
    if water:
        wp = [(0.0, 0.13), (0.45, 0.13), (0.505, 0.85), (0.0, 0.85)]
        lathe("water", wp, mat_glass("water", "#eef7ff", ior=1.33), loc=(x, y, 0), subsurf=1)
    return g


def carafe(x=0.0):
    outer = [(0.7, 0.0), (0.78, 0.04), (0.85, 0.4), (0.8, 1.2), (0.45, 1.8), (0.32, 2.4), (0.34, 2.75), (0.38, 2.82)]
    lathe("carafe", vessel(outer, 0.035, bottom=0.12), mat_glass("glass"), loc=(x, 0, 0))
    wp = [(0.0, 0.13), (0.8, 0.13), (0.82, 0.4), (0.77, 1.2), (0.0, 1.2)]
    lathe("water", wp, mat_glass("water", "#eef7ff", ior=1.33), loc=(x, 0, 0), subsurf=1)


def lamp_farol(metal_hex, metal_rough, x=0.0):
    met = mat_basic("met", metal_hex, rough=metal_rough, metal=1.0)
    base = [(0.0, 0.0), (0.7, 0.0), (0.72, 0.06), (0.6, 0.12), (0.12, 0.16), (0.08, 0.3), (0.06, 2.4), (0.0, 2.4)]
    lathe("base", base, met, loc=(x, 0, 0), subsurf=1)
    shade = [(0.12, 3.2), (0.6, 3.0), (1.05, 2.55), (1.2, 2.25), (1.18, 2.2), (1.0, 2.5), (0.58, 2.93), (0.1, 3.12)]
    lathe("shade", shade, met, loc=(x, 0, 0), subsurf=2)
    bulb = cylinder("bulb", 0.18, 0.3, mat_emit("bulb", "#ffd7a1", 25), loc=(x, 0, 2.55))
    pl = bpy.data.lights.new("lampl", "POINT")
    pl.energy = 60
    pl.color = srgb("#ffcf94")[:3]
    pl.shadow_soft_size = 0.2
    o = bpy.data.objects.new("lampl", pl)
    o.location = (x, 0, 2.4)
    bpy.context.collection.objects.link(o)


def lamp_lua(x=0.0):
    wood = mat_basic("wood", "#6b4a33", rough=0.5)
    lathe("base", [(0.0, 0.0), (0.62, 0.0), (0.66, 0.05), (0.64, 0.42), (0.4, 0.5), (0.0, 0.5)], wood, loc=(x, 0, 0), subsurf=1)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.05, location=(x, 0, 1.45), segments=96, ring_count=48)
    s = bpy.context.active_object
    bpy.ops.object.shade_smooth()
    s.data.materials.append(mat_opal("opal"))
    pl = bpy.data.lights.new("lampl", "POINT")
    pl.energy = 40
    pl.color = srgb("#ffcf94")[:3]
    o = bpy.data.objects.new("lampl", pl)
    o.location = (x, 0, 1.45)
    bpy.context.collection.objects.link(o)


def candle_jar(jar_hex, x=0.0, lit=False):
    outer = [(0.6, 0.0), (0.68, 0.04), (0.72, 0.2), (0.72, 1.05), (0.71, 1.12)]
    lathe("jar", vessel(outer, 0.06), mat_ceramic("jar" + jar_hex, jar_hex, rough=0.6), loc=(x, 0, 0))
    lathe("wax", [(0.0, 0.1), (0.66, 0.1), (0.66, 0.9), (0.0, 0.92)], mat_wax("wax"), loc=(x, 0, 0), subsurf=1)
    cylinder("wick", 0.018, 0.14, mat_basic("wick", "#1d1a17", 0.8), loc=(x, 0, 0.98))
    if lit:
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.05, location=(x, 0, 1.12))
        f = bpy.context.active_object
        f.scale = (1, 1, 2.4)
        f.data.materials.append(mat_emit("flame", "#ffb45a", 40))
        pl = bpy.data.lights.new("flame", "POINT")
        pl.energy = 4
        pl.color = srgb("#ffb45a")[:3]
        o = bpy.data.objects.new("flamel", pl)
        o.location = (x, 0, 1.2)
        bpy.context.collection.objects.link(o)


def diffuser(glass_hex, x=0.0):
    outer = [(0.45, 0.0), (0.52, 0.03), (0.6, 0.3), (0.6, 1.1), (0.4, 1.35), (0.15, 1.5), (0.14, 1.7), (0.17, 1.75)]
    lathe("bottle", vessel(outer, 0.04, bottom=0.12), mat_glass("bglass", glass_hex, rough=0.05), loc=(x, 0, 0))
    lathe("liquid", [(0.0, 0.13), (0.55, 0.13), (0.56, 0.75), (0.0, 0.75)], mat_glass("liq", "#e8b46a", ior=1.4), loc=(x, 0, 0), subsurf=1)
    reed = mat_basic("reed", "#2b2420", 0.7)
    for i in range(7):
        a = i * 2 * math.pi / 7
        tilt = math.radians(9 + (i % 3) * 3)
        cylinder("reed%d" % i, 0.018, 2.6, reed, loc=(x + math.cos(a) * 0.05 + math.sin(tilt) * math.cos(a) * 1.3,
                                                   math.sin(a) * 0.05 + math.sin(tilt) * math.sin(a) * 1.3, 1.05 + 1.3 * math.cos(tilt)),
                 rot=(-tilt * math.sin(a), tilt * math.cos(a), 0), verts=8)


def tray(stone_hex, vein_hex, x=0.0):
    prof = [(0.0, 0.0), (1.9, 0.0), (2.0, 0.05), (2.0, 0.2), (1.95, 0.24), (1.8, 0.22), (1.75, 0.1), (0.0, 0.1)]
    lathe("tray", prof, mat_stone("stone", stone_hex, vein_hex), loc=(x, 0, 0), scale=(1.45, 1.0, 1.0), subsurf=2)


def incense(col, x=0.0):
    prof = [(0.0, 0.0), (0.95, 0.0), (1.0, 0.04), (1.0, 0.12), (0.95, 0.16), (0.12, 0.16), (0.04, 0.12), (0.0, 0.12)]
    lathe("disc", prof, mat_ceramic("inc" + col, col, rough=0.65), loc=(x, 0, 0))
    cylinder("stick", 0.02, 1.9, mat_basic("stick", "#5a3b2a", 0.8), loc=(x + 0.12, 0, 1.05), rot=(0, math.radians(7), 0), verts=8)


def castical(x=0.0, h=2.0):
    brass = mat_basic("brass", "#c9a46a", rough=0.28, metal=1.0)
    prof = [(0.0, 0.0), (0.55, 0.0), (0.58, 0.05), (0.5, 0.12), (0.18, 0.2), (0.16, h - 0.25), (0.28, h - 0.12), (0.28, h), (0.14, h), (0.13, h - 0.3), (0.0, h - 0.3)]
    lathe("cast", prof, brass, loc=(x, 0, 0), subsurf=2)
    cylinder("taper", 0.11, 2.2, mat_wax("taper", "#f3ede2"), loc=(x, 0, h - 0.3 + 1.1))


def plinth(hexcol, r=1.6, h=0.6, x=0.0, y=0.0):
    prof = [(0.0, 0.0), (r, 0.0), (r, h - 0.02), (r - 0.02, h), (0.0, h)]
    return lathe("plinth", prof, mat_basic("plinth", hexcol, rough=0.8), loc=(x, y, 0), subsurf=0)


# ───────────────────────────── roteiro de imagens ─────────────────────────────

C = {
    "areia": "#d8c7ad", "grafite": "#3b3a38", "argila": "#b5653f", "osso": "#ece4d6", "musgo": "#6f7556",
    "cobalto": "#2f4a7a", "creme": "#efe3cc", "terracota": "#a9502f",
}

SHOTS = []


def shot(slug, backdrop, wide=False):
    def deco(fn):
        SHOTS.append((slug, backdrop, wide, fn))
        return fn
    return deco


for key in ("areia", "grafite", "argila"):
    @shot(f"vaso-duna-{key}-1", "#e9e2d6")
    def _(key=key):
        duna(C[key]); camera(target=(0, 0, 1.3), dist=10.5, elev=10)
shot("vaso-duna-detalhe", "#d9cfc0")(lambda: (duna(C["areia"]), camera(target=(0, 0, 2.1), dist=4.6, elev=30, azim=-30, lens=85)))
shot("vaso-duna-trio", "#e2dbcf")(lambda: (duna(C["argila"], 1.0, -1.3, "a"), duna(C["areia"], 0.72, 0.85, "b"), duna(C["grafite"], 0.55, 2.3, "c"), camera(target=(0.55, 0, 1.1), dist=15.5, elev=9)))

for key in ("osso", "musgo"):
    @shot(f"vaso-seixo-{key}-1", "#ddd6c8" if key == "osso" else "#e8e1d4")
    def _(key=key):
        seixo(C[key]); camera(target=(0, 0, 0.8), dist=8.5, elev=14)
shot("vaso-seixo-topo", "#e8e1d4")(lambda: (seixo(C["musgo"]), camera(target=(0, 0, 0.6), dist=6.5, elev=58, azim=-10)))

for key, glaze in (("areia", 0.0), ("cobalto", 0.6)):
    @shot(f"bowl-mare-{key}-1", "#ebe5da")
    def _(key=key, glaze=glaze):
        bowl(C[key], -0.75, 0.3, 1.0, glaze); bowl(C[key], 1.25, -0.35, 0.8, glaze)
        camera(target=(0.25, 0, 0.45), dist=9, elev=22)
shot("bowl-mare-topo", "#d6cdbf")(lambda: (bowl(C["cobalto"], 0, 0, 1.0, 0.6), camera(target=(0, 0, 0.35), dist=6.0, elev=48, azim=-15)))

for key in ("creme", "grafite", "terracota"):
    @shot(f"caneca-aurora-{key}-1", "#e6dfd2")
    def _(key=key):
        mug(C[key], rotz=math.radians(-25)); camera(target=(0.15, 0, 0.62), dist=6.2, elev=12)
shot("caneca-aurora-par", "#d9d0c2")(lambda: (mug(C["terracota"], -0.75, 0.25, math.radians(-30)), mug(C["creme"], 0.85, -0.25, math.radians(200)), camera(target=(0.05, 0, 0.6), dist=7.8, elev=14)))

for key in ("osso", "grafite"):
    @shot(f"prato-orla-{key}-1", "#e3ddd2")
    def _(key=key):
        for i in range(4):
            plate(C[key], z=i * 0.2)
        camera(target=(0, 0, 0.45), dist=11.5, elev=24)
shot("prato-orla-topo", "#cfc6b8")(lambda: (plate(C["osso"]), bowl(C["areia"], 0, 0, 0.7), camera(target=(0, 0, 0.2), dist=10, elev=72, azim=0)))

shot("jarra-brisa-1", "#dfe2dc")(lambda: (carafe(), camera(target=(0, 0, 1.35), dist=9, elev=8)))
shot("jarra-brisa-conjunto", "#e4e3dc")(lambda: (carafe(-0.9), glass_tumbler(0.9, -0.3), camera(target=(0, 0, 1.2), dist=10.5, elev=10)))
shot("copo-brisa-1", "#e2e4de")(lambda: (glass_tumbler(-0.6, 0.2), glass_tumbler(0.6, -0.2), camera(target=(0, 0, 0.6), dist=7.2, elev=12)))
shot("copo-brisa-topo", "#d8dbd4")(lambda: (glass_tumbler(0, 0), camera(target=(0, 0, 0.5), dist=4.8, elev=45)))

shot("luminaria-farol-latao-1", "#d9d1c3")(lambda: (lamp_farol("#c9a46a", 0.3), camera(target=(0, 0, 1.6), dist=11, elev=8)))
shot("luminaria-farol-preto-1", "#e4ddd0")(lambda: (lamp_farol("#1e1d1c", 0.45), camera(target=(0, 0, 1.6), dist=11, elev=8)))
shot("luminaria-farol-detalhe", "#cbc2b3")(lambda: (lamp_farol("#c9a46a", 0.3), camera(target=(0, 0, 2.6), dist=5.5, elev=-8, azim=-20, lens=85)))

shot("luminaria-lua-1", "#d6cdbe")(lambda: (lamp_lua(), camera(target=(0, 0, 1.25), dist=9.5, elev=8)))
shot("luminaria-lua-detalhe", "#c9bfae")(lambda: (lamp_lua(), camera(target=(0, 0, 0.6), dist=5, elev=20, azim=-35, lens=85)))

for aroma, jar in (("figo", "#efe8dc"), ("cedro", "#3c3a37"), ("alecrim", "#7c8264")):
    @shot(f"vela-atelie-{aroma}-1", "#e6ded0")
    def _(jar=jar):
        candle_jar(jar, lit=True); camera(target=(0, 0, 0.6), dist=6.0, elev=14)
shot("vela-atelie-trio", "#ddd3c3")(lambda: (candle_jar("#efe8dc", -1.6), candle_jar("#3c3a37", 0, True), candle_jar("#7c8264", 1.6), camera(target=(0, 0, 0.6), dist=10, elev=14)))

for aroma, g in (("figo", "#ffffff"), ("cedro", "#8a5a2b")):
    @shot(f"difusor-sereno-{aroma}-1", "#e4ddd1")
    def _(g=g):
        diffuser(g); camera(target=(0, 0, 1.5), dist=10.5, elev=8)

shot("bandeja-travertino-1", "#e0d8cb")(lambda: (tray("#d9c9ad", "#c4b08e"), camera(target=(0, 0, 0.1), dist=9.5, elev=34)))
shot("bandeja-marmore-1", "#e4ddd1")(lambda: (tray("#2a2928", "#4a4642"), camera(target=(0, 0, 0.1), dist=9.5, elev=34)))
shot("bandeja-travertino-cena", "#d8cfc0")(lambda: (tray("#d9c9ad", "#c4b08e"), candle_jar("#efe8dc", -1.2, True), incense(C["grafite"], 1.4), camera(target=(0, 0, 0.5), dist=11, elev=26)))

for key in ("grafite", "osso"):
    @shot(f"porta-incenso-ilha-{key}-1", "#e6dfd3")
    def _(key=key):
        incense(C[key]); camera(target=(0, 0, 0.6), dist=6.5, elev=18)

shot("castical-prumo-1", "#dcd4c6")(lambda: (castical(-0.7, 1.4), castical(0.7, 2.2), camera(target=(0, 0, 2.0), dist=11, elev=6)))
shot("castical-prumo-detalhe", "#cfc5b5")(lambda: (castical(0, 2.0), camera(target=(0, 0, 1.9), dist=4.5, elev=10, azim=-30, lens=85)))

# Cenas editoriais (home / campanhas) — 16:9
def hero():
    plinth("#cdbfa9", 1.9, 1.1, -2.2, 0.6)
    plinth("#bfae95", 1.5, 0.5, 1.6, -0.4)
    duna(C["argila"], 1.05, -2.2, "h1"); bpy.data.objects["h1"].location.z = 1.1
    seixo(C["osso"], 1.6); bpy.data.objects["seixo"].location.z = 0.5
    candle_jar("#3c3a37", 4.0, lit=True)
    castical(-5.0, 2.6)
    camera(target=(-0.5, 0, 1.5), dist=15, elev=6, lens=62)


shot("hero-colecao", "#e3d6c3", wide=True)(hero)


def mesa():
    plate(C["osso"], 0, -1.4); bowl(C["areia"], -1.4, 0, 0.75)
    mug(C["terracota"], 1.9, 0.8, math.radians(-40))
    glass_tumbler(3.2, -0.5)
    plate(C["grafite"], 0, 5.0, 0.8)
    camera(target=(0.9, 0.3, 0.4), dist=10.5, elev=40, lens=50)


shot("cena-mesa-posta", "#cbbda8", wide=True)(mesa)


def luz():
    lamp_lua(-1.6); lamp_farol("#c9a46a", 0.3, 1.8)
    camera(target=(0.1, 0, 1.6), dist=10.5, elev=6, lens=50)


shot("cena-iluminacao", "#c7baa6", wide=True)(luz)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for slug, backdrop, wide, fn in SHOTS:
        if ONLY and slug not in ONLY and not any(slug.startswith(o) for o in ONLY):
            continue
        path = os.path.join(OUT_DIR, slug + ".jpg")
        if os.path.exists(path) and "--force" not in sys.argv:
            continue
        reset_scene(backdrop, wide)
        fn()
        render(path)


if __name__ == "__main__":
    main()
