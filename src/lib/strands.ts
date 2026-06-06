import { mulberry32 } from './rng'
import type { FieldData, FieldParams } from './geometry'

const GA = Math.PI * (3 - Math.sqrt(5))
const PHI = (1 + Math.sqrt(5)) / 2

// A strand is a polyline in space the fat-line builder turns into a glowing ribbon.
export interface Strand {
  pts: number[] // flat x,y,z,...
  tEach?: number[] // per-point color t (0..1)
  t: number // strand color t when tEach is absent
  accent: number // 0 none, 1 green, 2 red, 3 white
  seed: number // pulse phase seed
  closed: boolean // connect last point back to first
  dot: 'ends' | 'sparse' | 'none'
}

// Turn any set of polylines into the instanced fat-line FieldData. This is the
// shared path for every curve-based field (attractors, Hopf, knots, spirals).
export function buildStrands(strands: Strand[], radius: number): FieldData {
  let count = 0
  let segCount = 0
  for (const s of strands) {
    const k = s.pts.length / 3
    count += k
    segCount += s.closed ? k : Math.max(0, k - 1)
  }

  const nodePos = new Float32Array(count * 3)
  const nodeT = new Float32Array(count)
  const nodeAccent = new Float32Array(count)
  const nodeMag = new Float32Array(count)
  const nodeParam = new Float32Array(count)
  const nodeSize = new Float32Array(count)
  const segStart = new Float32Array(segCount * 3)
  const segEnd = new Float32Array(segCount * 3)
  const segParamStart = new Float32Array(segCount)
  const segParamEnd = new Float32Array(segCount)
  const segT = new Float32Array(segCount)
  const segAccent = new Float32Array(segCount)
  const segSeed = new Float32Array(segCount)

  let ni = 0
  let si = 0
  for (const s of strands) {
    const k = s.pts.length / 3
    const base = ni
    for (let j = 0; j < k; j++) {
      const o = ni * 3
      const x = s.pts[j * 3]
      const y = s.pts[j * 3 + 1]
      const z = s.pts[j * 3 + 2]
      nodePos[o] = x
      nodePos[o + 1] = y
      nodePos[o + 2] = z
      nodeT[ni] = s.tEach ? s.tEach[j] : s.t
      nodeAccent[ni] = s.accent
      nodeParam[ni] = k > 1 ? j / (k - 1) : 0
      nodeMag[ni] = (Math.hypot(x, y, z) / radius) * 60 + 8
      if (s.dot === 'ends') nodeSize[ni] = j === 0 || j === k - 1 ? 0.9 : 0
      else if (s.dot === 'sparse') nodeSize[ni] = j % 16 === 0 ? 0.65 : 0
      else nodeSize[ni] = 0
      ni++
    }
    const segN = s.closed ? k : k - 1
    for (let j = 0; j < segN; j++) {
      const a = base + j
      const b = base + ((j + 1) % k)
      const o = si * 3
      segStart[o] = nodePos[a * 3]
      segStart[o + 1] = nodePos[a * 3 + 1]
      segStart[o + 2] = nodePos[a * 3 + 2]
      segEnd[o] = nodePos[b * 3]
      segEnd[o + 1] = nodePos[b * 3 + 1]
      segEnd[o + 2] = nodePos[b * 3 + 2]
      segParamStart[si] = j / Math.max(1, segN)
      segParamEnd[si] = (j + 1) / Math.max(1, segN)
      segT[si] = s.tEach ? s.tEach[Math.min(k - 1, j)] : s.t
      segAccent[si] = s.accent
      segSeed[si] = s.seed
      si++
    }
  }

  return {
    count,
    segCount,
    pointsPerFiber: 0,
    nodePos,
    nodeT,
    nodeAccent,
    nodeMag,
    nodeParam,
    nodeSize,
    segStart,
    segEnd,
    segParamStart,
    segParamEnd,
    segT,
    segAccent,
    segSeed,
    radius,
  }
}

// fit a flat point list to a sphere of the given radius, centered on origin
function normalize(pts: number[], radius: number, fill = 1.4) {
  let minX = Infinity
  let minY = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  let maxZ = -Infinity
  for (let i = 0; i < pts.length; i += 3) {
    minX = Math.min(minX, pts[i])
    maxX = Math.max(maxX, pts[i])
    minY = Math.min(minY, pts[i + 1])
    maxY = Math.max(maxY, pts[i + 1])
    minZ = Math.min(minZ, pts[i + 2])
    maxZ = Math.max(maxZ, pts[i + 2])
  }
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const cz = (minZ + maxZ) / 2
  const half = Math.max(maxX - minX, maxY - minY, maxZ - minZ) / 2 || 1
  const s = (radius * fill) / half
  for (let i = 0; i < pts.length; i += 3) {
    pts[i] = (pts[i] - cx) * s
    pts[i + 1] = (pts[i + 1] - cy) * s
    pts[i + 2] = (pts[i + 2] - cz) * s
  }
}

type Deriv = (x: number, y: number, z: number) => [number, number, number]

const ATTRACTORS: Record<string, { f: Deriv; dt: number; start: [number, number, number] }> = {
  lorenz: {
    f: (x, y, z) => [10 * (y - x), x * (28 - z) - y, x * y - (8 / 3) * z],
    dt: 0.006,
    start: [0.1, 0, 0],
  },
  aizawa: {
    f: (x, y, z) => [
      (z - 0.7) * x - 3.5 * y,
      3.5 * x + (z - 0.7) * y,
      0.6 + 0.95 * z - (z * z * z) / 3 - (x * x + y * y) * (1 + 0.25 * z) + 0.1 * z * x * x * x,
    ],
    dt: 0.01,
    start: [0.1, 0, 0],
  },
  thomas: {
    f: (x, y, z) => [Math.sin(y) - 0.19 * x, Math.sin(z) - 0.19 * y, Math.sin(x) - 0.19 * z],
    dt: 0.05,
    start: [1.1, 1.1, -0.5],
  },
  halvorsen: {
    f: (x, y, z) => [
      -1.4 * x - 4 * y - 4 * z - y * y,
      -1.4 * y - 4 * z - 4 * x - z * z,
      -1.4 * z - 4 * x - 4 * y - x * x,
    ],
    dt: 0.005,
    start: [-5, 0, 0],
  },
  dadras: {
    f: (x, y, z) => [y - 3 * x + 2.7 * y * z, 1.7 * y - x * z + z, 2 * x * y - 9 * z],
    dt: 0.012,
    start: [1.1, 2.1, -2],
  },
}

export function makeAttractor(p: FieldParams): Strand[] {
  const def = ATTRACTORS[p.attractor] ?? ATTRACTORS.lorenz
  const rand = mulberry32(p.seed * 2654435761)
  const steps = Math.min(6000, Math.max(1500, Math.floor(p.nodeCount * 3)))
  const trajectories = p.nodeCount > 600 ? 3 : 1
  const strands: Strand[] = []
  const allForNorm: number[] = []
  const raw: number[][] = []

  for (let tr = 0; tr < trajectories; tr++) {
    let [x, y, z] = def.start
    x += (rand() - 0.5) * 0.4
    y += (rand() - 0.5) * 0.4
    const pts: number[] = []
    for (let i = 0; i < steps + 300; i++) {
      const [dx, dy, dz] = def.f(x, y, z)
      x += dx * def.dt
      y += dy * def.dt
      z += dz * def.dt
      if (i > 300) {
        pts.push(x, y, z)
        allForNorm.push(x, y, z)
      }
    }
    raw.push(pts)
  }
  // normalize every trajectory together so they share one frame
  normalize(allForNorm, p.radius, 1.5)
  let cursor = 0
  for (let tr = 0; tr < raw.length; tr++) {
    const k = raw[tr].length / 3
    const pts: number[] = []
    const tEach: number[] = []
    for (let j = 0; j < k; j++) {
      pts.push(allForNorm[cursor], allForNorm[cursor + 1], allForNorm[cursor + 2])
      tEach.push((j / (k - 1)) * 0.85 + tr * 0.07)
      cursor += 3
    }
    strands.push({ pts, tEach, t: 0.5, accent: 0, seed: rand(), closed: false, dot: 'sparse' })
  }
  return strands
}

// Vortex dipole: two counter-rotating spiral arms (180-degree symmetric) sweeping
// out of a central pinch — the blue/red split is colour-by-arm. Each fibre is a
// logarithmic spiral; a fan of them per arm gives the swept lobe.
export function makeVortex(p: FieldParams): Strand[] {
  const rand = mulberry32(p.seed * 2654435761)
  const perArm = Math.min(180, Math.max(45, Math.floor(p.nodeCount / 4)))
  const steps = 84
  const curl = 0.9 + p.curl * 1.1 // base spiral bend; the curl slider tightens it
  const fan = 1.7 // angular spread of each arm's fan (radians)
  const reach = p.radius * 1.6

  const strands: Strand[] = []
  const allForNorm: number[] = []
  const meta: { k: number; arm: number; u: number }[] = []

  for (let arm = 0; arm < 2; arm++) {
    const armAng = arm * Math.PI + Math.PI * 0.5 // up / down spine
    for (let j = 0; j < perArm; j++) {
      const u = perArm > 1 ? j / (perArm - 1) : 0.5
      const off = (u - 0.5) * fan + (rand() - 0.5) * 0.06 // fibre's offset across the fan
      const wind = curl * (0.25 + u * 0.9) * (0.94 + rand() * 0.12) // inner ~straight, outer curl -> comma
      const len = reach * (0.45 + 0.55 * Math.sin(u * Math.PI)) * (0.88 + rand() * 0.24) // lobed tips
      const rPhase = rand() * 0.05 // stagger start radius so fibres don't band into arcs
      const jit = (rand() - 0.5) * 0.04
      let k = 0
      for (let s = 0; s < steps; s++) {
        const t = s / (steps - 1)
        // a ray out of the pinch that bends one way (all curl same sign -> comma swirl)
        const ang = armAng + off + Math.pow(t, 1.25) * wind + jit
        const r = (0.04 + rPhase) * reach + Math.pow(t, 1.18) * len
        const x = Math.cos(ang) * r
        const y = Math.sin(ang) * r
        const z = (rand() - 0.5) * 0.08 // keep it near-planar like the reference
        allForNorm.push(x, y, z)
        k++
      }
      meta.push({ k, arm, u })
    }
  }
  normalize(allForNorm, p.radius, 1.5)

  let cursor = 0
  for (const m of meta) {
    const pts: number[] = []
    const tEach: number[] = []
    // arm 0 -> cool (blue), arm 1 -> warm (red); slight gradient along the fibre
    const base = m.arm === 0 ? 0.72 : 0.05
    for (let j = 0; j < m.k; j++) {
      pts.push(allForNorm[cursor], allForNorm[cursor + 1], allForNorm[cursor + 2])
      tEach.push(base + (m.k > 1 ? (j / (m.k - 1)) * 0.16 : 0))
      cursor += 3
    }
    strands.push({ pts, tEach, t: 0.5, accent: 0, seed: rand(), closed: false, dot: 'sparse' })
  }
  return strands
}

// A parametric surface drawn as a wireframe: a grid of u-lines (constant v) and
// v-lines (constant u). One generic builder takes a surface function f(u,v) and a
// fixed grid resolution derived from nodeCount, so any two surfaces at the same
// nodeCount emit identical count / segCount / point ordering — that's what lets
// catenoid ↔ helicoid (and any same-family pair) morph cleanly.
type SurfaceFn = (u: number, v: number) => [number, number, number]

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x))
}

function buildSurface(
  p: FieldParams,
  f: SurfaceFn,
  uRange: [number, number],
  vRange: [number, number],
  uClosed: boolean,
): Strand[] {
  const rand = mulberry32(p.seed * 2654435761)
  // FIXED resolution from nodeCount so every surface lines up for morphing
  const uSteps = clamp(Math.round(p.nodeCount / 14), 36, 64)
  const vSteps = Math.round(uSteps * 0.6)
  const [u0, u1] = uRange
  const [v0, v1] = vRange
  // u samples: when closed we still sample uSteps distinct points and rely on the
  // strand's `closed` flag to add the wrap segment (no duplicated endpoint).
  const uN = uSteps
  const vN = vSteps

  const allForNorm: number[] = []
  // collect raw points in a deterministic order: u-lines first, then v-lines
  type Line = { pts: number[]; closed: boolean; vGrad: number[] }
  const lines: Line[] = []

  // u-lines: one per v row, varying u. Every u-line emits uN+1 points and stays
  // closed:false so point/segment counts are IDENTICAL whether u wraps or not — a
  // closed surface duplicates its first sample (a real closing segment), an open
  // one duplicates its last sample (a degenerate zero-length final segment). This
  // parity is what makes catenoid (closed u) ↔ helicoid (open u) morph line up.
  for (let r = 0; r < vN; r++) {
    const v = v0 + (vN > 1 ? r / (vN - 1) : 0.5) * (v1 - v0)
    const vt = vN > 1 ? r / (vN - 1) : 0.5
    const pts: number[] = []
    const vGrad: number[] = []
    let firstX = 0
    let firstY = 0
    let firstZ = 0
    let lastX = 0
    let lastY = 0
    let lastZ = 0
    for (let c = 0; c < uN; c++) {
      const uu = uClosed ? u0 + (c / uN) * (u1 - u0) : u0 + (c / Math.max(1, uN - 1)) * (u1 - u0)
      const [x, y, z] = f(uu, v)
      if (c === 0) {
        firstX = x
        firstY = y
        firstZ = z
      }
      lastX = x
      lastY = y
      lastZ = z
      pts.push(x, y, z)
      allForNorm.push(x, y, z)
      vGrad.push(vt)
    }
    // wrap point: first sample (closed) or last sample (open, degenerate)
    const wx = uClosed ? firstX : lastX
    const wy = uClosed ? firstY : lastY
    const wz = uClosed ? firstZ : lastZ
    pts.push(wx, wy, wz)
    allForNorm.push(wx, wy, wz)
    vGrad.push(vt)
    lines.push({ pts, closed: false, vGrad })
  }

  // v-lines: one per u column, varying v
  for (let c = 0; c < uN; c++) {
    const u = uClosed ? u0 + (c / uN) * (u1 - u0) : u0 + (c / Math.max(1, uN - 1)) * (u1 - u0)
    const pts: number[] = []
    const vGrad: number[] = []
    for (let r = 0; r < vN; r++) {
      const v = v0 + (vN > 1 ? r / (vN - 1) : 0.5) * (v1 - v0)
      const vt = vN > 1 ? r / (vN - 1) : 0.5
      const [x, y, z] = f(u, v)
      pts.push(x, y, z)
      allForNorm.push(x, y, z)
      vGrad.push(vt)
    }
    lines.push({ pts, closed: false, vGrad })
  }

  normalize(allForNorm, p.radius, 1.5)

  const strands: Strand[] = []
  let cursor = 0
  for (const ln of lines) {
    const k = ln.pts.length / 3
    const pts: number[] = []
    for (let j = 0; j < k; j++) {
      pts.push(allForNorm[cursor], allForNorm[cursor + 1], allForNorm[cursor + 2])
      cursor += 3
    }
    strands.push({ pts, tEach: ln.vGrad, t: 0.5, accent: 0, seed: rand(), closed: ln.closed, dot: 'sparse' })
  }
  return strands
}

const TAU = Math.PI * 2

function sech(x: number) {
  return 1 / Math.cosh(x)
}

export function makeSurface(p: FieldParams): Strand[] {
  switch (p.spread) {
    case 'hyperboloid':
      return buildSurface(
        p,
        (u, v) => {
          const r = Math.sqrt(1 + v * v)
          return [r * Math.cos(u), v, r * Math.sin(u)]
        },
        [0, TAU],
        [-1.4, 1.4],
        true,
      )
    case 'wormhole':
      return buildSurface(
        p,
        (u, v) => {
          const r = Math.cosh(v)
          return [r * Math.cos(u), 1.5 * v, r * Math.sin(u)]
        },
        [0, TAU],
        [-1.3, 1.3],
        true,
      )
    case 'pseudosphere':
      return buildSurface(
        p,
        (u, v) => [sech(v) * Math.cos(u), sech(v) * Math.sin(u), v - Math.tanh(v)],
        [0, TAU],
        [0, 3],
        true,
      )
    case 'horn':
      return buildSurface(
        p,
        (u, x) => {
          const rad = 1 / x
          return [x - 4, rad * Math.cos(u), rad * Math.sin(u)]
        },
        [0, TAU],
        [1, 7],
        true,
      )
    case 'wavegrid': {
      const rng = mulberry32(p.seed * 1013904223)
      const phi = rng() * TAU
      return buildSurface(
        p,
        (s, t) => {
          const z = 0.6 * Math.sin(2.5 * s * Math.PI + phi) * Math.cos(1.7 * t * Math.PI) + 0.25 * Math.sin(4 * t * Math.PI)
          return [s * 2.2, z, t * 2.2]
        },
        [-1, 1],
        [-1, 1],
        false,
      )
    }
    case 'catenoid':
      return buildSurface(
        p,
        (u, v) => [Math.cosh(v) * Math.cos(u), v, Math.cosh(v) * Math.sin(u)],
        [0, TAU],
        [-1.2, 1.2],
        true,
      )
    case 'helicoid':
      return buildSurface(
        p,
        (u, v) => [v * Math.cos(u), 0.55 * u, v * Math.sin(u)],
        [0, 2.2 * TAU],
        [-1.4, 1.4],
        false,
      )
    default:
      return buildSurface(
        p,
        (u, v) => {
          const r = Math.sqrt(1 + v * v)
          return [r * Math.cos(u), v, r * Math.sin(u)]
        },
        [0, TAU],
        [-1.4, 1.4],
        true,
      )
  }
}

export function makeKnot(p: FieldParams): Strand[] {
  const rand = mulberry32(p.seed * 2654435761)
  const pp = Math.max(1, Math.round(p.knotP))
  const qq = Math.max(1, Math.round(p.knotQ))
  const steps = Math.min(2600, Math.max(500, Math.floor(p.nodeCount * 2)))
  const pts: number[] = []
  const tEach: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2
    const r = Math.cos(qq * t) + 2.2
    pts.push(r * Math.cos(pp * t), r * Math.sin(pp * t), -Math.sin(qq * t))
    tEach.push(i / steps)
  }
  normalize(pts, p.radius, 1.35)
  return [{ pts, tEach, t: 0.5, accent: 0, seed: rand(), closed: true, dot: 'sparse' }]
}
