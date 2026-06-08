import type { ColorMode } from '../lib/color'
import type { AttractorType, MorphTarget, SpreadMode, WaveForm } from '../lib/geometry'

// The data "inputs" riding the field: decimal, binary, hex, ascii glyphs, or a mix.
export type NumberFormat = 'decimal' | 'binary' | 'hex' | 'ascii' | 'mixed'

// What the telemetry numbers actually report.
export type DataMode = 'magnitude' | 'index' | 'parameter' | 'radius'

// Export framing for social / web (aspect ratio of the render).
export type FrameMode = 'free' | 'square' | 'portrait' | 'story' | 'landscape' | 'og'

// How a preset enters: grow it in from the core, or morph from the current shape.
export type IntroMode = 'grow' | 'morph'

// How the gradient maps onto the field (where along the gradient each point samples).
export type GradMap = 'fiber' | 'radial' | 'linear' | 'angle'

// The backdrop the field is composited onto — flips the blend mode (additive ↔ ink).
export type SurfaceMode = 'dark' | 'light' | 'custom'

export interface Params {
  // Structure (expensive — rebuilds geometry)
  nodeCount: number
  radius: number
  jitter: number
  curl: number
  spread: SpreadMode
  waveForm: WaveForm
  seed: number
  // Math (expensive — rebuild geometry)
  divergenceAngle: number // degrees in the UI, radians in the field; phyllotaxis angle
  waveFreq: number // wave: fold/ripple density multiplier
  waveTwist: number // wave: spiral-into-ribbon twist (0 = flat sheet)
  fanSpread: number // fan: angular span in degrees (180 = full half-fan)
  fanFraming: number // fan: 0 = round radial scatter, 1 = wide hero-box dome
  attractor: AttractorType
  knotP: number
  knotQ: number
  superM: number
  superN1: number
  superN2: number
  morphTo: MorphTarget // a radial shape to flow toward, or 'off' (structural)
  morph: number // 0..1 morph amount (cheap GPU uniform)

  // Style (cheap — uniforms)
  colorMode: ColorMode
  accent: string
  // custom gradient: up to 5 colour slots (each with alpha), evenly spaced by gradCount
  gradCount: number
  grad1: string
  grad2: string
  grad3: string
  grad4: string
  grad5: string
  grad1A: number
  grad2A: number
  grad3A: number
  grad4A: number
  grad5A: number
  gradMap: GradMap // how the gradient maps onto the field
  surface: SurfaceMode // backdrop the field is shown on (also flips blend mode)
  surfaceColor: string // custom backdrop hex (when surface === 'custom')
  coreOn: boolean
  coreSize: number
  thickness: number
  glass: number // glass-like specular sheen on thick strands
  dotSize: number
  emission: number

  // FX (cheap)
  bloomIntensity: number
  bloomThreshold: number
  grain: number
  vignette: number
  halftone: boolean
  atmosphere: number // depth haze: fades the field into the black for 3D depth

  // Data (cheap) — the numeric "inputs" riding the field
  numbersOn: boolean
  numberFormat: NumberFormat
  dataMode: DataMode
  mathReadout: boolean
  density: number
  decimals: number
  flicker: number
  focusOn: boolean

  // Motion (cheap)
  fanAnchor: number // fan: 0 = float low-centre, 1 = pin apex to the bottom edge
  tipAttract: boolean // fan: cursor pulls tips toward it (true) vs pushes away (false)
  orbitSpeed: number
  pulseSpeed: number
  phase: number
  drawIn: boolean
  intro: IntroMode // preset entrance: grow-in vs morph from current shape

  // Export (cheap)
  frame: FrameMode
}

// Keys that rebuild the instanced geometry (debounced ~80ms).
export const STRUCTURE_KEYS: (keyof Params)[] = [
  'nodeCount',
  'radius',
  'jitter',
  'curl',
  'spread',
  'waveForm',
  'seed',
  'divergenceAngle',
  'waveFreq',
  'waveTwist',
  'fanSpread',
  'fanFraming',
  'attractor',
  'knotP',
  'knotQ',
  'superM',
  'superN1',
  'superN2',
  'morphTo',
]

// Keys that only rebuild the cheap color LUT texture (instant, no geometry rebuild).
export const LUT_KEYS: (keyof Params)[] = [
  'colorMode',
  'accent',
  'gradCount',
  'grad1',
  'grad2',
  'grad3',
  'grad4',
  'grad5',
  'grad1A',
  'grad2A',
  'grad3A',
  'grad4A',
  'grad5A',
]
