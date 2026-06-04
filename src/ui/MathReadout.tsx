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

function readout(s: Params): { title: string; lines: string[] } {
  const ga = s.divergenceAngle.toFixed(3)
  switch (s.spread) {
    case 'sphere':
    case 'disc':
      return {
        title: s.spread === 'disc' ? 'phyllotaxis disc' : 'fibonacci sphere',
        lines: [`θᵢ = i · ${ga}°`, `Φ = ${PHI}   (golden angle)`],
      }
    case 'golden':
      return { title: 'logarithmic golden spiral', lines: ['r(θ) = e^{bθ}', `Φ = ${PHI}  ·  ×Φ per 90°`] }
    case 'attractor': {
      const a = ATTRACTOR_EQ[s.attractor] ?? ATTRACTOR_EQ.lorenz
      return { title: `${s.attractor} attractor`, lines: [a.eq, a.k] }
    }
    case 'hopf':
      return { title: 'Hopf fibration  S³ → S²', lines: ['fiber = stereographic{ e^{iψ}(z₁,z₂) }', 'each fiber a linked circle'] }
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
  void [spread, attractor, knotP, knotQ, superM, divergenceAngle]
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
