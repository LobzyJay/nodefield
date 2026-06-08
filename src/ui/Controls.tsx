import { useEffect } from 'react'
import { button, folder, useControls } from 'leva'
import { useStore } from '../store/store'
import { DEFAULT_PARAMS } from '../store/presets'
import { RADIAL } from '../lib/geometry'
import type { Params } from '../store/types'
import { downloadRaster, downloadSVG } from '../lib/export'

// contextual disclosure: which shapes a param applies to
const PHYLLO_SHAPES = ['sphere', 'disc', 'cascade', 'superformula']
const sp = (get: (p: string) => unknown) => get('Main.spread') as string
const cm = (get: (p: string) => unknown) => get('Main.colorMode') as string
const sf = (get: (p: string) => unknown) => get('Style.surface') as string

// filename slug from the current look
function slug() {
  const s = useStore.getState()
  const p = s.activePreset === 'Custom' ? 'custom' : s.activePreset
  return `${p}-${s.spread}`.toLowerCase().replace(/[^a-z0-9-]/g, '')
}

// While we programmatically push values back into Leva, its onChange handlers
// fire — suppress those so they don't flip the preset to "Custom". Refcounted so
// overlapping windows (preset sync + morphTo mirror) compose instead of one
// timer clearing another's guard early.
let suppressDepth = 0
function suppressWindow(ms: number): () => void {
  suppressDepth++
  let released = false
  const release = () => {
    if (released) return
    released = true
    suppressDepth = Math.max(0, suppressDepth - 1)
  }
  const id = setTimeout(release, ms)
  return () => {
    clearTimeout(id)
    release()
  }
}

// Build an onChange handler that writes to the store only on real user changes.
function mk<K extends keyof Params>(key: K) {
  return (value: Params[K]) => {
    if (suppressDepth > 0) return
    const st = useStore.getState()
    if (st[key] !== value) st.set(key, value)
  }
}

// Mirror the full store into Leva (suppressed so the echo onChanges don't flip to
// "Custom"). Shared by the preset-apply sync and the randomize/programmatic sync.
function pushStoreToLeva(set: (o: Record<string, unknown>) => void): () => void {
  const s = useStore.getState()
  const end = suppressWindow(150)
  set({
    nodeCount: s.nodeCount,
    radius: s.radius,
    jitter: s.jitter,
    curl: s.curl,
    spread: s.spread,
    waveForm: s.waveForm,
    divergenceAngle: s.divergenceAngle,
    waveFreq: s.waveFreq,
    waveTwist: s.waveTwist,
    fanSpread: s.fanSpread,
    fanFraming: s.fanFraming,
    fanAnchor: s.fanAnchor,
    tipAttract: s.tipAttract,
    attractor: s.attractor,
    knotP: s.knotP,
    knotQ: s.knotQ,
    superM: s.superM,
    superN1: s.superN1,
    superN2: s.superN2,
    morphTo: s.morphTo,
    morph: s.morph,
    seed: s.seed,
    colorMode: s.colorMode,
    accent: s.accent,
    gradCount: s.gradCount,
    grad1: s.grad1,
    grad2: s.grad2,
    grad3: s.grad3,
    grad4: s.grad4,
    grad5: s.grad5,
    grad1A: s.grad1A,
    grad2A: s.grad2A,
    grad3A: s.grad3A,
    grad4A: s.grad4A,
    grad5A: s.grad5A,
    gradMap: s.gradMap,
    surface: s.surface,
    surfaceColor: s.surfaceColor,
    coreOn: s.coreOn,
    emission: s.emission,
    thickness: s.thickness,
    glass: s.glass,
    coreSize: s.coreSize,
    dotSize: s.dotSize,
    bloomIntensity: s.bloomIntensity,
    bloomThreshold: s.bloomThreshold,
    grain: s.grain,
    vignette: s.vignette,
    atmosphere: s.atmosphere,
    halftone: s.halftone,
    numbersOn: s.numbersOn,
    numberFormat: s.numberFormat,
    dataMode: s.dataMode,
    mathReadout: s.mathReadout,
    density: s.density,
    decimals: s.decimals,
    flicker: s.flicker,
    focusOn: s.focusOn,
    orbitSpeed: s.orbitSpeed,
    pulseSpeed: s.pulseSpeed,
    phase: s.phase,
    intro: s.intro,
    drawIn: s.drawIn,
    frame: s.frame,
  })
  return end
}

export function Controls() {
  const P = useStore.getState()
  const activePreset = useStore((s) => s.activePreset)

  const [, set] = useControls(() => ({
    Main: folder(
      {
        spread: {
          value: P.spread,
          options: {
            sphere: 'sphere',
            disc: 'disc',
            cascade: 'cascade',
            helix: 'helix',
            mobius: 'mobius',
            torus: 'torus',
            wave: 'wave',
            'attractor (strange)': 'attractor',
            'torus knot': 'knot',
            superformula: 'superformula',
            'hero fan': 'fan',
          },
          label: 'shape',
          onChange: mk('spread'),
        },
        waveForm: {
          value: P.waveForm,
          label: 'wave form',
          options: { curtain: 'curtain', drape: 'drape', ripple: 'ripple', flag: 'flag' },
          onChange: mk('waveForm'),
          render: (get) => sp(get) === 'wave',
        },
        colorMode: {
          value: P.colorMode,
          label: 'color',
          options: { spectrum: 'spectrum', nature: 'nature', single: 'single', custom: 'custom' },
          onChange: mk('colorMode'),
        },
        accent: { value: P.accent, label: 'accent', onChange: mk('accent') },
        emission: { value: P.emission, min: 0.2, max: 4, step: 0.05, label: 'glow', onChange: mk('emission') },
        bloomIntensity: { value: P.bloomIntensity, min: 0, max: 4, step: 0.05, label: 'bloom', onChange: mk('bloomIntensity') },
        atmosphere: { value: P.atmosphere, min: 0, max: 1.2, step: 0.01, label: 'depth haze', onChange: mk('atmosphere') },
      },
      { collapsed: false },
    ),
    Structure: folder(
      {
        nodeCount: { value: P.nodeCount, min: 30, max: 900, step: 1, label: 'node count', onChange: mk('nodeCount') },
        radius: { value: P.radius, min: 1, max: 7, step: 0.05, onChange: mk('radius') },
        jitter: { value: P.jitter, min: 0, max: 1, step: 0.01, onChange: mk('jitter') },
        curl: { value: P.curl, min: 0, max: 1.5, step: 0.01, onChange: mk('curl') },
        seed: { value: P.seed, min: 1, max: 999, step: 1, onChange: mk('seed') },
      },
      { collapsed: true },
    ),
    Math: folder(
      {
        divergenceAngle: {
          value: P.divergenceAngle,
          min: 0,
          max: 180,
          step: 0.001,
          label: 'divergence °',
          onChange: mk('divergenceAngle'),
          render: (get) => PHYLLO_SHAPES.includes(sp(get)),
        },
        waveFreq: {
          value: P.waveFreq,
          min: 0.3,
          max: 3,
          step: 0.05,
          label: 'wave freq',
          onChange: mk('waveFreq'),
          render: (get) => sp(get) === 'wave',
        },
        waveTwist: {
          value: P.waveTwist,
          min: 0,
          max: 2,
          step: 0.05,
          label: 'wave twist',
          onChange: mk('waveTwist'),
          render: (get) => sp(get) === 'wave',
        },
        fanSpread: {
          value: P.fanSpread,
          min: 60,
          max: 180,
          step: 1,
          label: 'fan spread °',
          onChange: mk('fanSpread'),
          render: (get) => sp(get) === 'fan',
        },
        fanFraming: {
          value: P.fanFraming,
          min: 0,
          max: 1,
          step: 0.01,
          label: 'fan framing',
          onChange: mk('fanFraming'),
          render: (get) => sp(get) === 'fan',
        },
        fanAnchor: {
          value: P.fanAnchor,
          min: 0,
          max: 1,
          step: 0.01,
          label: 'fan anchor',
          onChange: mk('fanAnchor'),
          render: (get) => sp(get) === 'fan',
        },
        tipAttract: {
          value: P.tipAttract,
          label: 'tip attract',
          onChange: mk('tipAttract'),
          render: (get) => sp(get) === 'fan',
        },
        attractor: {
          value: P.attractor,
          options: { lorenz: 'lorenz', aizawa: 'aizawa', thomas: 'thomas', halvorsen: 'halvorsen', dadras: 'dadras' },
          onChange: mk('attractor'),
          render: (get) => sp(get) === 'attractor',
        },
        knotP: { value: P.knotP, min: 1, max: 12, step: 1, label: 'knot p', onChange: mk('knotP'), render: (get) => sp(get) === 'knot' },
        knotQ: { value: P.knotQ, min: 1, max: 12, step: 1, label: 'knot q', onChange: mk('knotQ'), render: (get) => sp(get) === 'knot' },
        superM: { value: P.superM, min: 1, max: 20, step: 1, label: 'super m', onChange: mk('superM'), render: (get) => sp(get) === 'superformula' },
        superN1: { value: P.superN1, min: 0.1, max: 6, step: 0.05, label: 'super n1', onChange: mk('superN1'), render: (get) => sp(get) === 'superformula' },
        superN2: { value: P.superN2, min: 0.1, max: 6, step: 0.05, label: 'super n2', onChange: mk('superN2'), render: (get) => sp(get) === 'superformula' },
        morphTo: {
          value: P.morphTo,
          label: 'morph to',
          options: {
            off: 'off',
            sphere: 'sphere',
            disc: 'disc',
            cascade: 'cascade',
            helix: 'helix',
            mobius: 'mobius',
            torus: 'torus',
            superformula: 'superformula',
          },
          onChange: mk('morphTo'),
          render: (get) => RADIAL.has(sp(get)),
        },
        morph: {
          value: P.morph,
          min: 0,
          max: 1,
          step: 0.01,
          label: 'morph',
          onChange: mk('morph'),
          render: (get) => RADIAL.has(sp(get)) && get('Math.morphTo') !== 'off',
        },
      },
      { collapsed: true },
    ),
    Style: folder(
      {
        surface: {
          value: P.surface,
          label: 'surface',
          options: { dark: 'dark', light: 'light', custom: 'custom' },
          onChange: mk('surface'),
        },
        surfaceColor: {
          value: P.surfaceColor,
          label: '· colour',
          onChange: mk('surfaceColor'),
          render: (get) => sf(get) === 'custom',
        },
        gradMap: {
          value: P.gradMap,
          label: 'gradient map',
          options: { 'along fiber': 'fiber', radial: 'radial', 'linear (y)': 'linear', angle: 'angle' },
          onChange: mk('gradMap'),
        },
        gradCount: {
          value: P.gradCount,
          min: 2,
          max: 5,
          step: 1,
          label: 'stops',
          onChange: mk('gradCount'),
          render: (get) => cm(get) === 'custom',
        },
        grad1: { value: P.grad1, label: 'stop 1', onChange: mk('grad1'), render: (get) => cm(get) === 'custom' },
        grad1A: { value: P.grad1A, min: 0, max: 1, step: 0.01, label: '· alpha', onChange: mk('grad1A'), render: (get) => cm(get) === 'custom' },
        grad2: { value: P.grad2, label: 'stop 2', onChange: mk('grad2'), render: (get) => cm(get) === 'custom' },
        grad2A: { value: P.grad2A, min: 0, max: 1, step: 0.01, label: '· alpha', onChange: mk('grad2A'), render: (get) => cm(get) === 'custom' },
        grad3: { value: P.grad3, label: 'stop 3', onChange: mk('grad3'), render: (get) => cm(get) === 'custom' && (get('Style.gradCount') as number) >= 3 },
        grad3A: { value: P.grad3A, min: 0, max: 1, step: 0.01, label: '· alpha', onChange: mk('grad3A'), render: (get) => cm(get) === 'custom' && (get('Style.gradCount') as number) >= 3 },
        grad4: { value: P.grad4, label: 'stop 4', onChange: mk('grad4'), render: (get) => cm(get) === 'custom' && (get('Style.gradCount') as number) >= 4 },
        grad4A: { value: P.grad4A, min: 0, max: 1, step: 0.01, label: '· alpha', onChange: mk('grad4A'), render: (get) => cm(get) === 'custom' && (get('Style.gradCount') as number) >= 4 },
        grad5: { value: P.grad5, label: 'stop 5', onChange: mk('grad5'), render: (get) => cm(get) === 'custom' && (get('Style.gradCount') as number) >= 5 },
        grad5A: { value: P.grad5A, min: 0, max: 1, step: 0.01, label: '· alpha', onChange: mk('grad5A'), render: (get) => cm(get) === 'custom' && (get('Style.gradCount') as number) >= 5 },
        coreOn: { value: P.coreOn, label: 'core', onChange: mk('coreOn') },
        thickness: { value: P.thickness, min: 0.5, max: 6, step: 0.1, onChange: mk('thickness') },
        glass: { value: P.glass, min: 0, max: 1.5, step: 0.05, label: 'glass sheen', onChange: mk('glass') },
        coreSize: { value: P.coreSize, min: 0.2, max: 3, step: 0.05, label: 'core size', onChange: mk('coreSize') },
        dotSize: { value: P.dotSize, min: 0.2, max: 3, step: 0.05, label: 'dot size', onChange: mk('dotSize') },
      },
      { collapsed: true },
    ),
    FX: folder(
      {
        bloomThreshold: { value: P.bloomThreshold, min: 0, max: 1, step: 0.01, label: 'bloom threshold', onChange: mk('bloomThreshold') },
        grain: { value: P.grain, min: 0, max: 0.12, step: 0.001, onChange: mk('grain') },
        vignette: { value: P.vignette, min: 0, max: 1.5, step: 0.01, onChange: mk('vignette') },
        halftone: { value: P.halftone, onChange: mk('halftone') },
      },
      { collapsed: true },
    ),
    Data: folder(
      {
        numbersOn: { value: P.numbersOn, label: 'numbers', onChange: mk('numbersOn') },
        numberFormat: {
          value: P.numberFormat,
          label: 'format',
          options: { decimal: 'decimal', binary: 'binary', hex: 'hex', ascii: 'ascii', mixed: 'mixed' },
          onChange: mk('numberFormat'),
        },
        dataMode: {
          value: P.dataMode,
          label: 'reads',
          options: { magnitude: 'magnitude', index: 'index', parameter: 'parameter', radius: 'radius' },
          onChange: mk('dataMode'),
        },
        mathReadout: { value: P.mathReadout, label: 'math readout', onChange: mk('mathReadout') },
        density: { value: P.density, min: 0, max: 1, step: 0.01, onChange: mk('density') },
        decimals: { value: P.decimals, min: 0, max: 3, step: 1, onChange: mk('decimals') },
        flicker: { value: P.flicker, min: 0.5, max: 20, step: 0.5, onChange: mk('flicker') },
        focusOn: { value: P.focusOn, label: 'focus number', onChange: mk('focusOn') },
      },
      { collapsed: true },
    ),
    Motion: folder(
      {
        orbitSpeed: { value: P.orbitSpeed, min: 0, max: 0.6, step: 0.005, label: 'orbit speed', onChange: mk('orbitSpeed') },
        pulseSpeed: { value: P.pulseSpeed, min: 0, max: 2, step: 0.01, label: 'pulse speed', onChange: mk('pulseSpeed') },
        phase: { value: P.phase, min: 0, max: 4, step: 0.05, label: 'index phase', onChange: mk('phase') },
        intro: {
          value: P.intro,
          label: 'entrance',
          options: { grow: 'grow', morph: 'morph' },
          onChange: mk('intro'),
        },
        drawIn: { value: P.drawIn, label: 'assembly draw-in', onChange: mk('drawIn') },
        'replay grow': button(() => useStore.getState().replayGrow()),
      },
      { collapsed: true },
    ),
    Export: folder(
      {
        frame: {
          value: P.frame,
          label: 'frame',
          options: {
            free: 'free',
            'square · 1:1': 'square',
            'portrait · 4:5': 'portrait',
            'story · 9:16': 'story',
            'landscape · 16:9': 'landscape',
            'OG / X · 1.91:1': 'og',
          },
          onChange: mk('frame'),
        },
        'download PNG': button(() => downloadRaster('png', slug())),
        'download JPEG': button(() => downloadRaster('jpeg', slug())),
        'download SVG (vector)': button(() => {
          const s = useStore.getState()
          downloadSVG(slug(), s.colorMode, s.accent)
        }),
      },
      { collapsed: false },
    ),
    Config: folder(
      {
        'copy look link': button(() => {
          navigator.clipboard?.writeText(location.href)
        }),
        reseed: button(() => useStore.getState().reseed()),
        reset: button(() => useStore.getState().bulkSet({ ...DEFAULT_PARAMS })),
      },
      { collapsed: true },
    ),
  }))

  // Push store -> Leva on a preset/bulk change so the panel stays in sync.
  useEffect(() => {
    if (activePreset === 'Custom') return
    return pushStoreToLeva(set as (o: Record<string, unknown>) => void)
  }, [activePreset, set])

  // Randomize (and any programmatic roll) bumps uiSyncId — re-sync the panel even
  // though activePreset is 'Custom', so the controls reflect the rolled values.
  const uiSyncId = useStore((s) => s.uiSyncId)
  useEffect(() => {
    if (uiSyncId === 0) return
    return pushStoreToLeva(set as (o: Record<string, unknown>) => void)
  }, [uiSyncId, set])

  // a morph entrance drives morphTo behind the scenes (prev shape -> 'off');
  // mirror it back so the panel's "morph to" never shows a stale transient
  const morphToVal = useStore((s) => s.morphTo)
  useEffect(() => {
    const end = suppressWindow(150)
    set({ morphTo: morphToVal } as any)
    return end
  }, [morphToVal, set])

  return null
}
