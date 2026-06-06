# Constellation, Design System

**For:** Adewale
**Companion to:** Constellation-Makeathon-Brief.md, Constellation-Experience-Flow.md
**Source:** tokens lifted directly from Nodefield (`src/lib/color.ts`, `src/index.css`) so the design stays consistent with the engine.

---

## Paste-ready prompt (Figma Make / Weave / design agent)
Paste this to establish the system before generating any frame.

> Design the visual system for **Constellation**, a shared 3D night sky where each visitor places one glowing star and draws one thread to a stranger. The mood is dark, cinematic, sparse, and quietly reverent, like standing under a real night sky. The 3D sky is always the hero. UI is a whisper: minimal, monospace, low-contrast, fading in late and out early. Never busy, never gamey, never corporate.
>
> **Background:** near-black `#06070A`, with a soft radial vignette darkening the edges. Everything glows against this void.
>
> **Star colors (the only expressive choice, pick one of five):** white `#FFFFFF`, blue `#15B8FF`, violet `#8A2BD0`, magenta `#FF4D7A`, green `#35E07A`. Each star is a soft additive glow with a bloom halo, not a flat dot.
>
> **Threads:** thin glowing lines with an additive blend, colored as a gradient between the two stars they connect. They draw themselves in.
>
> **Live count and key telemetry:** focus green `#3BE08A`. This is the one signal color, used sparingly for the live star count and "you are here" moments.
>
> **Text:** `#EEF2F7` for primary, `#565E6B` for muted and secondary. Typeface is **JetBrains Mono** everywhere, lowercase, with generous letter-spacing on labels (around `0.3em`). Copy is short, human, and emotional. No title case, no punctuation-heavy UI.
>
> **Effects:** bloom on all light sources, faint film grain, edge vignette, ACES tonemapping. Light blooms, it does not just sit there.
>
> **Layout:** content floats over the sky. No panels, no cards, no nav bar, no boxes. Controls are bare text and small swatches anchored to the corners or low-center. Comfortable negative space. Touch targets at least 44px.
>
> **Motion:** everything eases, nothing snaps. Slow, weighted, cinematic. Camera moves carry the user between states. UI elements fade, never slide hard.
>
> Apply this system to every screen. When in doubt, remove an element rather than add one.

---

## Color tokens
| Token | Hex | Use |
|---|---|---|
| `bg` | `#06070A` | Background void |
| `ink` | `#EEF2F7` | Primary text |
| `muted` | `#565E6B` | Secondary text, hints, inactive |
| `signal` (focus green) | `#3BE08A` | Live count, "you are here", the one accent |
| `ui-accent` | `#5B8CFF` | Interactive hover / focus state on UI only |
| Star: white | `#FFFFFF` | Star color option |
| Star: blue | `#15B8FF` | Star color option |
| Star: violet | `#8A2BD0` | Star color option |
| Star: magenta | `#FF4D7A` | Star color option |
| Star: green | `#35E07A` | Star color option |
| Rare: red | `#FF2E2E` | Reserve for rare / special stars only, used sparingly |

Thread color = gradient between the two connected stars' colors (additive blend).

Full Nodefield spectrum (reference, for fields/bursts if reused): `#15B8FF` `#1E50FF` `#5B3BE0` `#8A2BD0` `#C81E9E` `#FF4D7A`.

---

## Typography
- **Family:** JetBrains Mono (weights 400 and 500). Already in `public/fonts/`.
- **Case:** lowercase for everything except intentional star labels (initials).
- **Letter-spacing:** labels and eyebrows ~`0.3em` to `0.34em`. Body copy normal.
- **Scale (suggested):**
  - Display / invitation line: 28 to 40px, weight 400
  - Prompt / instruction: 14 to 16px, weight 400, muted
  - Eyebrow / label: 11px, weight 500, uppercase, `0.34em` tracking
  - Count readout: 12 to 13px, weight 500, signal green
  - Star label (initials): 10 to 11px, ink or muted

---

## Spacing and layout
- **Edge margin:** 20 to 24px from screen edges for corner UI (matches Nodefield HUD: top 20px, left 24px).
- **Rhythm:** base unit 4px. Common gaps 8, 12, 16, 24, 40.
- **Chrome:** no containers. Text and controls sit directly on the sky. No borders, no fills, no cards.
- **Radius:** only where unavoidable (color swatches, capture button). Keep small, 4 to 8px, or fully round for swatches.
- **Touch targets:** minimum 44px even if the visible mark is smaller.

---

## Components
**Star (3D):** soft additive sprite, bloom halo, gentle twinkle (slow opacity pulse, ~2.6s like Nodefield's `nf-pulse`). Size scales subtly with depth.

**Thread (3D):** thin additive line, gradient between endpoint colors, draw-in animation along its length on creation, faint pulse after.

**Count readout:** monospace, signal green, a corner. Example `12,438 stars tonight`. Number animates by ticking up, never jumps.

**Color swatch row:** five small round swatches, the five star colors. Hover or focus previews the star live. Selected swatch gets a thin ring in `ui-accent`. No labels.

**Prompt line:** a single line of muted text, centered low, that fades in to guide the next action (`place your star`, `connect to someone`). One at a time, never stacked.

**Primary action (rare):** bare text button in ink, underline or subtle glow on hover, no filled button. Example `add yours`, `save image`, `copy link`.

**Brand mark (optional, tiny):** a small pulsing dot plus wordmark, top-left, 11px, `0.34em` tracking, like Nodefield. Keep it nearly invisible so it never competes with the sky.

---

## Effects and motion
- **Bloom** on every light source. The glow is the brand.
- **Grain** faint, filmic, constant.
- **Vignette** soft, pulling focus to center.
- **Tonemapping** ACES, so bright stars do not blow out to flat white.
- **Easing:** slow ease-in-out on everything. Durations 600ms to 1200ms for camera and reveals, 200ms to 300ms for hover states.
- **Transitions between states:** camera movement, not page cuts. UI cross-fades.

---

## Voice and copy
- Short, lowercase, human, a little poetic. Never instructional-corporate.
- Yes: `every star is someone who was here.` / `draw a line to someone you will never meet.` / `you are in the sky now.`
- No: `Click here to place your star` / `Welcome to Constellation!` / `Get started`.
- One thought per screen. Let silence and space do the work.

---

## Do and do not
- **Do** keep the sky the hero and the UI a whisper.
- **Do** glow everything. Flat = wrong.
- **Do** remove before you add.
- **Do not** use panels, cards, nav bars, or boxes.
- **Do not** use title case or exclamation marks.
- **Do not** introduce a second accent color. Signal green is the only one.
- **Do not** rush the user. Stillness is the feeling.
