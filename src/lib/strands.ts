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

export function makeHopf(p: FieldParams): Strand[] {
  const rand = mulberry32(p.seed * 2654435761)
  const fibers = Math.min(90, Math.max(16, Math.round(p.nodeCount / 11)))
  const fiberSteps = 96
  const strands: Strand[] = []
  const all: number[] = []
  const perFiber: number[][] = []
  for (let i = 0; i < fibers; i++) {
    const yb = 1 - (2 * i) / Math.max(1, fibers - 1)
    const theta = Math.acos(Math.max(-1, Math.min(1, yb)))
    const phi = GA * i
    const a = Math.cos(theta / 2)
    const b = Math.sin(theta / 2)
    const pts: number[] = []
    for (let s = 0; s <= fiberSteps; s++) {
      const psi = (s / fiberSteps) * Math.PI * 2
      const w = a * Math.cos(psi)
      const x = a * Math.sin(psi)
      const yy = b * Math.cos(phi + psi)
      const zz = b * Math.sin(phi + psi)
      const denom = Math.max(0.18, 1 - w) // clamp the stereographic blowup near the pole
      let px = x / denom
      let py = yy / denom
      let pz = zz / denom
      // cap each point so a near-pole fiber can't spike out and dominate the framing
      const mag = Math.hypot(px, py, pz)
      const cap = 6
      if (mag > cap) {
        const k = cap / mag
        px *= k
        py *= k
        pz *= k
      }
      pts.push(px, py, pz)
      all.push(px, py, pz)
    }
    perFiber.push(pts)
  }
  normalize(all, p.radius, 1.5)
  let cursor = 0
  for (let i = 0; i < perFiber.length; i++) {
    const k = perFiber[i].length / 3
    const pts: number[] = []
    for (let j = 0; j < k; j++) {
      pts.push(all[cursor], all[cursor + 1], all[cursor + 2])
      cursor += 3
    }
    strands.push({ pts, t: i / (fibers - 1), accent: 0, seed: rand(), closed: false, dot: 'none' })
  }
  return strands
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

export function makeGolden(p: FieldParams): Strand[] {
  // logarithmic golden spiral: radius multiplies by PHI every quarter turn
  const rand = mulberry32(p.seed * 2654435761)
  const b = Math.log(PHI) / (Math.PI / 2)
  const arms = 3
  const turns = 4
  const T = turns * Math.PI * 2
  const stepsPerArm = Math.min(900, Math.max(220, Math.floor(p.nodeCount / arms)))
  const scale = (p.radius * 1.35) / Math.exp(b * T)
  const strands: Strand[] = []
  for (let arm = 0; arm < arms; arm++) {
    const rot = (arm / arms) * Math.PI * 2
    const pts: number[] = []
    const tEach: number[] = []
    for (let i = 0; i <= stepsPerArm; i++) {
      const th = (i / stepsPerArm) * T
      const r = scale * Math.exp(b * th)
      pts.push(r * Math.cos(th + rot), r * Math.sin(th + rot), 0)
      tEach.push(i / stepsPerArm)
    }
    strands.push({ pts, tEach, t: arm / arms, accent: 0, seed: rand(), closed: false, dot: 'sparse' })
  }
  return strands
}
