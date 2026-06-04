import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  ShaderMaterial,
  Sphere,
  Texture,
  Vector2,
  Vector3,
} from 'three'
import type { FieldData } from '../lib/geometry'
import { snap } from '../store/store'

const VERT = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aEnd;
  attribute float aParamStart;
  attribute float aParamEnd;
  attribute float aT;
  attribute float aAccent;
  attribute float aSeed;
  uniform vec2 uResolution;
  uniform float uThickness;
  varying float vParam;
  varying float vT;
  varying float vAccent;
  varying float vSeed;
  varying float vSide;
  varying float vViewDepth;
  void main() {
    float along = position.x;
    vSide = position.y;
    vParam = mix(aParamStart, aParamEnd, along);
    vT = aT; vAccent = aAccent; vSeed = aSeed;

    vec4 mvStart = modelViewMatrix * vec4(aStart, 1.0);
    vec4 mvEnd = modelViewMatrix * vec4(aEnd, 1.0);
    vViewDepth = -mix(mvStart.z, mvEnd.z, along);
    vec4 clipStart = projectionMatrix * mvStart;
    vec4 clipEnd = projectionMatrix * mvEnd;
    vec4 clip = mix(clipStart, clipEnd, along);

    float aspect = uResolution.x / uResolution.y;
    vec2 ndcStart = clipStart.xy / clipStart.w;
    vec2 ndcEnd = clipEnd.xy / clipEnd.w;
    vec2 dir = ndcEnd - ndcStart;
    dir.x *= aspect;
    if (length(dir) < 1e-6) dir = vec2(1.0, 0.0);
    dir = normalize(dir);
    vec2 normal = vec2(-dir.y, dir.x);
    normal.x /= aspect;

    vec2 offset = normal * vSide * (uThickness / uResolution.y);
    clip.xy += offset * clip.w;
    gl_Position = clip;
  }
`

const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uLUT;
  uniform float uTime;
  uniform float uPulseSpeed;
  uniform float uPulseWidth;
  uniform float uPulseGain;
  uniform float uEmission;
  uniform float uPhase;
  uniform float uDrawIn;
  uniform float uAtmo;
  uniform float uCamDist;
  uniform float uFogR;
  uniform float uThickness;
  uniform float uGlass;
  varying float vParam;
  varying float vT;
  varying float vAccent;
  varying float vSeed;
  varying float vSide;
  varying float vViewDepth;
  void main() {
    vec3 base = texture2D(uLUT, vec2(clamp(vT, 0.0, 1.0), 0.5)).rgb;
    if (vAccent > 0.5 && vAccent < 1.5) base = vec3(0.21, 0.88, 0.48);
    else if (vAccent > 1.5 && vAccent < 2.5) base = vec3(1.0, 0.18, 0.18);
    else if (vAccent > 2.5) base = vec3(1.0, 1.0, 1.0);

    float bright = mix(0.8, 1.18, vParam);
    vec3 lit = base * uEmission * bright;

    // travelling signal pulse
    float ph = fract(vParam - uTime * uPulseSpeed + vSeed * uPhase);
    float band = smoothstep(1.0 - uPulseWidth, 1.0, ph);
    lit += base * band * uPulseGain;

    // strand body at full brightness (glass only ADDS sheen, never dims)
    // vSide: -1 edge .. 0 centre .. 1 edge
    float aw = abs(vSide);
    float body = smoothstep(1.0, 0.1, aw);
    vec3 color = lit * body;

    // additive glass-like sheen, gated by thickness so thin burst strands stay glowy
    float specGain = clamp((uThickness - 1.8) / 2.6, 0.0, 1.0) * uGlass;
    float spec = smoothstep(0.14, 0.0, abs(vSide - 0.22)) * specGain;            // glossy off-centre highlight
    float rim = smoothstep(0.55, 0.92, aw) * smoothstep(1.0, 0.92, aw) * uGlass; // refractive coloured edge
    color += vec3(1.0) * spec * (0.4 + 0.6 * band);
    color += lit * rim * 0.45;

    // atmospheric depth: fade toward the black background with view distance
    float near = uCamDist - uFogR * 1.3;
    float far = uCamDist + uFogR * 1.75;
    float df = clamp((far - vViewDepth) / max(0.001, far - near), 0.0, 1.0);
    df = mix(1.0, df * df, uAtmo);
    color *= df;

    float reveal = smoothstep(uDrawIn, uDrawIn - 0.14, vParam);
    float alpha = (body + spec * 0.6 + rim * 0.4) * reveal * mix(1.0, df, uAtmo * 0.6);
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(color, alpha);
  }
`

// per-vertex quad corners: (along, side) packed in xy, z unused
const CORNERS = new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, -1, 0, 1, 1, 0, 0, 1, 0])

function buildGeometry(field: FieldData): InstancedBufferGeometry {
  const geo = new InstancedBufferGeometry()
  geo.setAttribute('position', new BufferAttribute(CORNERS, 3))
  geo.setAttribute('aStart', new InstancedBufferAttribute(field.segStart, 3))
  geo.setAttribute('aEnd', new InstancedBufferAttribute(field.segEnd, 3))
  geo.setAttribute('aParamStart', new InstancedBufferAttribute(field.segParamStart, 1))
  geo.setAttribute('aParamEnd', new InstancedBufferAttribute(field.segParamEnd, 1))
  geo.setAttribute('aT', new InstancedBufferAttribute(field.segT, 1))
  geo.setAttribute('aAccent', new InstancedBufferAttribute(field.segAccent, 1))
  geo.setAttribute('aSeed', new InstancedBufferAttribute(field.segSeed, 1))
  geo.instanceCount = field.segCount
  geo.boundingSphere = new Sphere(new Vector3(0, 0, 0), field.radius * 3)
  return geo
}

export function Fibers({
  field,
  lut,
  drawInValue,
}: {
  field: FieldData
  lut: Texture | null
  drawInValue: { current: number }
}) {
  const { gl } = useThree()
  const matRef = useRef<ShaderMaterial>(null)
  const resVec = useRef(new Vector2(1, 1))

  const geometry = useMemo(() => buildGeometry(field), [field])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uResolution: { value: resVec.current },
      uThickness: { value: 1.7 },
      uLUT: { value: lut },
      uTime: { value: 0 },
      uPulseSpeed: { value: 0.35 },
      uPulseWidth: { value: 0.18 },
      uPulseGain: { value: 1.6 },
      uEmission: { value: 1.5 },
      uPhase: { value: 1.0 },
      uDrawIn: { value: 1.2 },
      uAtmo: { value: 0.7 },
      uCamDist: { value: 8.5 },
      uFogR: { value: 3.2 },
      uGlass: { value: 0.7 },
    }),
    [], // created once; values updated each frame
  )

  useEffect(() => {
    if (matRef.current) matRef.current.uniforms.uLUT.value = lut
  }, [lut])

  useFrame((state) => {
    const m = matRef.current
    if (!m) return
    const s = snap()
    const u = m.uniforms
    u.uTime.value = state.clock.elapsedTime
    u.uThickness.value = s.thickness
    u.uEmission.value = s.emission
    u.uPulseSpeed.value = s.pulseSpeed
    u.uPhase.value = s.phase
    u.uDrawIn.value = drawInValue.current
    u.uAtmo.value = s.atmosphere
    u.uCamDist.value = state.camera.position.length()
    u.uFogR.value = field.radius
    u.uGlass.value = s.glass
    gl.getDrawingBufferSize(resVec.current)
  })

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={1}>
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  )
}
