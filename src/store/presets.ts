import type { Params } from './types'

export const DEFAULT_PARAMS: Params = {
  // Structure
  nodeCount: 480,
  radius: 3.2,
  jitter: 0.35,
  curl: 0.55,
  spread: 'sphere',
  waveForm: 'curtain',
  seed: 1,
  // Math
  divergenceAngle: 137.50776, // degrees (the golden angle)
  attractor: 'lorenz',
  knotP: 3,
  knotQ: 2,
  superM: 7,
  superN1: 0.2,
  superN2: 1.7,
  morphTo: 'off',
  morph: 0,
  // Style
  colorMode: 'spectrum',
  accent: '#FD607B',
  coreOn: false,
  coreSize: 1.0,
  thickness: 1.4,
  glass: 0.7,
  dotSize: 1.0,
  emission: 1.5,
  // FX
  bloomIntensity: 1.4,
  bloomThreshold: 0.18,
  grain: 0.035,
  vignette: 0.55,
  halftone: false,
  atmosphere: 0.7,
  // Data
  numbersOn: true,
  numberFormat: 'decimal',
  dataMode: 'magnitude',
  mathReadout: true,
  density: 0.24,
  decimals: 3,
  flicker: 6,
  focusOn: true,
  // Motion
  orbitSpeed: 0.06,
  pulseSpeed: 0.35,
  phase: 1.0,
  drawIn: true,
  intro: 'grow',
  // Export
  frame: 'free',
}

// Presets are named after the FIELD SHAPE they build.
export type PresetName =
  | 'Nucleus'
  | 'Wave'
  | 'Drape'
  | 'Cascade'
  | 'Helix'
  | 'Möbius'
  | 'Torus'
  | 'Disc'
  | 'Lorenz'
  | 'Superform'
  | 'Knot'

// the two preset families (single source of truth for the bar + the cycle order)
export const SHAPE_PRESETS: PresetName[] = ['Nucleus', 'Wave', 'Drape', 'Cascade', 'Helix', 'Möbius', 'Torus', 'Disc']
export const MATH_PRESETS: PresetName[] = ['Lorenz', 'Superform', 'Knot']
export const PRESET_ORDER: PresetName[] = [...SHAPE_PRESETS, ...MATH_PRESETS]

export const PRESETS: Record<PresetName, Partial<Params>> = {
  // sphere burst, cool spectrum — the hero (recreates the Gray Matter frames)
  Nucleus: {
    spread: 'sphere',
    colorMode: 'spectrum',
    accent: '#FD607B',
    nodeCount: 480,
    radius: 3.2,
    jitter: 0.35,
    curl: 0.55,
    thickness: 1.4,
    bloomIntensity: 1.4,
    bloomThreshold: 0.18,
    halftone: false,
    emission: 1.5,
    density: 0.24,
    decimals: 3,
  },
  // wavy curtain of glowing strands (Windows-bloom feel); seed reshapes the ripple
  Wave: {
    spread: 'wave',
    waveForm: 'curtain',
    colorMode: 'spectrum',
    accent: '#4C7CFF',
    nodeCount: 820,
    radius: 3.0,
    jitter: 0.22,
    curl: 0.4,
    coreOn: false,
    thickness: 3.4,
    bloomIntensity: 1.4,
    bloomThreshold: 0.08,
    halftone: false,
    emission: 2.5,
    density: 0.14,
    decimals: 3,
    pulseSpeed: 0.5,
    orbitSpeed: 0.0,
  },
  // a folding, cascading sheet that drapes + twists into a ribbon (the reference)
  Drape: {
    spread: 'wave',
    waveForm: 'drape',
    colorMode: 'spectrum',
    accent: '#4C7CFF',
    nodeCount: 1000,
    radius: 3.1,
    jitter: 0.16,
    curl: 0.5,
    coreOn: false,
    thickness: 3.0,
    bloomIntensity: 1.35,
    bloomThreshold: 0.09,
    halftone: false,
    emission: 2.35,
    density: 0.16,
    decimals: 3,
    pulseSpeed: 0.4,
    orbitSpeed: 0.012,
  },
  // draping funnel cascade (recreates the waterfall reference frame)
  Cascade: {
    spread: 'cascade',
    colorMode: 'spectrum',
    accent: '#FF5C7A',
    nodeCount: 540,
    radius: 3.0,
    jitter: 0.3,
    curl: 0.55,
    thickness: 1.4,
    bloomIntensity: 1.3,
    bloomThreshold: 0.18,
    halftone: false,
    emission: 1.5,
    density: 0.24,
    decimals: 3,
    pulseSpeed: 0.4,
  },
  // double helix (DNA)
  Helix: {
    spread: 'helix',
    colorMode: 'spectrum',
    accent: '#35E0C8',
    nodeCount: 440,
    radius: 3.0,
    jitter: 0.22,
    curl: 0.22,
    thickness: 1.4,
    bloomIntensity: 1.3,
    bloomThreshold: 0.18,
    halftone: false,
    emission: 1.5,
    density: 0.2,
    decimals: 3,
    pulseSpeed: 0.45,
  },
  // Möbius band, violet single-hue
  Möbius: {
    spread: 'mobius',
    colorMode: 'single',
    accent: '#7B3FE4',
    nodeCount: 480,
    radius: 3.1,
    jitter: 0.2,
    curl: 0.28,
    thickness: 1.5,
    bloomIntensity: 1.45,
    bloomThreshold: 0.17,
    halftone: false,
    emission: 1.55,
    density: 0.2,
    decimals: 3,
  },
  // ring / donut, crimson single-hue (the FORM look)
  Torus: {
    spread: 'torus',
    colorMode: 'single',
    accent: '#E1101A',
    nodeCount: 540,
    radius: 3.1,
    jitter: 0.2,
    curl: 0.3,
    thickness: 1.5,
    bloomIntensity: 1.55,
    bloomThreshold: 0.16,
    halftone: false,
    emission: 1.65,
    density: 0.18,
    decimals: 3,
  },
  // phyllotaxis disc, nature/orange with halftone
  Disc: {
    spread: 'disc',
    colorMode: 'nature',
    accent: '#E8702A',
    nodeCount: 360,
    radius: 3.4,
    jitter: 0.4,
    curl: 0.32,
    coreSize: 1.35,
    bloomIntensity: 1.05,
    bloomThreshold: 0.28,
    halftone: true,
    grain: 0.03,
    vignette: 0.62,
    emission: 1.45,
    density: 0.22,
    decimals: 2,
    pulseSpeed: 0.25,
  },
  // strange attractor (Lorenz) — a glowing trajectory
  Lorenz: {
    spread: 'attractor',
    attractor: 'lorenz',
    colorMode: 'spectrum',
    accent: '#35E0C8',
    nodeCount: 1200,
    radius: 3.2,
    thickness: 1.7,
    glass: 0.5,
    bloomIntensity: 1.35,
    bloomThreshold: 0.12,
    emission: 1.7,
    density: 0.1,
    dataMode: 'parameter',
    decimals: 3,
    pulseSpeed: 0.6,
    orbitSpeed: 0.05,
  },
  // Gielis supershape
  Superform: {
    spread: 'superformula',
    superM: 7,
    superN1: 0.2,
    superN2: 1.7,
    colorMode: 'spectrum',
    accent: '#FF5C7A',
    nodeCount: 520,
    radius: 3.2,
    jitter: 0,
    curl: 0,
    thickness: 1.5,
    bloomIntensity: 1.4,
    bloomThreshold: 0.16,
    emission: 1.6,
    density: 0.2,
    decimals: 3,
  },
  // torus knot (p, q)
  Knot: {
    spread: 'knot',
    knotP: 3,
    knotQ: 2,
    colorMode: 'spectrum',
    accent: '#7B3FE4',
    nodeCount: 900,
    radius: 3.2,
    thickness: 2.2,
    glass: 0.7,
    bloomIntensity: 1.4,
    bloomThreshold: 0.14,
    emission: 1.6,
    density: 0.12,
    dataMode: 'parameter',
    decimals: 3,
    orbitSpeed: 0.06,
  },
}
