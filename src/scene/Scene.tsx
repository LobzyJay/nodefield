import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Group } from 'three'
import { buildField } from '../lib/geometry'
import { buildLUT } from '../lib/color'
import { snap, useStore } from '../store/store'
import { Core } from './Core'
import { Fibers } from './Fibers'
import { Nodes } from './Nodes'
import { Telemetry } from './Telemetry'
import { Effects } from './Effects'

export function Scene() {
  const structureVersion = useStore((s) => s.structureVersion)
  const lutVersion = useStore((s) => s.lutVersion)
  const coreOn = useStore((s) => s.coreOn)
  const spread = useStore((s) => s.spread)
  // the wave sheet has no centre, so the glowing core never belongs there
  const showCore = coreOn && spread !== 'wave'

  const field = useMemo(() => {
    const s = snap()
    const f = buildField({
      nodeCount: s.nodeCount,
      radius: s.radius,
      jitter: s.jitter,
      curl: s.curl,
      spread: s.spread,
      waveForm: s.waveForm,
      seed: s.seed,
    })
    ;(window as unknown as { nfField: unknown }).nfField = f
    return f
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureVersion])

  const lut = useMemo(() => {
    const s = snap()
    return buildLUT(s.colorMode, s.accent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lutVersion])
  useEffect(() => () => lut.dispose(), [lut])

  const groupRef = useRef<Group>(null)
  const drawInRef = useRef(1.2)
  const startRef = useRef(-1)

  // replay assembly draw-in whenever geometry rebuilds
  useEffect(() => {
    startRef.current = -1
  }, [structureVersion])

  useFrame((state, dt) => {
    const s = snap()
    if (groupRef.current) {
      groupRef.current.rotation.y += s.orbitSpeed * dt
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.13) * 0.05
      const w = window as unknown as { nfGroup: Group; nfCamera: unknown }
      w.nfGroup = groupRef.current
      w.nfCamera = state.camera
    }
    const t = state.clock.elapsedTime
    if (s.drawIn) {
      if (startRef.current < 0) startRef.current = t
      drawInRef.current = Math.min(1.2, ((t - startRef.current) / 1.8) * 1.2)
    } else {
      drawInRef.current = 1.2
    }
    // depth haze for the troika telemetry text (custom shaders fade themselves)
    const fog = state.scene.fog as { density?: number } | null
    if (fog && 'density' in fog) fog.density = 0.025 + s.atmosphere * 0.062
  })

  return (
    <>
      <fogExp2 attach="fog" args={['#06070A', 0.05]} />
      <group ref={groupRef}>
        {showCore && <Core />}
        <Fibers field={field} lut={lut} drawInValue={drawInRef} />
        <Nodes field={field} lut={lut} drawInValue={drawInRef} />
        <Telemetry field={field} radius={field.radius} />
      </group>
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={30}
        enablePan={false}
      />
      <Effects />
    </>
  )
}
