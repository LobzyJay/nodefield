import { Vector3 } from 'three'
import { mulberry32, valueNoise } from './rng'

export type SpreadMode = 'sphere' | 'disc' | 'cascade' | 'helix' | 'mobius' | 'torus' | 'wave'

export type WaveForm = 'curtain' | 'drape' | 'ripple' | 'flag'

export interface FieldParams {
  nodeCount: number
  radius: number
  jitter: number
  curl: number
  spread: SpreadMode
  seed: number
  waveForm: WaveForm
}

export interface FieldData {
  count: number
  segCount: number
  pointsPerFiber: number
  // node / endpoint data
  nodePos: Float32Array // count * 3
  nodeT: Float32Array // count
  nodeAccent: Float32Array // count (0 none, 1 green, 2 red, 3 white)
  nodeMag: Float32Array // count, telemetry base value
  nodeSize: Float32Array // count, relative dot size
  // fiber segment instance data (fat lines)
  segStart: Float32Array // segCount * 3
  segEnd: Float32Array
  segParamStart: Float32Array // segCount
  segParamEnd: Float32Array
  segT: Float32Array // segCount, spectrum t (per fiber)
  segAccent: Float32Array // segCount
  segSeed: Float32Array
  radius: number
}

const GA = Math.PI * (3 - Math.sqrt(5))

function smoothstep01(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Width of the band/tube for the structured shapes (rows across the strip).
const STRIP_ROWS = 6
const TUBE_ROWS = 14

function endpoint(
  spread: SpreadMode,
  i: number,
  n: number,
  radius: number,
  seedPhase: number,
  out: Vector3,
) {
  switch (spread) {
    case 'sphere': {
      const y = 1 - (2 * i) / Math.max(1, n - 1)
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const th = GA * i
      out.set(Math.cos(th) * r, y, Math.sin(th) * r).multiplyScalar(radius)
      break
    }
    case 'disc': {
      // face-on phyllotaxis disc (XY plane): burst reads radially from the front
      const r = Math.sqrt((i + 0.5) / n) * radius
      const th = GA * i
      out.set(Math.cos(th) * r, Math.sin(th) * r, 0)
      break
    }
    case 'cascade': {
      // draping funnel: layered rings spiralling downward, widening as they fall
      const layer = (i + 0.5) / n
      const th = GA * i + layer * Math.PI * 6
      const rr = radius * (0.25 + 0.85 * layer)
      const y = (0.7 - layer * 1.35) * radius
      out.set(Math.cos(th) * rr, y, Math.sin(th) * rr)
      break
    }
    case 'helix': {
      // double helix (DNA): two strands offset by PI, climbing the Y axis
      const tt = (i + 0.5) / n
      const strand = i % 2 === 0 ? 0 : Math.PI
      const ang = tt * 3.2 * Math.PI * 2 + strand
      const rr = radius * 0.5
      const y = (tt - 0.5) * radius * 1.8
      out.set(Math.cos(ang) * rr, y, Math.sin(ang) * rr)
      break
    }
    case 'mobius': {
      // Möbius band: ring in XZ, half-twist carried in Y across the strip width
      const cols = Math.max(1, Math.ceil(n / STRIP_ROWS))
      const col = Math.floor(i / STRIP_ROWS)
      const row = i % STRIP_ROWS
      const u = (col / cols) * Math.PI * 2
      const v = (row / (STRIP_ROWS - 1) - 0.5) * radius * 0.42
      const half = u / 2
      const cv = radius * 0.74 + v * Math.cos(half)
      out.set(cv * Math.cos(u), v * Math.sin(half), cv * Math.sin(u))
      break
    }
    case 'torus': {
      // ring/donut: big circle in XZ, tube around it
      const rings = Math.max(1, Math.ceil(n / TUBE_ROWS))
      const ring = Math.floor(i / TUBE_ROWS)
      const tube = (i % TUBE_ROWS) / TUBE_ROWS
      const u = (ring / rings) * Math.PI * 2
      const vphase = tube * Math.PI * 2
      const R = radius * 0.72
      const r = radius * 0.3
      const cx = R + r * Math.cos(vphase)
      out.set(cx * Math.cos(u), r * Math.sin(vphase), cx * Math.sin(u))
      break
    }
  }
  return out
}

// The wave field uses a different fiber topology: instead of core->node rays,
// each ROW is one flowing ribbon running across the sheet (Windows-bloom feel).
// Seed shifts every wave phase, so each seed is a distinct ripple.
function buildWave(p: FieldParams): FieldData {
  const n = Math.max(4, Math.floor(p.nodeCount))
  // ribbon COUNT scales with nodeCount, but ribbon RESOLUTION is fixed high so the
  // analytic wave is sampled densely enough to read as a smooth curve (no facets) —
  // like subdividing a curve in Blender rather than leaving a coarse polyline.
  const rows = Math.max(3, Math.round(Math.sqrt(n) * 1.15))
  const cols = 72
  const count = rows * cols
  const segCount = rows * (cols - 1)

  const nodePos = new Float32Array(count * 3)
  const nodeT = new Float32Array(count)
  const nodeAccent = new Float32Array(count)
  const nodeMag = new Float32Array(count)
  const nodeSize = new Float32Array(count)

  const segStart = new Float32Array(segCount * 3)
  const segEnd = new Float32Array(segCount * 3)
  const segParamStart = new Float32Array(segCount)
  const segParamEnd = new Float32Array(segCount)
  const segT = new Float32Array(segCount)
  const segAccent = new Float32Array(segCount)
  const segSeed = new Float32Array(segCount)

  const rand = mulberry32(p.seed * 2654435761)
  const seedPhase = (p.seed % 360) * 0.61803 * Math.PI * 2

  const width = p.radius * 2.7
  const height = p.radius * 1.75
  const depthAmp = p.radius * 0.5 * (0.45 + p.curl)
  const yAmp = p.radius * 0.16
  const form = p.waveForm

  const prev = new Vector3()
  const cur = new Vector3()
  let s = 0

  for (let r = 0; r < rows; r++) {
    const vRow = rows > 1 ? r / (rows - 1) : 0.5
    // ribbon color gradients by row (top -> bottom), as in the reference drape
    const ct = Math.min(1, Math.max(0, vRow + (rand() - 0.5) * 0.16))
    const pick = rand()
    let accent = 0
    if (pick < 0.05) accent = 1
    else if (pick < 0.08) accent = 2
    else if (pick < 0.1) accent = 3
    const phaseSeed = rand()
    const rowPhase = vRow * 3.4
    // jitter shifts the WHOLE ribbon (coherent, per-row) — never individual points,
    // so each strand stays a smooth curve instead of a noisy squiggle
    const jr = p.jitter * p.radius * 0.1
    const rjx = (rand() - 0.5) * jr
    const rjy = (rand() - 0.5) * jr * 0.6

    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1)
      let px: number
      let py: number
      let pz: number
      if (form === 'drape') {
        // a folding sheet that sags + narrows + twists into a ribbon as it falls
        const widthFactor = 1 - 0.45 * smoothstep01(0.45, 1.0, vRow)
        const foldFreq = 2 + vRow * 3
        const foldAmp = depthAmp * (0.3 + vRow * 1.15)
        const x0 = (u - 0.5) * width * widthFactor
        const z0 = Math.sin(u * Math.PI * foldFreq + seedPhase + vRow * 6) * foldAmp
        const theta = vRow * vRow * Math.PI * 1.3
        const cth = Math.cos(theta)
        const sth = Math.sin(theta)
        px = x0 * cth - z0 * sth
        pz = x0 * sth + z0 * cth
        const sag = -Math.sin(u * Math.PI) * vRow * p.radius * 0.35
        py =
          (0.5 - vRow) * height * 1.15 +
          sag +
          Math.cos(u * Math.PI * foldFreq * 0.5 + seedPhase) * foldAmp * 0.14
      } else if (form === 'ripple') {
        // concentric pond ripples on a face-on disc
        const ang = u * Math.PI * 2
        const rr = (0.12 + vRow) * p.radius * 1.15
        px = Math.cos(ang) * rr
        py = Math.sin(ang) * rr
        pz =
          (Math.sin(rr * 7 - seedPhase) * 0.6 + Math.sin(rr * 13 + seedPhase) * 0.3) *
          depthAmp *
          (0.35 + vRow * 0.5)
      } else if (form === 'flag') {
        // a banner waving from its left edge; amplitude grows toward the free edge
        const a = 0.15 + u * 0.95
        px = (u - 0.5) * width
        pz = Math.sin(u * Math.PI * 2.6 - seedPhase + vRow * 1.6) * depthAmp * a
        py =
          (0.5 - vRow) * height +
          Math.sin(u * Math.PI * 2.6 - seedPhase + vRow * 1.6) * p.radius * 0.1 * a
      } else {
        // curtain: flat vertical sheet with a gentle depth ripple
        px = (u - 0.5) * width
        py = (0.5 - vRow) * height + Math.sin(u * Math.PI * 2 + seedPhase + rowPhase) * yAmp
        pz =
          (Math.sin(u * Math.PI * 3 + seedPhase + vRow * 4) * 0.6 +
            Math.sin(u * Math.PI * 2 + seedPhase * 1.6 + vRow * 2) * 0.3 +
            valueNoise(u * 2.2 + r * 0.3, seedPhase, vRow * 3) * 0.25) *
          depthAmp
      }
      cur.set(px + rjx, py + rjy, pz)

      const idx = r * cols + c
      nodePos[idx * 3] = cur.x
      nodePos[idx * 3 + 1] = cur.y
      nodePos[idx * 3 + 2] = cur.z
      nodeT[idx] = ct
      nodeAccent[idx] = accent
      nodeMag[idx] = (0.5 + 0.5 * valueNoise(cur.x * 0.6, cur.y * 0.6, cur.z * 0.6 + 5)) * 104
      // dots only at the ribbon ends keep the field clean
      nodeSize[idx] = c === 0 || c === cols - 1 ? 0.8 + rand() * 0.5 : 0

      if (c > 0) {
        const o3 = s * 3
        segStart[o3] = prev.x
        segStart[o3 + 1] = prev.y
        segStart[o3 + 2] = prev.z
        segEnd[o3] = cur.x
        segEnd[o3 + 1] = cur.y
        segEnd[o3 + 2] = cur.z
        segParamStart[s] = (c - 1) / (cols - 1)
        segParamEnd[s] = c / (cols - 1)
        segT[s] = ct
        segAccent[s] = accent
        segSeed[s] = phaseSeed
        s++
      }
      prev.copy(cur)
    }
  }

  return {
    count,
    segCount,
    pointsPerFiber: cols,
    nodePos,
    nodeT,
    nodeAccent,
    nodeMag,
    nodeSize,
    segStart,
    segEnd,
    segParamStart,
    segParamEnd,
    segT,
    segAccent,
    segSeed,
    radius: p.radius,
  }
}

export function buildField(p: FieldParams): FieldData {
  if (p.spread === 'wave') return buildWave(p)

  const n = Math.max(1, Math.floor(p.nodeCount))
  const P = p.curl > 0.001 ? 22 : 2 // points per fiber (dense enough for smooth curls)
  const segPerFiber = P - 1
  const segCount = n * segPerFiber

  const nodePos = new Float32Array(n * 3)
  const nodeT = new Float32Array(n)
  const nodeAccent = new Float32Array(n)
  const nodeMag = new Float32Array(n)
  const nodeSize = new Float32Array(n)

  const segStart = new Float32Array(segCount * 3)
  const segEnd = new Float32Array(segCount * 3)
  const segParamStart = new Float32Array(segCount)
  const segParamEnd = new Float32Array(segCount)
  const segT = new Float32Array(segCount)
  const segAccent = new Float32Array(segCount)
  const segSeed = new Float32Array(segCount)

  const rand = mulberry32(p.seed * 2654435761)
  // seed-driven phase so shapes that read the seed (e.g. wave) vary per seed
  const seedPhase = (p.seed % 360) * 0.61803 * Math.PI * 2

  const end = new Vector3()
  const dir = new Vector3()
  const up = new Vector3()
  const perp1 = new Vector3()
  const perp2 = new Vector3()
  const cur = new Vector3()
  const prev = new Vector3()

  let s = 0
  for (let i = 0; i < n; i++) {
    // spectrum position is randomized per-fiber (decorrelated from the y-axis
    // placement) so colors intermix across the whole burst, as in the reference
    const ct = rand()
    nodeT[i] = ct

    endpoint(p.spread, i, n, p.radius, seedPhase, end)

    // index-seeded jitter (organic, non-lattice)
    end.x += (rand() - 0.5) * 2 * p.jitter * p.radius * 0.16
    end.y += (rand() - 0.5) * 2 * p.jitter * p.radius * 0.16
    end.z += (rand() - 0.5) * 2 * p.jitter * p.radius * 0.16

    nodePos[i * 3] = end.x
    nodePos[i * 3 + 1] = end.y
    nodePos[i * 3 + 2] = end.z

    const noiseV = valueNoise(end.x * 0.6 + 11, end.y * 0.6 - 3, end.z * 0.6 + 7)
    nodeMag[i] = (0.5 + 0.5 * noiseV) * 104 + rand() * 4

    // sparse bright accent fibers (matches reference pops)
    const pick = rand()
    let accent = 0
    if (pick < 0.04) accent = 1
    else if (pick < 0.065) accent = 2
    else if (pick < 0.085) accent = 3
    nodeAccent[i] = accent
    nodeSize[i] = accent ? 1.35 + rand() * 0.6 : 0.55 + rand() * 0.9

    // curl basis perpendicular to the fiber direction
    dir.copy(end).normalize()
    up.set(0, 1, 0)
    if (Math.abs(dir.y) > 0.92) up.set(1, 0, 0)
    perp1.copy(up).cross(dir).normalize()
    perp2.copy(dir).cross(perp1).normalize()

    const a0 = rand() * Math.PI * 2
    const twist = (rand() - 0.5) * 3.0
    const swirl = (0.3 + rand() * 0.7) * p.curl * p.radius * 0.42
    const nf = 1.3 + rand() * 0.8
    const nseed = rand() * 50
    const phaseSeed = rand()

    prev.set(0, 0, 0)
    for (let j = 1; j < P; j++) {
      const f = j / (P - 1)
      const bell = Math.sin(Math.PI * f)
      const a = a0 + f * twist
      cur.copy(end).multiplyScalar(f)
      cur.x += (perp1.x * Math.cos(a) + perp2.x * Math.sin(a)) * swirl * bell
      cur.y += (perp1.y * Math.cos(a) + perp2.y * Math.sin(a)) * swirl * bell
      cur.z += (perp1.z * Math.cos(a) + perp2.z * Math.sin(a)) * swirl * bell
      const wob = p.curl * p.radius * 0.18 * bell
      cur.x += valueNoise(end.x * nf + nseed, end.y * nf, f * 3) * wob
      cur.y += valueNoise(end.y * nf + nseed + 9, end.z * nf, f * 3) * wob
      cur.z += valueNoise(end.z * nf + nseed + 18, end.x * nf, f * 3) * wob

      const o3 = s * 3
      segStart[o3] = prev.x
      segStart[o3 + 1] = prev.y
      segStart[o3 + 2] = prev.z
      segEnd[o3] = cur.x
      segEnd[o3 + 1] = cur.y
      segEnd[o3 + 2] = cur.z
      segParamStart[s] = (j - 1) / (P - 1)
      segParamEnd[s] = j / (P - 1)
      segT[s] = ct
      segAccent[s] = accent
      segSeed[s] = phaseSeed
      prev.copy(cur)
      s++
    }
  }

  return {
    count: n,
    segCount,
    pointsPerFiber: P,
    nodePos,
    nodeT,
    nodeAccent,
    nodeMag,
    nodeSize,
    segStart,
    segEnd,
    segParamStart,
    segParamEnd,
    segT,
    segAccent,
    segSeed,
    radius: p.radius,
  }
}
