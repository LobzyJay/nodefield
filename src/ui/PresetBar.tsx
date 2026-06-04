import { useStore } from '../store/store'
import type { PresetName } from '../store/presets'

// shapes on the left, math fields on the right (divider between)
const SHAPE_PRESETS: PresetName[] = ['Nucleus', 'Wave', 'Drape', 'Cascade', 'Helix', 'Möbius', 'Torus', 'Disc']
const MATH_PRESETS: PresetName[] = ['Lorenz', 'Superform', 'Knot']

export function PresetBar() {
  const active = useStore((s) => s.activePreset)
  const apply = useStore((s) => s.applyPreset)

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
      <div className="preset-group">{SHAPE_PRESETS.map(chip)}</div>
      <span className="preset-div" />
      <div className="preset-group">{MATH_PRESETS.map(chip)}</div>
    </div>
  )
}
