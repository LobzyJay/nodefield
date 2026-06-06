# Nodefield — Product Plan

A living roadmap. v1 is shipped; this doc grows as v2 takes shape.

---

## What it is (one line)

> The most beautiful way to make abstract fields **move** and **display data** — for
> screens, stories, and the math that bends people's minds.

Nodefield turns parameters into glowing fibre/particle fields with live numbers
riding the nodes. Its superpower is making abstract *structure* look cinematic and
alive. Its weakness is literal legibility — so every use case leans on the first
and never fights the second.

---

## v1 — shipped

- Real-time r3f engine; cheap (uniform) vs expensive (rebuild) param split.
- Shape families:
  - **Radial burst** — sphere, disc, cascade, helix, möbius, torus, superformula.
  - **Strand / curve** — strange attractors (Lorenz/Aizawa/Thomas/Halvorsen/Dadras), torus knot.
  - **Flow field** — vortex dipole.
  - **Wave** — curtain, drape, ripple, flag.
- Continuous shape **morph** between radial shapes.
- Telemetry numbers (decimal/binary/hex/ascii/mixed) + live math readout.
- Glass sheen, depth haze, bloom, grain, vignette, halftone.
- Export: PNG / JPEG / SVG + social/web aspect frames.
- Control bar: contextual params, floating preset bar, main/advanced split,
  morph vs grow entrance, keyboard layer (←→ presets · space replay · R seed · H hide).
- URL-hash config persistence (every look is a shareable link / seed).

---

## v2 — target market & thesis

**Audience shift:** from "designer making assets for themselves" → **creators who
need motion and meaning on a screen.** Three buyers, one engine:

1. **Live / audio-reactive visuals** — VJs, events, launch screens, music.
   *Wedge: highest leverage on what's built (motion primitives already exist);
   demand is emotional, not rational — people pay for vibe.*
2. **Data-driven generative art** — "your data as a signature image" (story/identity,
   not analytics). Bands' streaming numbers, a product's metrics, year-in-data.
   *Reframe: data → story, never data → analysis. Real values live on the nodes;
   the gestalt is art.*
3. **FUI / sci-fi data displays** — film, games, product-demo mockups.
   *Wedge: the numbers-on-a-field look IS this; the one place Nodefield is
   unambiguously the best tool in the world. Every output doubles as a portfolio asset.*

**Feature (not a product): "Mind-benders" STEM gallery** — see below.

---

## The big v2 addition: Parametric Surface family

The new reference images (hyperboloid, wormhole, pseudosphere/horn, wave-grid)
are all **one generator**: a `(u,v) → xyz` function emitted as a wireframe of
u-lines and v-lines through the existing `buildStrands` path — same pattern as
the flow field and the attractors.

One generator unlocks:

| Surface | Function family | Doubles as (STEM) |
|---|---|---|
| Hyperboloid (1 sheet) | ruled surface (straight lines!) | "curved, yet made of straight lines" |
| Wormhole | Flamm's paraboloid | Einstein–Rosen bridge |
| Pseudosphere | tractricoid | non-Euclidean / hyperbolic geometry |
| Gabriel's Horn | 1/x surface of revolution | finite volume, infinite area |
| Klein bottle | figure-8 immersion | no inside/outside |
| Catenoid ↔ Helicoid | minimal surfaces | **isometric morph** (pairs with existing morph) |
| Wave-grid | Σ sin(αu+φ) sheet | standing waves / Chladni — also pure design-asset/app-icon gold |

Why it's high-leverage: it serves **FUI + design assets + the STEM feature
simultaneously**, off a single build.

### "Mind-benders" STEM feature spec

- A curated gallery of the ~8 most-obsessed-over objects (above + existing
  attractors/knot/möbius).
- Each = the live shape + a **one-card explainer**: name, the paradox/idea in a
  sentence, the equation (readout already does this).
- Tone: "Gabriel's Horn — fill it with paint and you'll never have enough to coat
  its surface." Wonder, not a textbook.
- Cost: ~a caption layer over shapes added for use cases 1–3. That's why it's a
  feature, not a product.

---

## v2 roadmap (phased)

**Phase A — Surface engine** ✅ SHIPPED (commit d8e1ff8)
- [x] `makeSurface` → wireframe strands (u-lines + v-lines).
- [x] Surfaces: hyperboloid, wormhole, pseudosphere, horn, wave-grid, **catenoid, helicoid**.
- [x] Presets (house neon style) + readout STEM lines for each.
- [x] catenoid↔helicoid morph (via the existing morph graft, extended to a SURFACES set).

**Phase B — Motion layer (use case 1)**
- [ ] Audio input (mic / file) → FFT bands.
- [ ] Map bands → emission / pulse / morph / bloom; beat → draw-in pop.
- [ ] Fullscreen "perform" mode (UI hidden, audio-driven).

**Phase C — Data layer (use case 2)**
- [ ] CSV drop → column → parameter mapping UI.
- [ ] Rows → fibres; numeric col → length/radius; col → colour; categorical → shape (small-multiples).
- [ ] Real values shown on the nodes.

**Phase D — Mind-benders gallery (STEM feature)**
- [ ] Theory cards + a curated gallery view; shareable per-object links.

**Phase E — Distribution**
- [ ] Embeddable web component (loading screens, brand backgrounds, FUI in decks).
- [ ] Preset/seed marketplace or pack.

---

## Experience & Craft pass (v2 polish)

Lenses: **generative-craft** (complete the instrument) + **Emil Kowalski** (unseen
details) + **design-taste-frontend** (anti-slop), applied with judgment.

**Hard constraint: keep the current style.** The neon-on-black viewport is the
product and stays exactly as-is. The "Lila ban" and recolor rules apply to the
*chrome*, never the canvas. No Tailwind/shadcn rewrite — principles applied to the
existing Leva theme + CSS. This pass only (a) completes the generative instrument
and (b) crafts the chrome so it gets out of the way.

> ✅ SHIPPED (commit 4c90935): Randomize + uiSyncId panel-sync + Randomize pill,
> chrome press-craft (scale-on-press, easing tokens, reduced-motion, touch-hover
> guard), seed in HUD, "copy look link". (First-run floating hint intentionally
> skipped — the always-on hint line + labelled pill already cover discovery.)

### 1. Complete the instrument (generative-craft) — the headline
Gap: there's a seed + `reseed` (same look, new seed) but no true *explore* verb.
- [ ] **Randomize ("surprise me")** — one click rolls a whole new on-brand field:
  curated shape, accent from the preset palette, look params in tasteful ranges,
  fresh seed, plus shape sub-params (waveForm / knotP-Q / attractor / superM-N).
  Bounded ranges = every roll already looks like Nodefield (the "defaults are
  on-brand" rule).
- [ ] Surface: a small **Randomize** pill at the left of the preset bar (SVG icon,
  no emoji). Keep `R` = reseed; Randomize is its own button.
- [ ] Wiring: a `randomize()` store action + a `uiSyncId` so the Leva panel
  re-syncs to rolled values (today it only syncs on preset change, not on Custom).
- [ ] Reproducibility is already the URL hash — make that legible as "this is the
  lock": rename **copy config URL → copy look link**, add the **seed to the HUD**.

### 2. Chrome micro-craft (Emil) — the unseen details
- [ ] Press feedback on every pressable (chips, download/config/randomize):
  `:active { transform: scale(0.97) }`, ~140ms, strong curve `cubic-bezier(0.23,1,0.32,1)`
  (replaces the current `translateY(1px)`).
- [ ] Custom easing tokens (`--ease-out`, `--ease-in-out`) replacing weak default `ease`.
- [ ] `prefers-reduced-motion`: stop the brand-dot pulse; reduce transitions to opacity.
- [ ] Gate chip `:hover` behind `@media (hover:hover) and (pointer:fine)` (no sticky tap-hover).
- [ ] Confirm nothing animates on keyboard-repeated actions (←→ cycle already clean — keep).

### 3. First-run & honesty (taste Rule 5)
- [ ] A quiet, auto-fading first-load hint ("Randomize · drag to orbit · H to hide"),
  reduced-motion aware, never blocks. On-style, low-key.

### Build order (each independent / shippable)
1. `randomize()` + `uiSyncId` sync + Randomize pill  ← biggest win
2. Chrome press-craft + easing + reduced-motion/touch guards (CSS-only, fast)
3. Seed in HUD + "copy look link" rename
4. First-run fading hint

### Explicitly NOT doing
Recolour/restyle the field · Tailwind/shadcn rewrite · glass cards · any new motion
*on the canvas chrome* · a new accent system. The style stays.

## Backlog / open questions

- Butterfly / wing flow field (the other ChatGPT reference) — quick add.
- Naming: "Nodefield" vs "Constellation" vs "Dataspine" — decide before public push.
- Catenoid↔helicoid morph as the hero demo of "math you can *watch* deform."
- Does the morph machinery generalize to surface↔surface (same u,v grid)? Likely yes.
- Performance ceiling for dense wireframes (uStepsxvSteps segment count).
