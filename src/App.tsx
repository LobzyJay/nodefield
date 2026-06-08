import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Leva } from 'leva'
import { Scene } from './scene/Scene'
import { Controls } from './ui/Controls'
import { MathReadout } from './ui/MathReadout'
import { PresetBar } from './ui/PresetBar'
import { useStore } from './store/store'
import { PRESET_ORDER } from './store/presets'
import type { FrameMode } from './store/types'

// Aspect ratio per export frame (social / web).
const FRAME_ASPECT: Record<FrameMode, number | null> = {
  free: null,
  square: 1, // 1:1 — IG post
  portrait: 4 / 5, // 4:5 — IG portrait
  story: 9 / 16, // 9:16 — story / reel
  landscape: 16 / 9, // 16:9 — web / YouTube
  og: 1.91, // 1.91:1 — OG / X / LinkedIn
}

function FrameBox({ children }: { children: React.ReactNode }) {
  const frame = useStore((s) => s.frame)
  const a = FRAME_ASPECT[frame]
  if (a == null) return <div style={{ position: 'fixed', inset: 0 }}>{children}</div>
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#06070A', display: 'grid', placeItems: 'center' }}>
      <div
        style={{
          position: 'relative',
          aspectRatio: String(a),
          width: `min(94vw, ${(94 * a).toFixed(2)}vh)`,
          maxHeight: '94vh',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

const MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace"

// Restrained, technical panel theme: off-black surfaces, one muted accent, mono type.
const levaTheme = {
  colors: {
    elevation1: '#0b0d12',
    elevation2: '#0b0d12',
    elevation3: '#161a22',
    accent1: '#39414f',
    accent2: '#5b8cff',
    accent3: '#7aa0ff',
    highlight1: '#737c89',
    highlight2: '#b9c0cb',
    highlight3: '#eef2f7',
    vivid1: '#5b8cff',
    folderWidgetColor: '#565e6b',
    folderTextColor: '#aeb6c2',
    toolTipBackground: '#161a22',
    toolTipText: '#eef2f7',
  },
  radii: { xs: '3px', sm: '5px', lg: '8px' },
  space: { sm: '6px', md: '9px', rowGap: '5px', colGap: '6px' },
  fonts: { mono: MONO, sans: MONO },
  fontSizes: { root: '10.5px', toolTip: '10px' },
  sizes: {
    rootWidth: '290px',
    controlWidth: '126px',
    rowHeight: '22px',
    folderTitleHeight: '24px',
    titleBarHeight: '34px',
    numberInputMinWidth: '52px',
  },
  borderWidths: { root: '0px', input: '1px', focus: '1px', hover: '1px' },
}

// Keyboard layer for power users: cycle presets, replay the entrance, reseed,
// and hide the whole UI for a clean capture. Returns whether the UI is hidden.
function useHotkeys(): boolean {
  const [uiHidden, setUiHidden] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // never hijack typing inside a Leva field
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || el?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const s = useStore.getState()

      const cycle = (dir: number) => {
        const order = PRESET_ORDER
        const i = order.indexOf(s.activePreset as (typeof order)[number])
        const base = i < 0 ? (dir > 0 ? -1 : 0) : i
        const ni = (((base + dir) % order.length) + order.length) % order.length
        s.applyPreset(order[ni])
      }

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault()
          cycle(1)
          break
        case 'ArrowLeft':
          e.preventDefault()
          cycle(-1)
          break
        case ' ':
          e.preventDefault()
          s.replayGrow()
          break
        case 'r':
        case 'R':
          s.reseed()
          break
        case 'h':
        case 'H':
          setUiHidden((v) => !v)
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return uiHidden
}

function HudMeta() {
  const preset = useStore((s) => s.activePreset)
  const spread = useStore((s) => s.spread)
  const nodes = useStore((s) => s.nodeCount)
  const seed = useStore((s) => s.seed)
  return (
    <div className="meta">
      {preset === 'Custom' ? 'custom' : preset} · {spread} · {nodes} · seed {seed}
    </div>
  )
}

export default function App() {
  const uiHidden = useHotkeys()
  return (
    <>
      <FrameBox>
        <Canvas
          flat
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: true,
          }}
          camera={{ position: [0, 0.4, 8.5], fov: 45, near: 0.1, far: 100 }}
          onCreated={({ gl }) => gl.setClearColor('#06070A', 1)}
        >
          <color attach="background" args={['#06070A']} />
          <Scene />
        </Canvas>
      </FrameBox>

      {!uiHidden && (
        <>
          <div className="overlay">
            <div className="brand">
              <img className="brandmark" src={`${import.meta.env.BASE_URL}nodefield-glyph.svg`} alt="" width="18" height="18" />
              NODEFIELD
            </div>
            <HudMeta />
            <div className="hint">
              <b>drag</b> orbit · <b>scroll</b> zoom · <b>←→</b> presets · <b>space</b> replay · <b>R</b> seed ·{' '}
              <b>H</b> hide
            </div>
          </div>

          <MathReadout />
          <PresetBar />
        </>
      )}
      <Leva theme={levaTheme} titleBar={{ title: 'NODE TREE' }} collapsed={false} hidden={uiHidden} />
      <Controls />
    </>
  )
}
