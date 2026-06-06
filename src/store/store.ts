import { create } from 'zustand'
import { LUT_KEYS, Params, STRUCTURE_KEYS } from './types'
import { DEFAULT_PARAMS, PRESETS, PresetName } from './presets'
import { RADIAL } from '../lib/geometry'

interface StoreState extends Params {
  // version signals that React subscribes to for rebuilds
  structureVersion: number // bump -> rebuild geometry (debounced)
  lutVersion: number // bump -> rebuild color LUT (instant)
  introMorphId: number // bump -> Scene plays a shape->shape morph entrance
  growReplayId: number // bump -> Scene replays the assembly draw-in
  uiSyncId: number // bump -> Leva panel re-syncs to the store (randomize/programmatic)
  activePreset: PresetName | 'Custom'
  set: <K extends keyof Params>(key: K, value: Params[K]) => void
  applyPreset: (name: PresetName) => void
  bulkSet: (patch: Partial<Params>) => void
  replayGrow: () => void
  reseed: () => void
  randomize: () => void
}

const STRUCTURE = new Set<string>(STRUCTURE_KEYS as string[])
const LUT = new Set<string>(LUT_KEYS as string[])

// Randomize draws from curated, on-brand pools so every roll already looks like
// Nodefield (the generative-craft "defaults are on-brand" rule).
const RANDOM_SHAPES = [
  'sphere', 'disc', 'helix', 'mobius', 'torus', 'wave', 'cascade', 'superformula',
  'knot', 'vortex', 'attractor', 'wormhole', 'hyperboloid', 'pseudosphere', 'horn',
  'wavegrid', 'catenoid', 'helicoid',
]
const RANDOM_ACCENTS = ['#FD607B', '#4C7CFF', '#35E0C8', '#7B3FE4', '#E1101A', '#E8702A', '#FF5C7A', '#A8E10C']

// ---- URL hash persistence ----
function encodeHash(p: Params): string {
  try {
    return btoa(encodeURIComponent(JSON.stringify(p)))
  } catch {
    return ''
  }
}
function decodeHash(): Partial<Params> | null {
  if (!location.hash || location.hash.length < 2) return null
  try {
    return JSON.parse(decodeURIComponent(atob(location.hash.slice(1))))
  } catch {
    return null
  }
}

const initial: Params = { ...DEFAULT_PARAMS, ...(decodeHash() ?? {}) }

let commitTimer: ReturnType<typeof setTimeout> | null = null
let hashTimer: ReturnType<typeof setTimeout> | null = null

export const useStore = create<StoreState>((setState, getState) => {
  const scheduleHash = () => {
    if (hashTimer) clearTimeout(hashTimer)
    hashTimer = setTimeout(() => {
      const {
        structureVersion,
        lutVersion,
        introMorphId,
        growReplayId,
        uiSyncId,
        activePreset,
        set,
        applyPreset,
        bulkSet,
        replayGrow,
        reseed,
        randomize,
        ...params
      } = getState()
      history.replaceState(null, '', '#' + encodeHash(params as Params))
    }, 300)
  }

  const scheduleCommit = () => {
    if (commitTimer) clearTimeout(commitTimer)
    commitTimer = setTimeout(() => {
      setState((s) => ({ structureVersion: s.structureVersion + 1 }))
    }, 80)
  }

  return {
    ...initial,
    structureVersion: 0,
    lutVersion: 0,
    introMorphId: 0,
    growReplayId: 0,
    uiSyncId: 0,
    activePreset: 'Nucleus',

    set: (key, value) => {
      setState({ [key]: value, activePreset: 'Custom' } as Partial<StoreState>)
      if (STRUCTURE.has(key as string)) scheduleCommit()
      if (LUT.has(key as string)) setState((s) => ({ lutVersion: s.lutVersion + 1 }))
      scheduleHash()
    },

    bulkSet: (patch) => {
      setState(patch as Partial<StoreState>)
      const keys = Object.keys(patch)
      if (keys.some((k) => STRUCTURE.has(k))) setState((s) => ({ structureVersion: s.structureVersion + 1 }))
      if (keys.some((k) => LUT.has(k))) setState((s) => ({ lutVersion: s.lutVersion + 1 }))
      scheduleHash()
    },

    applyPreset: (name) => {
      const prev = getState()
      const target = { ...DEFAULT_PARAMS, ...PRESETS[name] }
      // morph entrance only works between two radial shapes (shared fibre
      // topology) — anything involving wave/attractor/knot falls back to grow
      const morphIntro =
        prev.intro === 'morph' &&
        target.spread !== prev.spread &&
        RADIAL.has(prev.spread) &&
        RADIAL.has(target.spread)

      const patch: Partial<StoreState> = {
        ...target,
        intro: prev.intro, // keep the entrance preference across presets
        activePreset: name,
      }
      if (morphIntro) {
        patch.morphTo = prev.spread // build B = the shape we are leaving
        patch.morph = 0 // the live morph value is driven by the Scene
      }
      setState(patch)
      setState((s) => ({
        structureVersion: s.structureVersion + 1,
        lutVersion: s.lutVersion + 1,
        ...(morphIntro ? { introMorphId: s.introMorphId + 1 } : {}),
      }))
      scheduleHash()
    },

    replayGrow: () => setState((s) => ({ growReplayId: s.growReplayId + 1 })),

    reseed: () => {
      // a genuine reseed — full 1..999 range, not a deterministic walk
      getState().set('seed', 1 + Math.floor(Math.random() * 999))
    },

    // "surprise me" — roll a whole new on-brand field in one click. Result is
    // fully captured by the URL hash, so any roll is shareable / recoverable.
    randomize: () => {
      const r = Math.random
      const pick = <T>(a: T[]): T => a[Math.floor(r() * a.length)]
      const rng = (lo: number, hi: number) => +(lo + r() * (hi - lo)).toFixed(2)
      const shape = pick(RANDOM_SHAPES) as Params['spread']
      const patch: Partial<Params> = {
        spread: shape,
        colorMode: pick(['spectrum', 'spectrum', 'spectrum', 'nature', 'single']) as Params['colorMode'],
        accent: pick(RANDOM_ACCENTS),
        seed: 1 + Math.floor(r() * 999),
        nodeCount: Math.round(rng(440, 900)),
        emission: rng(1.3, 2.1),
        bloomIntensity: rng(1.2, 1.6),
        thickness: rng(1.1, 2.4),
        glass: rng(0.3, 0.8),
        atmosphere: rng(0.5, 0.85),
        curl: r() < 0.25 ? rng(0.1, 0.5) : 0,
        coreOn: false,
        morphTo: 'off',
        morph: 0,
      }
      if (shape === 'wave') patch.waveForm = pick(['curtain', 'drape', 'ripple', 'flag']) as Params['waveForm']
      if (shape === 'knot') {
        patch.knotP = 2 + Math.floor(r() * 6)
        patch.knotQ = 1 + Math.floor(r() * 5)
      }
      if (shape === 'attractor') {
        patch.attractor = pick(['lorenz', 'aizawa', 'thomas', 'halvorsen', 'dadras']) as Params['attractor']
      }
      if (shape === 'superformula') {
        patch.superM = 2 + Math.floor(r() * 12)
        patch.superN1 = rng(0.2, 2)
        patch.superN2 = rng(0.4, 3)
      }
      setState({ ...patch, activePreset: 'Custom' } as Partial<StoreState>)
      setState((s) => ({
        structureVersion: s.structureVersion + 1,
        lutVersion: s.lutVersion + 1,
        uiSyncId: s.uiSyncId + 1,
      }))
      scheduleHash()
    },
  }
})

// Convenience non-reactive snapshot for useFrame reads.
export const snap = () => useStore.getState()

// Dev-only: expose the store for quick console tweaking / debugging.
if (import.meta.env.DEV) {
  ;(window as unknown as { nf: typeof useStore }).nf = useStore
}
