import type { ColorMode } from '../lib/color'
import type { AttractorType, SpreadMode, WaveForm } from '../lib/geometry'

// The data "inputs" riding the field: decimal, binary, hex, ascii glyphs, or a mix.
export type NumberFormat = 'decimal' | 'binary' | 'hex' | 'ascii' | 'mixed'

// What the telemetry numbers actually report.
export type DataMode = 'magnitude' | 'index' | 'parameter' | 'radius'

// Export framing for social / web (aspect ratio of the render).
export type FrameMode = 'free' | 'square' | 'portrait' | 'story' | 'landscape' | 'og'

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
  attractor: AttractorType
  knotP: number
  knotQ: number
  superM: number
  superN1: number
  superN2: number

  // Style (cheap — uniforms)
  colorMode: ColorMode
  accent: string
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
  orbitSpeed: number
  pulseSpeed: number
  phase: number
  drawIn: boolean

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
  'attractor',
  'knotP',
  'knotQ',
  'superM',
  'superN1',
  'superN2',
]

// Keys that only rebuild the cheap color LUT texture (instant, no geometry rebuild).
export const LUT_KEYS: (keyof Params)[] = ['colorMode', 'accent']
