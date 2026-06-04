// Seeded, reproducible randomness + lightweight value noise for organic offsets.

export function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Deterministic 3D hash -> [0,1)
function hash3(x: number, y: number, z: number) {
  let h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123
  return h - Math.floor(h)
}

function fade(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

// Smooth value noise in 3D, returns [-1, 1].
export function valueNoise(x: number, y: number, z: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const xf = x - xi
  const yf = y - yi
  const zf = z - zi
  const u = fade(xf)
  const v = fade(yf)
  const w = fade(zf)

  const n000 = hash3(xi, yi, zi)
  const n100 = hash3(xi + 1, yi, zi)
  const n010 = hash3(xi, yi + 1, zi)
  const n110 = hash3(xi + 1, yi + 1, zi)
  const n001 = hash3(xi, yi, zi + 1)
  const n101 = hash3(xi + 1, yi, zi + 1)
  const n011 = hash3(xi, yi + 1, zi + 1)
  const n111 = hash3(xi + 1, yi + 1, zi + 1)

  const x00 = lerp(n000, n100, u)
  const x10 = lerp(n010, n110, u)
  const x01 = lerp(n001, n101, u)
  const x11 = lerp(n011, n111, u)
  const y0 = lerp(x00, x10, v)
  const y1 = lerp(x01, x11, v)
  return lerp(y0, y1, w) * 2 - 1
}
