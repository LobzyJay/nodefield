import { Color, DataTexture, LinearFilter, RGBAFormat, SRGBColorSpace } from 'three'

export type ColorMode = 'spectrum' | 'nature' | 'single'

// Gradient stops per mode. Sampled by t in [0,1] along the fiber index.
// cool-dominant spectrum (Gray Matter): cyan -> blue -> indigo -> violet -> magenta -> pink.
// Red is left to the sparse accent fibers so the additive blend stays cool, as in the reference.
const SPECTRUM_STOPS = ['#15B8FF', '#1E50FF', '#5B3BE0', '#8A2BD0', '#C81E9E', '#FF4D7A']
const NATURE_STOPS = ['#8FA98C', '#C6B79E', '#E9E2D0', '#D98C7A', '#E8702A', '#7B3FE4']

const _a = new Color()
const _b = new Color()

function sampleStops(stops: string[], t: number, out: Color) {
  const clamped = Math.min(0.99999, Math.max(0, t))
  const scaled = clamped * (stops.length - 1)
  const i = Math.floor(scaled)
  const f = scaled - i
  _a.set(stops[i])
  _b.set(stops[Math.min(stops.length - 1, i + 1)])
  out.copy(_a).lerp(_b, f)
  return out
}

// Build a fiber's base color given mode, position-t, and accent color.
export function fiberColor(mode: ColorMode, t: number, accentHex: string, out: Color) {
  if (mode === 'spectrum') return sampleStops(SPECTRUM_STOPS, t, out)
  if (mode === 'nature') return sampleStops(NATURE_STOPS, t, out)
  // single hue: dark -> accent -> bright, driven by t
  const accent = _a.set(accentHex)
  if (t < 0.5) {
    out.copy(accent).multiplyScalar(0.35 + 0.65 * (t * 2))
  } else {
    out.copy(accent).lerp(_b.set('#ffffff'), (t - 0.5) * 0.7)
  }
  return out
}

// Sparse bright accent fibers seen in the reference frames (green / red / white pops).
export const ACCENT_GREEN = '#35E07A'
export const ACCENT_RED = '#FF2E2E'
export const ACCENT_WHITE = '#FFFFFF'

export const FOCUS_GREEN = '#3BE08A'

// Build a 256x1 gradient LUT texture for the given color mode (cheap, no geometry rebuild).
export function buildLUT(mode: ColorMode, accentHex: string): DataTexture {
  const w = 256
  const data = new Uint8Array(w * 4)
  const c = new Color()
  for (let x = 0; x < w; x++) {
    const t = x / (w - 1)
    fiberColor(mode, t, accentHex, c)
    data[x * 4] = Math.round(Math.min(1, c.r) * 255)
    data[x * 4 + 1] = Math.round(Math.min(1, c.g) * 255)
    data[x * 4 + 2] = Math.round(Math.min(1, c.b) * 255)
    data[x * 4 + 3] = 255
  }
  const tex = new DataTexture(data, w, 1, RGBAFormat)
  tex.colorSpace = SRGBColorSpace
  tex.minFilter = LinearFilter
  tex.magFilter = LinearFilter
  tex.needsUpdate = true
  return tex
}
