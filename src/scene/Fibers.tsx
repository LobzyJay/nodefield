import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  NormalBlending,
  ShaderMaterial,
  Sphere,
  Texture,
  Vector2,
  Vector3,
} from 'three'
import type { FieldData } from '../lib/geometry'
import { snap, useStore } from '../store/store'

// gradient mapping name -> shader index (matches the vertex-shader branches)
const GRAD_MAP: Record<string, number> = { fiber: 0, radial: 1, linear: 2, angle: 3 }

const VERT = /* glsl */ `
  attribute vec3 aStart;
  attribute vec3 aEnd;
  attribute vec3 aStartB;
  attribute vec3 aEndB;
  attribute float aParamStart;
  attribute float aParamEnd;
  attribute float aT;
  attribute float aAccent;
  attribute float aSeed;
  uniform vec2 uResolution;
  uniform float uThickness;
  uniform float uMorph;
  uniform vec3 uMouse; // xy = cursor in field space, z = strength (0 = off)
  uniform float uGradMap; // 0 fiber, 1 radial, 2 linear(y), 3 angle
  uniform float uFieldR;
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
    vAccent = aAccent; vSeed = aSeed;

    vec3 sPos = mix(aStart, aStartB, uMorph);
    vec3 ePos = mix(aEnd, aEndB, uMorph);
    // the cursor "plays with" the ray tips: push the end (only) away when near it.
    // the apex stays fixed, so the ray bends toward/around the cursor.
    if (abs(uMouse.z) > 0.001) {
      vec2 md = ePos.xy - uMouse.xy;
      float mf = smoothstep(2.3, 0.0, length(md));
      ePos.xy += normalize(md + vec2(1e-4)) * mf * uMouse.z;
    }
    // gradient sample coordinate: along-fiber (default) or derived from the endpoint
    float gt = aT;
    if (uGradMap > 0.5 && uGradMap < 1.5) gt = clamp(length(ePos) / max(0.0001, uFieldR), 0.0, 1.0);
    else if (uGradMap > 1.5 && uGradMap < 2.5) gt = clamp(ePos.y / max(0.0001, uFieldR) * 0.5 + 0.5, 0.0, 1.0);
    else if (uGradMap > 2.5) gt = atan(ePos.y, ePos.x) / 6.2831853 + 0.5;
    vT = gt;
    vec4 mvStart = modelViewMatrix * vec4(sPos, 1.0);
    vec4 mvEnd = modelViewMatrix * vec4(ePos, 1.0);
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
  uniform float uLight; // 1 = light surface (ink-on-paper), 0 = dark (additive glow)
  varying float vParam;
  varying float vT;
  varying float vAccent;
  varying float vSeed;
  varying float vSide;
  varying float vViewDepth;
  void main() {
    vec4 lutc = texture2D(uLUT, vec2(clamp(vT, 0.0, 1.0), 0.5));
    vec3 base = lutc.rgb;
    float lutA = lutc.a; // gradient stop alpha (transparent points fade the field)
    if (vAccent > 0.5 && vAccent < 1.5) base = vec3(0.21, 0.88, 0.48);
    else if (vAccent > 1.5 && vAccent < 2.5) base = vec3(1.0, 0.18, 0.18);
    else if (vAccent > 2.5) base = vec3(1.0, 1.0, 1.0);

    float bright = mix(0.8, 1.18, vParam);
    // light surface: hold emission near 1 so colours stay as ink instead of blowing out
    float emis = mix(uEmission, min(uEmission, 1.05), uLight);
    vec3 lit = base * emis * bright;

    // travelling signal pulse (muted on a light surface — no additive glow there)
    float ph = fract(vParam - uTime * uPulseSpeed + vSeed * uPhase);
    float band = smoothstep(1.0 - uPulseWidth, 1.0, ph);
    lit += base * band * uPulseGain * (1.0 - 0.8 * uLight);

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
    // honour the gradient's per-stop alpha; firm up ink so thin lines read on a light bg
    alpha *= lutA;
    alpha = mix(alpha, clamp(alpha * 1.5, 0.0, 1.0), uLight);
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
  // morph targets reuse the A buffers when there's no morph, so the shader's
  // mix() is a no-op and we never need a second shader variant
  geo.setAttribute('aStartB', new InstancedBufferAttribute(field.segStartB ?? field.segStart, 3))
  geo.setAttribute('aEndB', new InstancedBufferAttribute(field.segEndB ?? field.segEnd, 3))
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
  morphValue,
  mouseValue,
}: {
  field: FieldData
  lut: Texture | null
  drawInValue: { current: number }
  morphValue: { current: number }
  mouseValue: { current: Vector3 }
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
      uMorph: { value: 0 },
      uMouse: { value: new Vector3() },
      uGradMap: { value: 0 },
      uFieldR: { value: 3.2 },
      uLight: { value: 0 },
    }),
    [], // created once; values updated each frame
  )

  const surface = useStore((s) => s.surface)
  useEffect(() => {
    const m = matRef.current
    if (!m) return
    // light surface composites as ink (normal alpha); dark glows (additive)
    m.blending = surface === 'light' ? NormalBlending : AdditiveBlending
    m.needsUpdate = true
  }, [surface])

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
    u.uMorph.value = field.segStartB ? morphValue.current : 0
    u.uMouse.value.copy(mouseValue.current)
    u.uGradMap.value = GRAD_MAP[s.gradMap] ?? 0
    u.uFieldR.value = field.radius
    u.uLight.value = s.surface === 'light' ? 1 : 0
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
