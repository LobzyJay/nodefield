import { useEffect } from 'react'
import { button, folder, useControls } from 'leva'
import { useStore } from '../store/store'
import { DEFAULT_PARAMS, PRESET_ORDER } from '../store/presets'
import type { Params } from '../store/types'
import { downloadRaster, downloadSVG } from '../lib/export'

// filename slug from the current look
function slug() {
  const s = useStore.getState()
  const p = s.activePreset === 'Custom' ? 'custom' : s.activePreset
  return `${p}-${s.spread}`.toLowerCase().replace(/[^a-z0-9-]/g, '')
}

// While we programmatically push preset values back into Leva, its onChange
// handlers fire — suppress those so a preset application doesn't flip to "Custom".
let suppressWrites = false

// Build an onChange handler that writes to the store only on real user changes.
function mk<K extends keyof Params>(key: K) {
  return (value: Params[K]) => {
    if (suppressWrites) return
    const st = useStore.getState()
    if (st[key] !== value) st.set(key, value)
  }
}

export function Controls() {
  const P = useStore.getState()
  const activePreset = useStore((s) => s.activePreset)

  const presetButtons = Object.fromEntries(
    PRESET_ORDER.map((name) => [name, button(() => useStore.getState().applyPreset(name))]),
  )

  const [, set] = useControls(() => ({
    Structure: folder(
      {
        nodeCount: { value: P.nodeCount, min: 30, max: 900, step: 1, label: 'node count', onChange: mk('nodeCount') },
        radius: { value: P.radius, min: 1, max: 7, step: 0.05, onChange: mk('radius') },
        jitter: { value: P.jitter, min: 0, max: 1, step: 0.01, onChange: mk('jitter') },
        curl: { value: P.curl, min: 0, max: 1.5, step: 0.01, onChange: mk('curl') },
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
          },
          onChange: mk('spread'),
        },
        waveForm: {
          value: P.waveForm,
          label: 'wave form',
          options: { curtain: 'curtain', drape: 'drape', ripple: 'ripple', flag: 'flag' },
          onChange: mk('waveForm'),
        },
        seed: { value: P.seed, min: 1, max: 999, step: 1, onChange: mk('seed') },
      },
      { collapsed: false },
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
        },
        attractor: {
          value: P.attractor,
          options: { lorenz: 'lorenz', aizawa: 'aizawa', thomas: 'thomas', halvorsen: 'halvorsen', dadras: 'dadras' },
          onChange: mk('attractor'),
        },
        knotP: { value: P.knotP, min: 1, max: 12, step: 1, label: 'knot p', onChange: mk('knotP') },
        knotQ: { value: P.knotQ, min: 1, max: 12, step: 1, label: 'knot q', onChange: mk('knotQ') },
        superM: { value: P.superM, min: 1, max: 20, step: 1, label: 'super m', onChange: mk('superM') },
        superN1: { value: P.superN1, min: 0.1, max: 6, step: 0.05, label: 'super n1', onChange: mk('superN1') },
        superN2: { value: P.superN2, min: 0.1, max: 6, step: 0.05, label: 'super n2', onChange: mk('superN2') },
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
        },
        morph: { value: P.morph, min: 0, max: 1, step: 0.01, label: 'morph', onChange: mk('morph') },
      },
      { collapsed: true },
    ),
    Style: folder(
      {
        colorMode: {
          value: P.colorMode,
          label: 'color mode',
          options: { spectrum: 'spectrum', nature: 'nature', single: 'single' },
          onChange: mk('colorMode'),
        },
        accent: { value: P.accent, label: 'accent', onChange: mk('accent') },
        coreOn: { value: P.coreOn, label: 'core', onChange: mk('coreOn') },
        emission: { value: P.emission, min: 0.2, max: 4, step: 0.05, onChange: mk('emission') },
        thickness: { value: P.thickness, min: 0.5, max: 6, step: 0.1, onChange: mk('thickness') },
        glass: { value: P.glass, min: 0, max: 1.5, step: 0.05, label: 'glass sheen', onChange: mk('glass') },
        coreSize: { value: P.coreSize, min: 0.2, max: 3, step: 0.05, label: 'core size', onChange: mk('coreSize') },
        dotSize: { value: P.dotSize, min: 0.2, max: 3, step: 0.05, label: 'dot size', onChange: mk('dotSize') },
      },
      { collapsed: true },
    ),
    FX: folder(
      {
        bloomIntensity: { value: P.bloomIntensity, min: 0, max: 4, step: 0.05, label: 'bloom', onChange: mk('bloomIntensity') },
        bloomThreshold: { value: P.bloomThreshold, min: 0, max: 1, step: 0.01, label: 'bloom threshold', onChange: mk('bloomThreshold') },
        grain: { value: P.grain, min: 0, max: 0.12, step: 0.001, onChange: mk('grain') },
        vignette: { value: P.vignette, min: 0, max: 1.5, step: 0.01, onChange: mk('vignette') },
        atmosphere: { value: P.atmosphere, min: 0, max: 1.2, step: 0.01, label: 'depth haze', onChange: mk('atmosphere') },
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
        drawIn: { value: P.drawIn, label: 'assembly draw-in', onChange: mk('drawIn') },
      },
      { collapsed: true },
    ),
    Presets: folder(presetButtons, { collapsed: false }),
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
        'copy config URL': button(() => {
          navigator.clipboard?.writeText(location.href)
        }),
        reseed: button(() => useStore.getState().set('seed', 1 + Math.floor(useStore.getState().seed % 998) + 1)),
        reset: button(() => useStore.getState().bulkSet({ ...DEFAULT_PARAMS })),
      },
      { collapsed: true },
    ),
  }))

  // Push store -> Leva when a preset/bulk change happens (keeps panel in sync).
  useEffect(() => {
    if (activePreset === 'Custom') return
    const s = useStore.getState()
    suppressWrites = true
    set({
      nodeCount: s.nodeCount,
      radius: s.radius,
      jitter: s.jitter,
      curl: s.curl,
      spread: s.spread,
      waveForm: s.waveForm,
      divergenceAngle: s.divergenceAngle,
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
      drawIn: s.drawIn,
      frame: s.frame,
    } as any)
    // release the guard after Leva has processed the programmatic set()
    const id = setTimeout(() => {
      suppressWrites = false
    }, 0)
    return () => clearTimeout(id)
  }, [activePreset, set])

  return null
}
