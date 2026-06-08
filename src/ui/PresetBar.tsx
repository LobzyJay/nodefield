import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/store'
import { HERO_PRESETS, MATH_PRESETS, SHAPE_PRESETS, type PresetName } from '../store/presets'

// the full catalog lives behind one menu — the bar stays just Randomize + the menu
const SECTIONS = [
  { label: 'Shapes', list: SHAPE_PRESETS },
  { label: 'Math', list: MATH_PRESETS },
  { label: 'Hero', list: HERO_PRESETS },
] as const

export function PresetBar() {
  const active = useStore((s) => s.activePreset)
  const apply = useStore((s) => s.applyPreset)
  const randomize = useStore((s) => s.randomize)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // close the popover on click-outside or Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const label = active === 'Custom' ? 'Presets' : active

  return (
    <div className="presetbar" ref={ref}>
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
      <button
        className={'chip preset-menu' + (open ? ' preset-menu-open' : '')}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Choose a preset"
      >
        {label}
        <svg className="preset-caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="preset-popover">
          {SECTIONS.map((sec) => (
            <div className="preset-pop-section" key={sec.label}>
              <div className="preset-pop-label">{sec.label}</div>
              <div className="preset-pop-grid">
                {sec.list.map((n: PresetName) => (
                  <button
                    key={n}
                    className={'chip' + (active === n ? ' chip-active' : '')}
                    onClick={() => {
                      apply(n)
                      setOpen(false)
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
