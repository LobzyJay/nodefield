import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import type { FieldData } from '../lib/geometry'
import { useStore } from '../store/store'
import type { NumberFormat } from '../store/types'
import { FOCUS_GREEN } from '../lib/color'
import { mulberry32 } from '../lib/rng'

const MONO = '/fonts/JetBrainsMono-Regular.ttf'
const MAX_LABELS = 120

interface Label {
  x: number
  y: number
  z: number
  base: number
  sizeMul: number
  opacity: number
  choice: number // 0 decimal / 1 binary / 2 hex (used by 'mixed')
}

// printable-ASCII "code" glyphs for the ascii input mode
const ASCII_GLYPHS = '!#$%&*+=<>?/\\|~^@ABCDEFXYZ0123456789'

// The "input" riding the field — decimal, binary, hex or ascii glyphs.
function formatValue(v: number, decimals: number, format: NumberFormat, choice: number): string {
  const f = format === 'mixed' ? (['decimal', 'binary', 'hex', 'ascii'] as const)[choice] : format
  const n = Math.max(0, Math.round(Math.abs(v)))
  if (f === 'binary') return (n & 0xff).toString(2).padStart(8, '0')
  if (f === 'hex') return '0x' + (n & 0xff).toString(16).toUpperCase().padStart(2, '0')
  if (f === 'ascii') {
    let s = ''
    for (let k = 0; k < 4; k++) {
      let h = ((n + 1) * (k * 167 + 89) + k * 977) >>> 0
      h = (h ^ (h >> 5)) >>> 0
      s += ASCII_GLYPHS[h % ASCII_GLYPHS.length]
    }
    return s
  }
  return v.toFixed(decimals)
}

// Depth-tiered selection: most numbers small + faint in the background, a few large
// + bright in the foreground — the layered "live data" feel of the references.
function selectLabels(field: FieldData, density: number): Label[] {
  const target = Math.min(MAX_LABELS, Math.max(0, Math.floor(field.count * density)))
  if (target <= 0) return []
  const step = field.count / target
  const rng = mulberry32(424242)
  const out: Label[] = []
  for (let i = 0; i < target; i++) {
    const idx = Math.min(field.count - 1, Math.round(i * step))
    const t = rng()
    let sizeMul: number
    let opacity: number
    if (t < 0.64) {
      sizeMul = 0.66 + rng() * 0.16
      opacity = 0.38 + rng() * 0.16
    } else if (t < 0.95) {
      sizeMul = 0.9 + rng() * 0.16
      opacity = 0.6 + rng() * 0.16
    } else {
      sizeMul = 1.18 + rng() * 0.3
      opacity = 0.9 + rng() * 0.1
    }
    out.push({
      x: field.nodePos[idx * 3] * 1.1,
      y: field.nodePos[idx * 3 + 1] * 1.1,
      z: field.nodePos[idx * 3 + 2] * 1.1,
      base: field.nodeMag[idx],
      sizeMul,
      opacity,
      choice: Math.floor(rng() * 4),
    })
  }
  return out
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

export function Telemetry({ field, radius }: { field: FieldData; radius: number }) {
  const numbersOn = useStore((s) => s.numbersOn)
  const numberFormat = useStore((s) => s.numberFormat)
  const density = useStore((s) => s.density)
  const decimals = useStore((s) => s.decimals)
  const flicker = useStore((s) => s.flicker)
  const focusOn = useStore((s) => s.focusOn)

  const labels = useMemo(() => selectLabels(field, density), [field, density])
  const refs = useRef<(any | null)[]>([])
  const focusRef = useRef<any>(null)
  const acc = useRef(0)
  const rng = useMemo(() => mulberry32(98765), [field])

  const baseSize = radius * 0.037
  const focusSize = radius * 0.072

  // snapshot of the live labels (text + position) for the SVG exporter
  const exportLabels = useMemo<ExportLabel[]>(
    () =>
      labels.map((l) => ({
        x: l.x,
        y: l.y,
        z: l.z,
        text: formatValue(l.base, decimals, numberFormat, l.choice),
        size: baseSize * l.sizeMul,
        opacity: l.opacity,
        color: '#f4f7fb',
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [labels, numberFormat, decimals],
  )
  ;(window as unknown as { nfLabels: ExportLabel[] }).nfLabels = numbersOn ? exportLabels : []

  useFrame((_, dt) => {
    if (!numbersOn) return
    acc.current += dt
    const interval = 1 / Math.max(0.5, flicker)
    if (acc.current < interval) return
    acc.current = 0
    const amp = Math.pow(10, -decimals) * 60
    for (let i = 0; i < labels.length; i++) {
      const t = refs.current[i]
      if (!t) continue
      const v = labels[i].base + (rng() - 0.5) * amp
      const text = formatValue(v, decimals, numberFormat, labels[i].choice)
      t.text = text
      if (exportLabels[i]) exportLabels[i].text = text
      t.sync?.()
    }
    if (focusRef.current) {
      const fv = 1 + (rng() - 0.5) * 1.4
      focusRef.current.text = Math.abs(fv).toFixed(3)
      focusRef.current.sync?.()
    }
  })

  if (!numbersOn) return null

  return (
    <group renderOrder={4}>
      {labels.map((l, i) => (
        <Billboard key={i} position={[l.x, l.y, l.z]}>
          <Text
            ref={(r) => (refs.current[i] = r)}
            font={MONO}
            fontSize={baseSize * l.sizeMul}
            color="#f4f7fb"
            fillOpacity={l.opacity}
            anchorX="center"
            anchorY="middle"
            letterSpacing={-0.02}
            outlineWidth="3%"
            outlineBlur="34%"
            outlineColor="#06070A"
            outlineOpacity={0.55}
            depthOffset={-2}
          >
            {formatValue(l.base, decimals, numberFormat, l.choice)}
          </Text>
        </Billboard>
      ))}
      {focusOn && labels.length > 0 && (
        <Billboard position={[radius * 0.4, -radius * 0.06, radius * 0.5]}>
          <Text
            ref={focusRef}
            font={MONO}
            fontSize={focusSize}
            color={FOCUS_GREEN}
            anchorX="center"
            anchorY="middle"
            letterSpacing={-0.02}
            outlineWidth="3%"
            outlineBlur="40%"
            outlineColor="#03140B"
            outlineOpacity={0.6}
            depthOffset={-2}
          >
            1.000
          </Text>
        </Billboard>
      )}
    </group>
  )
}
