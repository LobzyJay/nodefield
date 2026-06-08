import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Group, Plane, Vector3 } from 'three'
import { buildField } from '../lib/geometry'
import { buildLUT } from '../lib/color'
import { snap, useStore } from '../store/store'
import { Core } from './Core'
import { Fibers } from './Fibers'
import { Nodes } from './Nodes'
import { Telemetry } from './Telemetry'
import { Effects } from './Effects'

// the hero fan lies in the world z=0 plane — used to raycast the cursor onto it
const FAN_PLANE = new Plane(new Vector3(0, 0, 1), 0)
const FAN_Y = -2.7 // how far the apex is anchored below centre

export function Scene() {
  const structureVersion = useStore((s) => s.structureVersion)
  const lutVersion = useStore((s) => s.lutVersion)
  const introMorphId = useStore((s) => s.introMorphId)
  const growReplayId = useStore((s) => s.growReplayId)
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
      divergenceAngle: (s.divergenceAngle * Math.PI) / 180,
      waveFreq: s.waveFreq,
      waveTwist: s.waveTwist,
      attractor: s.attractor,
      knotP: s.knotP,
      knotQ: s.knotQ,
      superM: s.superM,
      superN1: s.superN1,
      superN2: s.superN2,
      morphTo: s.morphTo,
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
  // cursor in field space (xy) + interaction strength (z); the tip shaders read it
  const mouseRef = useRef(new Vector3(0, 0, 0))
  const hitVec = useRef(new Vector3())
  // effective morph amount the GPU + telemetry read (manual slider OR entrance)
  const morphRef = useRef(0)
  const morphing = useRef(false)
  const forceGrow = useRef(false)
  const skipNextGrow = useRef(false)
  const seenMorphId = useRef(introMorphId)

  // a geometry rebuild either replays the grow draw-in, or — when it's the
  // rebuild that kicked off a morph entrance — reveals fully and morphs instead
  useEffect(() => {
    if (snap().introMorphId !== seenMorphId.current) {
      seenMorphId.current = snap().introMorphId
      morphing.current = true
      morphRef.current = 1
      drawInRef.current = 1.2 // fully assembled; the morph carries the motion
      return
    }
    if (skipNextGrow.current) {
      skipNextGrow.current = false
      drawInRef.current = 1.2
      return
    }
    // a structural edit landed mid-morph: end the morph so morphTo doesn't
    // linger, then let this rebuild grow in as the new shape
    if (morphing.current) {
      morphing.current = false
      morphRef.current = 0
      if (snap().morphTo !== 'off') snap().bulkSet({ morphTo: 'off' })
    }
    startRef.current = -1
  }, [structureVersion])

  // explicit "replay" of the grow entrance, even if draw-in is toggled off
  useEffect(() => {
    if (growReplayId === 0) return
    // if a morph entrance was mid-flight, cancel it cleanly so morphTo doesn't
    // linger (a stale target would otherwise reappear on the next morph slider)
    if (morphing.current) {
      morphing.current = false
      morphRef.current = 0
      snap().bulkSet({ morphTo: 'off' })
    }
    startRef.current = -1
    forceGrow.current = true
  }, [growReplayId])

  useFrame((state, dt) => {
    const s = snap()
    if (groupRef.current) {
      if (s.spread === 'fan') {
        // hero fan: locked in one pose. interactivity comes from the cursor playing
        // with the ray TIPS — raycast the pointer onto the fan plane and hand the
        // tip shaders a field-space cursor + strength (the apex never moves).
        groupRef.current.rotation.set(0, 0, 0)
        groupRef.current.position.set(0, FAN_Y, 0)
        state.raycaster.setFromCamera(state.pointer, state.camera)
        const hit = state.raycaster.ray.intersectPlane(FAN_PLANE, hitVec.current)
        if (hit) {
          // world hit -> field-local (undo the group's downward anchor), strength in z
          mouseRef.current.set(hit.x, hit.y - FAN_Y, 0.9)
        } else {
          mouseRef.current.z = 0
        }
      } else {
        mouseRef.current.z = 0
        groupRef.current.position.set(0, 0, 0)
        groupRef.current.rotation.y += s.orbitSpeed * dt
        groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.13) * 0.05
      }
      const w = window as unknown as { nfGroup: Group; nfCamera: unknown }
      w.nfGroup = groupRef.current
      w.nfCamera = state.camera
    }
    const t = state.clock.elapsedTime

    // morph entrance: ease the field from the old shape (1) to the new one (0),
    // then drop the morph target so the geometry rebuilds clean
    if (morphing.current) {
      // clamp dt so a long frame gap (tab refocus / hitch) eases instead of popping
      morphRef.current -= Math.min(dt, 0.05) / 1.15
      if (morphRef.current <= 0) {
        morphRef.current = 0
        morphing.current = false
        skipNextGrow.current = true // the morphTo:'off' rebuild must not grow
        snap().bulkSet({ morphTo: 'off' })
      }
    } else {
      morphRef.current = s.morph // manual morph slider
    }

    // grow draw-in (suppressed while a morph entrance is playing)
    if (!morphing.current && (s.drawIn || forceGrow.current)) {
      if (startRef.current < 0) startRef.current = t
      drawInRef.current = Math.min(1.2, ((t - startRef.current) / 1.8) * 1.2)
      if (drawInRef.current >= 1.2) forceGrow.current = false
    } else if (!morphing.current && !forceGrow.current) {
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
        <Fibers field={field} lut={lut} drawInValue={drawInRef} morphValue={morphRef} mouseValue={mouseRef} />
        <Nodes field={field} lut={lut} drawInValue={drawInRef} morphValue={morphRef} mouseValue={mouseRef} />
        <Telemetry field={field} radius={field.radius} morphValue={morphRef} />
      </group>
      <OrbitControls
        makeDefault
        enabled={spread !== 'fan'}
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
