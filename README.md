# Nodefield

A live WebGL "data-network" render engine: a glowing core, a dense spectrum fiber
burst, and position-driven numeric **inputs** (decimal / binary / hex / ASCII) —
driven by a control panel grouped like a geometry-node tree. Move a slider and the
look updates in real time, then export the frame for social or web.

Built with Vite · React · TypeScript · three.js (react-three-fiber) · Leva · Zustand.

---

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build -> dist/
npm run preview    # serve the production build locally
```

## Deploy (Vercel)

This is a static Vite app — zero server. `vercel.json` is already configured
(`framework: vite`, output `dist`).

- **Git + dashboard:** push to GitHub, "Add New Project" on vercel.com, pick the
  repo. Vercel auto-detects Vite. No env vars needed.
- **CLI:**
  ```bash
  npm i -g vercel
  vercel          # preview deploy
  vercel --prod   # production
  ```

Any static host works too (Netlify, Cloudflare Pages, GitHub Pages): build with
`npm run build` and serve `dist/`.

---

## What it does

**Fields (`spread`)** — `sphere` · `disc` · `cascade` (funnel) · `helix` · `mobius`
· `torus` · `wave`. The wave field has its own ribbon topology with four forms
(`curtain` · `drape` · `ripple` · `flag`).

**Inputs (`Data → format`)** — the numbers riding the field render as `decimal`,
`binary` (8-bit), `hex` (`0x..`), `ascii` (code glyphs), or `mixed` (a stream of
all four). They flicker like live data.

**Presets** — Nucleus · Wave · Drape · Cascade · Helix · Möbius · Torus · Disc.
Every change saves to the URL hash — `Config → copy config URL` is a shareable
link that restores the exact look.

**Export (`Export`)** — `frame` letterboxes the canvas to a social/web aspect
(free · square 1:1 · portrait 4:5 · story 9:16 · landscape 16:9 · OG/X 1.91:1),
then **download PNG / JPEG** (pixel-perfect, full resolution) or **SVG** (a flat
vector line-drawing of the fibers + dots + numbers — no bloom, great for print/scaling).

---

## The engine

Every control is **cheap** or **expensive**:

- **Cheap** params are GPU uniforms — they update on the next frame with no rebuild
  (color, emission, thickness, glass, bloom, grain, vignette, depth haze, density,
  decimals, flicker, pulse/orbit speed, number format).
- **Expensive** params rebuild the instanced geometry, debounced ~80 ms (node count,
  radius, jitter, curl, spread, wave form, seed).

A single [Zustand](src/store/store.ts) store holds all params; [Leva](src/ui/Controls.tsx)
binds to it; the scene reads from it. Color mode/accent only rebuild a 256×1 LUT
texture (instant), not geometry.

```
set('bloomIntensity', x)  -> uniform next frame
set('colorMode', x)       -> rebuild LUT texture
set('nodeCount', x)       -> rebuild geometry after 80ms (debounced)
```

| File | Role |
|---|---|
| `src/lib/geometry.ts` | Fibonacci placement, all spread shapes + wave forms, jitter, curl → instanced buffers |
| `src/lib/color.ts` | Color modes + LUT texture |
| `src/lib/export.ts` | PNG/JPEG (canvas) + SVG (projected vector line-art) |
| `src/scene/Fibers.tsx` | Custom GPU fat-lines: thickness, spectrum, pulse, glass sheen, depth fade, draw-in — one draw call |
| `src/scene/Nodes.tsx` | Instanced billboard endpoint dots |
| `src/scene/Telemetry.tsx` | Monospace numeric inputs (decimal/binary/hex/ascii) + green focus readout |
| `src/scene/Effects.tsx` | Bloom · halftone · ACES tonemap · grain · vignette |

---

## Tips

- **Performance** — fibers are one instanced draw call, so node count scales well;
  the `dpr` is capped at 2. If it's heavy on a laptop GPU, drop bloom intensity or
  node count. Curl adds points-per-fiber (smoother curves cost a little more).
- **Higher-res exports** — export resolution = window size × devicePixelRatio.
  Make the browser window bigger (or zoom the OS display) before exporting for a
  larger PNG. A square frame on a ~1080px tall window already exports >2K.
- **SVG export** is a *vector line-drawing*, not the glowing screen — bloom is a
  raster effect. Use it for crisp scalable/print versions; use PNG/JPEG for the
  glow.
- **Wave fields** read best near-front (small framing angle); the sphere/torus/helix
  read best at a 3/4 angle. Turn the core off for the wave fields (it's auto-hidden).
- **Smooth curves** — ribbon jitter is per-row (coherent), never per-point, so
  strands stay smooth. If you ever add a shape, keep randomness per-fiber, not
  per-vertex.
- **Cinematic stills** — set `orbit speed` to 0 and `assembly draw-in` off to freeze
  motion, raise `depth haze` and `vignette`, and keep the core off/small so the
  centre doesn't blow out to white.
- **Share a look** — `copy config URL` encodes every param in the URL hash; paste it
  to anyone (or into a deploy) to load that exact composition.

---

## Fonts

`public/fonts/JetBrainsMono-*.ttf` (committed) are used by the 3D numeric labels
(troika SDF text) and the UI. They must ship with the build.
