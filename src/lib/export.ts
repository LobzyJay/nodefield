import { Camera, Color, Matrix4, Vector3 } from 'three'
import { ColorMode, fiberColor } from './color'
import type { FieldData } from './geometry'

function getCanvas(): HTMLCanvasElement | null {
  return document.querySelector('canvas')
}

function triggerDownload(url: string, filename: string, revoke = false) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  if (revoke) setTimeout(() => URL.revokeObjectURL(url), 4000)
}

// Raster export straight from the WebGL canvas (needs preserveDrawingBuffer).
export function downloadRaster(format: 'png' | 'jpeg', label: string) {
  const canvas = getCanvas()
  if (!canvas) return
  const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
  const url = canvas.toDataURL(mime, 0.95)
  triggerDownload(url, `nodefield-${label}-${canvas.width}x${canvas.height}.${format === 'jpeg' ? 'jpg' : 'png'}`)
}

interface ExportLabel {
  x: number
  y: number
  z: number
  text: string
  size: number
  opacity: number
  color: string
}

interface SceneGlobals {
  nfField?: FieldData
  nfCamera?: Camera
  nfGroup?: { matrixWorld: Matrix4; updateWorldMatrix: (a: boolean, b: boolean) => void }
  nfLabels?: ExportLabel[]
}

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Best-effort VECTOR export: projects the fiber line-art, node dots and the numeric
// labels to 2D and writes a flat SVG. The bloom/glow is raster-only, so this is a
// clean line drawing (great for print / scaling), not a 1:1 copy of the screen.
export function downloadSVG(label: string, colorMode: ColorMode, accent: string) {
  const w = window as unknown as SceneGlobals
  const field = w.nfField
  const cam = w.nfCamera
  const grp = w.nfGroup
  const labels = w.nfLabels ?? []
  const canvas = getCanvas()
  if (!field || !cam || !grp || !canvas) {
    console.warn('[nodefield] SVG export unavailable (scene not ready)')
    return
  }
  const W = canvas.clientWidth || canvas.width
  const H = canvas.clientHeight || canvas.height
  grp.updateWorldMatrix(true, false)
  cam.updateMatrixWorld()

  const v = new Vector3()
  const m = grp.matrixWorld
  const project = (x: number, y: number, z: number): [number, number, number] => {
    v.set(x, y, z).applyMatrix4(m).project(cam)
    return [(v.x * 0.5 + 0.5) * W, (1 - (v.y * 0.5 + 0.5)) * H, v.z]
  }
  const onScreen = (x: number, y: number) => x > -40 && x < W + 40 && y > -40 && y < H + 40

  const col = new Color()
  const fiberHex = (t: number): string => {
    fiberColor(colorMode, t, accent, col)
    return '#' + col.getHexString()
  }

  const lines: string[] = []
  const ss = field.segStart
  const se = field.segEnd
  const stt = field.segT
  const sa = field.segAccent
  for (let i = 0; i < field.segCount; i++) {
    const o = i * 3
    const a = project(ss[o], ss[o + 1], ss[o + 2])
    const b = project(se[o], se[o + 1], se[o + 2])
    if (a[2] > 1 || b[2] > 1) continue
    if (!onScreen(a[0], a[1]) && !onScreen(b[0], b[1])) continue
    const acc = sa[i]
    let color: string
    if (acc > 0.5 && acc < 1.5) color = '#35E07A'
    else if (acc > 1.5 && acc < 2.5) color = '#FF2E2E'
    else if (acc > 2.5) color = '#FFFFFF'
    else color = fiberHex(stt[i])
    lines.push(
      `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${color}"/>`,
    )
  }

  const dots: string[] = []
  const np = field.nodePos
  for (let i = 0; i < field.count; i++) {
    const o = i * 3
    const p = project(np[o], np[o + 1], np[o + 2])
    if (p[2] > 1 || !onScreen(p[0], p[1])) continue
    dots.push(`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="1.6" fill="#ffffff" opacity="0.7"/>`)
  }

  const texts: string[] = []
  for (const l of labels) {
    const p = project(l.x, l.y, l.z)
    if (p[2] > 1 || !onScreen(p[0], p[1])) continue
    const p2 = project(l.x, l.y + l.size, l.z)
    const fontPx = Math.min(120, Math.max(7, Math.abs(p[1] - p2[1])))
    texts.push(
      `<text x="${p[0].toFixed(1)}" y="${(p[1] + fontPx * 0.34).toFixed(1)}" font-family="'JetBrains Mono', monospace" font-size="${fontPx.toFixed(1)}" fill="${l.color}" fill-opacity="${l.opacity.toFixed(2)}" text-anchor="middle">${escapeXml(l.text)}</text>`,
    )
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="100%" height="100%" fill="#06070A"/>` +
    `<g stroke-width="1" stroke-opacity="0.85" stroke-linecap="round">${lines.join('')}</g>` +
    `<g>${dots.join('')}</g>` +
    `<g>${texts.join('')}</g>` +
    `</svg>`

  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  triggerDownload(url, `nodefield-${label}-${W}x${H}.svg`, true)
}
