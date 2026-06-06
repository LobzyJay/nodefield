# Constellation, Config Makeathon Build Brief

**For:** Adewale
**Date:** June 5, 2026 (makeathon is live, ends June 18 11:59pm PST, ~13 days left)
**Build tool:** Figma Make (entry must be built in Figma)
**Donor / reference:** Nodefield (this repo). Aesthetic, interaction model, and math come from here. The submission is rebuilt in Make.
**Source of truth for rules:** https://contra.com/community/topic/configmakeathon/guidelines

---

## The prompt and how we answer it
Official challenge: **"build the next great interaction design to shape culture as we know it, using Figma Make."**

Constellation is a new collective interaction: every visitor places exactly one star in a shared 3D night sky and draws one thread to someone else's star. Over time, strangers build a single growing constellation together. The interaction is the act of leaving one permanent mark in a shared space. The culture is the shared sky that results.

This is deliberately the same DNA that won Best Overall last year (Common Thread: multiplayer + a one-mark constraint + emotional connection), moved into 3D, a form last year's winners did not touch.

---

## One-liner
A shared night sky you build with strangers. One star each. Connect yours to someone you will never meet.

---

## The concept
- You land in a dark, quiet 3D space holding a few distant stars left by others.
- You place **one** star. You pick its position and a color from a small palette.
- You draw **one** thread from your star to any existing star. A glowing line connects you to a stranger.
- Your mark is permanent. Others' stars appear as they join (live, or on reload).
- You can fly through the whole constellation and watch it grow denser over time.
- You can capture and share the sky as it looked the moment you added your star.

The constraint is the point. One star, one thread. Scarcity is what gives the mark weight, exactly like "one patch of canvas for everyone."

---

## Why it can win
- **On-prompt:** it is interaction-first and culture-shaping, which is literally the brief.
- **Proven formula:** mirrors last year's Best Overall, in a fresh 3D form.
- **Emotional, not utilitarian:** the jury rewarded feeling over tools last year.
- **Demos in the first 30 seconds:** place a star, it blooms in, a stranger's star pops in live. Instant hook.
- **Huge head start:** Nodefield already solves the hard look.

---

## What Nodefield donates (reskin, not rebuild)
| Nodefield | Constellation |
|---|---|
| Instanced billboard dots (`Nodes.tsx`) | Stars |
| GPU fat-line fibers (`Fibers.tsx`) | The thread between two stars |
| Numeric telemetry (`Telemetry.tsx`) | Star count, coordinates, a person's initials |
| Dark field + bloom + grain + vignette (`Effects.tsx`) | Night-sky mood, already tuned |
| Field-fills-over-time | The sky filling as strangers add stars |
| Draw-in animation | A new thread drawing itself in |
| Export + URL-hash share | Shareable snapshot of the sky |
| JetBrains Mono SDF labels | Star labels and the live count readout |

Visual target: pure black, radial vignette, glowing stars with bloom halos in a restrained spectrum (white, blue, green, violet, soft red), thin glowing threads with a gradient along their length, slow drift, gentle twinkle, one green focal readout repurposed as the live star count.

---

## MVP scope (hold this line)
**In:**
1. Place one star (position + color).
2. Draw one thread to an existing star.
3. Persistence so stars accumulate across visitors.
4. Others' stars appear (live if feasible, else on reload).
5. Fly-through / drift camera.
6. Snapshot or share-link export.

**Out for v1 (resist these):**
- Accounts, login, profiles.
- Free-text labels (use initials only or none, avoids moderation).
- Sound design, mobile gyro, VR (all nice-to-have, not core).
- Editing or deleting a star after it is placed (permanence is the point).

---

## Core interaction flow
1. **Arrive.** Black sky, a few seeded distant stars so it never looks empty. One line of copy: "every star is someone who was here."
2. **Place.** Click to drop your star into space. Small palette of colors to choose from (constraint, like Common Thread's thread colors).
3. **Connect.** Draw one thread from your star to any existing star. The line draws itself in with a glow.
4. **Commit.** Your star and thread persist. A soft confirmation. The live count ticks up.
5. **Witness.** Camera drifts through the constellation. Other stars twinkle in as people join.
6. **Keep.** Export a snapshot or a link to the sky at your moment.

---

## Build approach in Figma Make
Make outputs a real web app and can run Three.js (last year's winners shipped WebGL on figma.site). Build in layers, prompting Make one capability at a time, testing each before the next.

**Multiplayer plan:**
- Preferred: live shared state via a hosted realtime store (the kind Common Thread used). Stars write to a shared backend and stream to everyone.
- Fallback if live is too costly in the window: persistent-async. Every load fetches all stars from a store and renders them; you add yours; others see it next time they load. Stage one genuine live moment for the video.

**Cold-start fix:** seed the sky with an initial scatter of stars so the first visitor never sees an empty void.

**Moderation shortcut:** ship initials-only or no text in v1. No free text means nothing to moderate.

---

## Figma Make starter prompts (paste-ready, iterate in order)
Run these one at a time. Adjust wording to taste. Keep each step working before moving on.

**1. Scene and mood**
> Build a full-screen Three.js web app. Pure black background with a subtle radial vignette. Render a few dozen glowing point "stars" scattered in 3D space, each a soft billboard sprite with a bloom halo, in a restrained palette of white, blue, green, violet and soft red. Add slow automatic camera drift and OrbitControls for mouse. Add a bloom postprocessing pass, faint film grain, and ACES tonemapping. Use JetBrains Mono for any text. The feel is a quiet, cinematic night sky.

**2. Place your star**
> Let the user place exactly one new star by clicking in the scene. Before placing, show a small row of color swatches to pick the star's color. On click, drop the star at that point in space with a brief bloom-in animation. After one star is placed, disable further placement for this user. Show a small monospace readout of the total star count that updates live.

**3. Draw one thread**
> After the user places their star, let them draw exactly one thread from their star to any existing star: hover a target star to highlight it, click to connect. Render the connection as a thin glowing line with a gradient from the user's star color to the target's, animating it drawing in from one end to the other. Limit the user to a single thread.

**4. Persistence and others' stars**
> Persist all stars and threads to a shared backend so they accumulate across visitors. On load, fetch and render every existing star and thread. When a new star is added by anyone, show it appearing with a soft bloom-in. Seed the scene with an initial scatter of stars so it is never empty.

**5. Fly-through and share**
> Add a gentle continuous drift through the constellation, with subtle twinkle (pulse) on the stars. Add a button that captures the current frame as a PNG and a button that copies a shareable link to the current sky. Keep the UI minimal and out of the way.

---

## Demo video storyboard (under 5 minutes, hook in 30s)
- **0:00 to 0:30** Black sky. Copy: "every star is someone who was here." You place your star, it blooms in. A stranger's star pops in live. Hook landed.
- **0:30 to 1:30** Draw your thread to a stranger's star. Show the constraint: only one star, only one thread.
- **1:30 to 2:30** Cut to stars appearing as people join. Fly through the dense, growing constellation. Let it breathe.
- **2:30 to 3:30** The meaning. A shared sky built by strangers, one mark each. Show the count climbing and a shared snapshot.
- **3:30 to 4:30** Built in Figma Make. Brief glimpse of the prompt-to-app process.
- Keep it under five minutes. The first thirty seconds decide everything.

---

## Submission requirements (confirm on the guidelines page)
- A public **Figma Slides** file with the embedded Make demo and/or prototype.
- A demonstration **video under 5 minutes**.
- Built in **Figma Make**.
- Hashtag and submission via Contra.

---

## Risks and mitigations
- **Realtime multiplayer build cost.** Mitigate with the persistent-async fallback and one staged live moment.
- **Empty sky on cold start.** Seed initial stars.
- **Moderation of user text.** Ship initials-only or no text in v1.
- **Scope creep.** Hold the one-star, one-thread line. Everything else is a distraction.
- **Make cannot reproduce Nodefield's custom shaders exactly.** Expected. Rebuild a simpler version. The feeling matters more than shader parity.

---

## Open questions
- Live multiplayer or async for v1?
- Pure stars, or initials allowed?
- Cultural framing: keep it open ("someone who was here") or theme it (a memorial, a moment in time, a movement)?
- Color palette: which five colors?
- Backend choice for persistence?

---

## Sources
- [Config Makeathon on Contra](https://contra.com/community/topic/configmakeathon)
- [Config Makeathon guidelines](https://contra.com/community/topic/configmakeathon/guidelines)
- [Figma, 6 designs that reimagine how we interact with software](https://www.figma.com/blog/6-designs-that-reimagine-how-we-interact-with-software/)
