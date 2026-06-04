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
  activePreset: PresetName | 'Custom'
  set: <K extends keyof Params>(key: K, value: Params[K]) => void
  applyPreset: (name: PresetName) => void
  bulkSet: (patch: Partial<Params>) => void
  replayGrow: () => void
}

const STRUCTURE = new Set<string>(STRUCTURE_KEYS as string[])
const LUT = new Set<string>(LUT_KEYS as string[])

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
        activePreset,
        set,
        applyPreset,
        bulkSet,
        replayGrow,
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
  }
})

// Convenience non-reactive snapshot for useFrame reads.
export const snap = () => useStore.getState()

// Dev-only: expose the store for quick console tweaking / debugging.
if (import.meta.env.DEV) {
  ;(window as unknown as { nf: typeof useStore }).nf = useStore
}
