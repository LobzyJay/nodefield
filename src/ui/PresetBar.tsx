import { useStore } from '../store/store'
import { MATH_PRESETS, SHAPE_PRESETS, SURFACE_PRESETS, type PresetName } from '../store/presets'

// shapes on the left, math fields on the right (divider between)
export function PresetBar() {
  const active = useStore((s) => s.activePreset)
  const apply = useStore((s) => s.applyPreset)
  const randomize = useStore((s) => s.randomize)

  const chip = (n: PresetName) => (
    <button
      key={n}
      className={'chip' + (active === n ? ' chip-active' : '')}
      onClick={() => apply(n)}
      title={n}
    >
      {n}
    </button>
  )

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
      <div className="preset-group">{SHAPE_PRESETS.map(chip)}</div>
      <span className="preset-div" />
      <div className="preset-group">{MATH_PRESETS.map(chip)}</div>
      <span className="preset-div" />
      <div className="preset-group">{SURFACE_PRESETS.map(chip)}</div>
    </div>
  )
}
