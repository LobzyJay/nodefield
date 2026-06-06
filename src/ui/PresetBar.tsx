import { useEffect, useState } from 'react'
import { useStore } from '../store/store'
import { MATH_PRESETS, SHAPE_PRESETS, SURFACE_PRESETS, type PresetName } from '../store/presets'

// one family of presets shown at a time, switched by the tabs — keeps the bar
// compact (max one group) however large the shape library grows
const FAMILIES = [
  { key: 'shapes', label: 'Shapes', list: SHAPE_PRESETS },
  { key: 'math', label: 'Math', list: MATH_PRESETS },
  { key: 'surfaces', label: 'Surfaces', list: SURFACE_PRESETS },
] as const
type FamKey = (typeof FAMILIES)[number]['key']

// which family a raw spread belongs to (so the tab follows even on a Custom roll)
const SHAPE_SPREADS = new Set(['sphere', 'disc', 'cascade', 'helix', 'mobius', 'torus', 'wave'])
const MATH_SPREADS = new Set(['attractor', 'knot', 'superformula', 'vortex'])
const SURFACE_SPREADS = new Set(['hyperboloid', 'wormhole', 'pseudosphere', 'horn', 'wavegrid', 'catenoid', 'helicoid'])

function familyOf(preset: PresetName | 'Custom', spread: string): FamKey | null {
  if (SHAPE_PRESETS.includes(preset as PresetName)) return 'shapes'
  if (MATH_PRESETS.includes(preset as PresetName)) return 'math'
  if (SURFACE_PRESETS.includes(preset as PresetName)) return 'surfaces'
  // Custom: fall back to the visible spread so the right family stays selected
  if (SHAPE_SPREADS.has(spread)) return 'shapes'
  if (MATH_SPREADS.has(spread)) return 'math'
  if (SURFACE_SPREADS.has(spread)) return 'surfaces'
  return null
}

export function PresetBar() {
  const active = useStore((s) => s.activePreset)
  const spread = useStore((s) => s.spread)
  const apply = useStore((s) => s.applyPreset)
  const randomize = useStore((s) => s.randomize)
  const [tab, setTab] = useState<FamKey>('shapes')

  // keep the visible family in sync with what's on screen, so the lit chip (after
  // ←/→ cycling or applying a preset) or the right family (after a randomize) shows
  useEffect(() => {
    const fam = familyOf(active, spread)
    if (fam) setTab(fam)
  }, [active, spread])

  const list = FAMILIES.find((f) => f.key === tab)!.list

  return (
    <div className="presetbar">
      <button className="chip chip-roll" onClick={randomize} title="Randomize — surprise me">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="16 3 21 3 21 8" />
          <line x1="4" y1="20" x2="21" y2="3" />
          <polyline points="21 16 21 21 16 21" />
          <line x1="15" y1="15" x2="21" y2="21" />
          <line x1="4" y1="4" x2="9" y2="9" />
        </svg>
        Randomize
      </button>
      <span className="preset-div" />
      <div className="preset-tabs">
        {FAMILIES.map((f) => (
          <button
            key={f.key}
            className={'preset-tab' + (tab === f.key ? ' preset-tab-active' : '')}
            onClick={() => setTab(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <span className="preset-div" />
      <div className="preset-group">
        {list.map((n) => (
          <button
            key={n}
            className={'chip' + (active === n ? ' chip-active' : '')}
            onClick={() => apply(n)}
            title={n}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
