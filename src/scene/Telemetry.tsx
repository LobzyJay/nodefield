import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import type { FieldData } from '../lib/geometry'
import { useStore } from '../store/store'
import type { DataMode, NumberFormat } from '../store/types'
import { FOCUS_GREEN } from '../lib/color'
import { mulberry32 } from '../lib/rng'
import monoFontUrl from '../fonts/JetBrainsMono-Regular.ttf?url'

// Bundled + base-aware so it resolves on any deploy base (e.g. GitHub Pages '/nodefield/')
const MONO = monoFontUrl
const INK = '#f4f7fb'
const MAX_LABELS = 120

interface Label {
  x: number
  y: number
  z: number
  xB: number // morph-target position (same node on the shape we flow toward)
  yB: number
  zB: number
  base: number
  sizeMul: number
  opacity: number
  choice: number
  special: boolean // index is a Fibonacci number -> tinted
}

const ASCII_GLYPHS = '!#$%&*+=<>?/\\|~^@ABCDEFXYZ0123456789'

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

// what the number actually reports
function valueFor(field: FieldData, idx: number, mode: DataMode): number {
  if (mode === 'index') return idx
  if (mode === 'parameter') return field.nodeParam[idx] * 100
  if (mode === 'radius') {
    const o = idx * 3
    return (Math.hypot(field.nodePos[o], field.nodePos[o + 1], field.nodePos[o + 2]) / field.radius) * 100
  }
  return field.nodeMag[idx]
}

function fibSet(max: number): Set<number> {
  const s = new Set<number>([0, 1, 2])
  let a = 1
  let b = 2
  while (a <= max) {
    s.add(a)
    const c = a + b
    a = b
    b = c
  }
  return s
}

function selectLabels(field: FieldData, density: number, mode: DataMode): Label[] {
  const target = Math.min(MAX_LABELS, Math.max(0, Math.floor(field.count * density)))
  if (target <= 0) return []
  const step = field.count / target
  const rng = mulberry32(424242)
  const fib = fibSet(field.count)
  const out: Label[] = []
  const posB = field.nodePosB
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
    const x = field.nodePos[idx * 3] * 1.1
    const y = field.nodePos[idx * 3 + 1] * 1.1
    const z = field.nodePos[idx * 3 + 2] * 1.1
    out.push({
      x,
      y,
      z,
      xB: posB ? posB[idx * 3] * 1.1 : x,
      yB: posB ? posB[idx * 3 + 1] * 1.1 : y,
      zB: posB ? posB[idx * 3 + 2] * 1.1 : z,
      base: valueFor(field, idx, mode),
      sizeMul,
      opacity,
      choice: Math.floor(rng() * 4),
      special: fib.has(idx),
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

export function Telemetry({
  field,
  radius,
  morphValue,
}: {
  field: FieldData
  radius: number
  morphValue: { current: number }
}) {
  const numbersOn = useStore((s) => s.numbersOn)
  const numberFormat = useStore((s) => s.numberFormat)
  const dataMode = useStore((s) => s.dataMode)
  const density = useStore((s) => s.density)
  const decimals = useStore((s) => s.decimals)
  const flicker = useStore((s) => s.flicker)
  const focusOn = useStore((s) => s.focusOn)
  const surface = useStore((s) => s.surface)
  // numbers flip to dark ink on a light surface (with a light halo instead of dark)
  const ink = surface === 'light' ? '#0c0e12' : INK
  const inkOutline = surface === 'light' ? '#f4f5f7' : '#06070A'

  const labels = useMemo(() => selectLabels(field, density, dataMode), [field, density, dataMode])
  const refs = useRef<(any | null)[]>([])
  const bbRefs = useRef<(any | null)[]>([])
  const focusRef = useRef<any>(null)
  const hasMorph = !!field.nodePosB
  // skip the per-frame position pass unless the morph value actually moved;
  // -1 forces one re-apply whenever the label set is rebuilt
  const prevMv = useRef(-1)
  useEffect(() => {
    prevMv.current = -1
  }, [labels])
  const acc = useRef(0)
  const rng = useMemo(() => mulberry32(98765), [field])

  const baseSize = radius * 0.037
  const focusSize = radius * 0.072
  const effDecimals = dataMode === 'index' ? 0 : decimals

  const exportLabels = useMemo<ExportLabel[]>(
    () =>
      labels.map((l) => ({
        x: l.x,
        y: l.y,
        z: l.z,
        text: formatValue(l.base, effDecimals, numberFormat, l.choice),
        size: baseSize * l.sizeMul,
        opacity: l.opacity,
        color: l.special ? FOCUS_GREEN : ink,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [labels, numberFormat, effDecimals, ink],
  )
  ;(window as unknown as { nfLabels: ExportLabel[] }).nfLabels = numbersOn ? exportLabels : []

  useFrame((_, dt) => {
    if (!numbersOn) return
    // numbers ride their nodes along the morph path — only when it's moving
    if (hasMorph && morphValue.current !== prevMv.current) {
      const mv = morphValue.current
      prevMv.current = mv
      for (let i = 0; i < labels.length; i++) {
        const bb = bbRefs.current[i]
        if (!bb) continue
        const l = labels[i]
        bb.position.set(l.x + (l.xB - l.x) * mv, l.y + (l.yB - l.y) * mv, l.z + (l.zB - l.z) * mv)
      }
    }
    acc.current += dt
    const interval = 1 / Math.max(0.5, flicker)
    if (acc.current < interval) return
    acc.current = 0
    const amp = dataMode === 'index' ? 0 : Math.pow(10, -effDecimals) * 60
    for (let i = 0; i < labels.length; i++) {
      const t = refs.current[i]
      if (!t) continue
      const v = labels[i].base + (rng() - 0.5) * amp
      const text = formatValue(v, effDecimals, numberFormat, labels[i].choice)
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
        <Billboard key={i} ref={(r) => (bbRefs.current[i] = r)} position={[l.x, l.y, l.z]}>
          <Text
            ref={(r) => (refs.current[i] = r)}
            font={MONO}
            fontSize={baseSize * l.sizeMul}
            color={l.special ? FOCUS_GREEN : ink}
            fillOpacity={l.opacity}
            anchorX="center"
            anchorY="middle"
            letterSpacing={-0.02}
            outlineWidth="3%"
            outlineBlur="34%"
            outlineColor={inkOutline}
            outlineOpacity={0.55}
            depthOffset={-2}
          >
            {formatValue(l.base, effDecimals, numberFormat, l.choice)}
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
