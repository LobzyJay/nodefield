import { useStore } from '../store/store'
import type { Params } from '../store/types'

const PHI = '1.61803'

const ATTRACTOR_EQ: Record<string, { eq: string; k: string }> = {
  lorenz: { eq: 'ẋ=σ(y−x)  ẏ=x(ρ−z)−y  ż=xy−βz', k: 'σ=10  ρ=28  β=2.667' },
  aizawa: { eq: 'ẋ=(z−b)x−dy  ẏ=dx+(z−b)y  ż=…', k: 'a=.95 b=.7 c=.6 d=3.5' },
  thomas: { eq: 'ẋ=sin y−bx  ẏ=sin z−by  ż=sin x−bz', k: 'b=0.19' },
  halvorsen: { eq: 'ẋ=−ax−4y−4z−y²  (cyclic)', k: 'a=1.4' },
  dadras: { eq: 'ẋ=y−ax+byz  ẏ=cy−xz+z  ż=dxy−ez', k: 'a=3 b=2.7 c=1.7' },
}

function shapeLabel(spread: string): string {
  return spread === 'mobius' ? 'Möbius' : spread
}

function readout(s: Params): { title: string; lines: string[] } {
  const r = baseReadout(s)
  // when blending toward another shape, show the path the maths is taking
  if (s.morphTo !== 'off' && s.morphTo !== s.spread && s.morph > 0.001) {
    r.lines = [
      ...r.lines,
      `${shapeLabel(s.spread)} → ${shapeLabel(s.morphTo)}   ${Math.round(s.morph * 100)}% blend`,
    ]
  }
  return r
}

function baseReadout(s: Params): { title: string; lines: string[] } {
  const ga = s.divergenceAngle.toFixed(3)
  switch (s.spread) {
    case 'sphere':
    case 'disc':
      return {
        title: s.spread === 'disc' ? 'phyllotaxis disc' : 'fibonacci sphere',
        lines: [`θᵢ = i · ${ga}°`, `Φ = ${PHI}   (golden angle)`],
      }
    case 'attractor': {
      const a = ATTRACTOR_EQ[s.attractor] ?? ATTRACTOR_EQ.lorenz
      return { title: `${s.attractor} attractor`, lines: [a.eq, a.k] }
    }
    case 'knot':
      return {
        title: `torus knot (${Math.round(s.knotP)}, ${Math.round(s.knotQ)})`,
        lines: ['x=(cos qt+2)cos pt,  z=−sin qt', `(p,q) = (${Math.round(s.knotP)}, ${Math.round(s.knotQ)})`],
      }
    case 'superformula':
      return {
        title: 'Gielis superformula',
        lines: ['r(φ)=(|cos(mφ/4)|ⁿ²+|sin|ⁿ³)^(−1/n₁)', `m=${s.superM}  n₁=${s.superN1}  n₂=${s.superN2}`],
      }
    case 'helix':
      return { title: 'double helix', lines: ['(r cos θ, h·t, r sin θ),  θ=2πkt', 'two strands, π apart'] }
    case 'mobius':
      return { title: 'Möbius band', lines: ['(R+v cos(u/2))·(cos u, …),', 'one half-twist'] }
    case 'torus':
      return { title: 'torus', lines: ['((R+r cos v)cos u, r sin v, …)', `R/r ≈ 2.4`] }
    case 'cascade':
      return { title: 'spiral cascade', lines: ['rᵢ = R·layer,  θ = i·Φ + layer·6π', `Φ = ${ga}°`] }
    case 'wave':
      return { title: `wave · ${s.waveForm}`, lines: ['z = Σ sin(αu + φ)', 'flowing ribbons'] }
    case 'vortex':
      return {
        title: 'vortex dipole',
        lines: ['v = Σ Γₙ (r−rₙ)⊥ / |r−rₙ|²', 'two counter-rotating swirls'],
      }
    case 'wormhole':
      return { title: 'wormhole', lines: ['Flamm paraboloid · r = cosh v', 'Einstein–Rosen bridge'] }
    case 'hyperboloid':
      return { title: 'hyperboloid', lines: ['x²+z² − y² = 1', 'ruled — built from straight lines'] }
    case 'pseudosphere':
      return { title: 'pseudosphere', lines: ['tractricoid · constant K = −1', 'a model of hyperbolic geometry'] }
    case 'horn':
      return { title: 'horn', lines: ['y = 1/x, revolved', "Gabriel's horn — finite volume, infinite area"] }
    case 'wavegrid':
      return { title: 'wavegrid', lines: ['z = Σ sin(αs)·cos(βt)', 'standing-wave sheet'] }
    case 'catenoid':
      return { title: 'catenoid', lines: ['(cosh v cos u, v, cosh v sin u)', 'minimal surface — bends into the helicoid'] }
    case 'helicoid':
      return { title: 'helicoid', lines: ['(v cos u, c·u, v sin u)', 'minimal surface — the catenoid unrolled'] }
    default:
      return { title: String(s.spread), lines: [] }
  }
}

export function MathReadout() {
  const on = useStore((s) => s.mathReadout)
  // subscribe to the bits that change the readout so it re-renders on edit
  const spread = useStore((st) => st.spread)
  const attractor = useStore((st) => st.attractor)
  const knotP = useStore((st) => st.knotP)
  const knotQ = useStore((st) => st.knotQ)
  const superM = useStore((st) => st.superM)
  const divergenceAngle = useStore((st) => st.divergenceAngle)
  const morphTo = useStore((st) => st.morphTo)
  const morph = useStore((st) => st.morph)
  void [spread, attractor, knotP, knotQ, superM, divergenceAngle, morphTo, morph]
  if (!on) return null
  const r = readout(useStore.getState())
  return (
    <div className="readout">
      <div className="readout-title">{r.title}</div>
      {r.lines.map((l, i) => (
        <div key={i} className="readout-line">
          {l}
        </div>
      ))}
    </div>
  )
}
