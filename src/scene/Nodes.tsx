import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  NormalBlending,
  ShaderMaterial,
  Sphere,
  Texture,
  Vector3,
} from 'three'
import type { FieldData } from '../lib/geometry'
import { snap, useStore } from '../store/store'

const GRAD_MAP: Record<string, number> = { fiber: 0, radial: 1, linear: 2, angle: 3 }

const VERT = /* glsl */ `
  attribute vec3 aOffset;
  attribute vec3 aOffsetB;
  attribute float aT;
  attribute float aAccent;
  attribute float aScale;
  uniform float uDotSize;
  uniform float uMorph;
  uniform vec3 uMouse; // xy = cursor in field space, z = strength (0 = off)
  uniform float uGradMap; // 0 fiber, 1 radial, 2 linear(y), 3 angle
  uniform float uFieldR;
  varying vec2 vUv;
  varying float vT;
  varying float vAccent;
  varying float vViewDepth;
  void main() {
    vUv = position.xy;
    vAccent = aAccent;
    vec3 pos = mix(aOffset, aOffsetB, uMorph);
    // the cursor plays with the tip dots — push them away when near (matches Fibers)
    if (abs(uMouse.z) > 0.001) {
      vec2 md = pos.xy - uMouse.xy;
      float mf = smoothstep(2.3, 0.0, length(md));
      pos.xy += normalize(md + vec2(1e-4)) * mf * uMouse.z;
    }
    // gradient sample coordinate: per-node (default) or derived from position
    float gt = aT;
    if (uGradMap > 0.5 && uGradMap < 1.5) gt = clamp(length(pos) / max(0.0001, uFieldR), 0.0, 1.0);
    else if (uGradMap > 1.5 && uGradMap < 2.5) gt = clamp(pos.y / max(0.0001, uFieldR) * 0.5 + 0.5, 0.0, 1.0);
    else if (uGradMap > 2.5) gt = atan(pos.y, pos.x) / 6.2831853 + 0.5;
    vT = gt;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vViewDepth = -mv.z;
    mv.xy += position.xy * aScale * uDotSize;
    gl_Position = projectionMatrix * mv;
  }
`

const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uLUT;
  uniform float uEmission;
  uniform float uDrawIn;
  uniform float uAtmo;
  uniform float uCamDist;
  uniform float uFogR;
  uniform float uLight;
  varying vec2 vUv;
  varying float vT;
  varying float vAccent;
  varying float vViewDepth;
  void main() {
    vec4 lutc = texture2D(uLUT, vec2(clamp(vT, 0.0, 1.0), 0.5));
    vec3 base = lutc.rgb;
    float lutA = lutc.a;
    if (vAccent > 0.5 && vAccent < 1.5) base = vec3(0.21, 0.95, 0.5);
    else if (vAccent > 1.5 && vAccent < 2.5) base = vec3(1.0, 0.2, 0.2);
    else if (vAccent > 2.5) base = vec3(1.0, 1.0, 1.0);

    float d = length(vUv);
    float soft = smoothstep(0.5, 0.0, d);
    float core = smoothstep(0.18, 0.0, d);
    float reveal = smoothstep(0.98, 1.12, uDrawIn);

    float near = uCamDist - uFogR * 1.3;
    float far = uCamDist + uFogR * 1.75;
    float df = clamp((far - vViewDepth) / max(0.001, far - near), 0.0, 1.0);
    df = mix(1.0, df * df, uAtmo);

    float emis = mix(uEmission, min(uEmission, 1.05), uLight);
    vec3 color = base * emis * (soft * 0.4 + core * 1.25) * df;
    float alpha = soft * reveal * mix(1.0, df, uAtmo * 0.6) * lutA;
    alpha = mix(alpha, clamp(alpha * 1.5, 0.0, 1.0), uLight);
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(color, alpha);
  }
`

const QUAD = new Float32Array([
  -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
])

function buildGeometry(field: FieldData): InstancedBufferGeometry {
  const geo = new InstancedBufferGeometry()
  geo.setAttribute('position', new BufferAttribute(QUAD, 3))
  geo.setAttribute('aOffset', new InstancedBufferAttribute(field.nodePos, 3))
  geo.setAttribute('aOffsetB', new InstancedBufferAttribute(field.nodePosB ?? field.nodePos, 3))
  geo.setAttribute('aT', new InstancedBufferAttribute(field.nodeT, 1))
  geo.setAttribute('aAccent', new InstancedBufferAttribute(field.nodeAccent, 1))
  geo.setAttribute('aScale', new InstancedBufferAttribute(field.nodeSize, 1))
  geo.instanceCount = field.count
  geo.boundingSphere = new Sphere(new Vector3(0, 0, 0), field.radius * 3)
  return geo
}

export function Nodes({
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
  const matRef = useRef<ShaderMaterial>(null)
  const geometry = useMemo(() => buildGeometry(field), [field])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(
    () => ({
      uLUT: { value: lut },
      uEmission: { value: 1.5 },
      uDotSize: { value: 0.16 },
      uDrawIn: { value: 1.2 },
      uAtmo: { value: 0.7 },
      uCamDist: { value: 8.5 },
      uFogR: { value: 3.2 },
      uMorph: { value: 0 },
      uMouse: { value: new Vector3() },
      uGradMap: { value: 0 },
      uFieldR: { value: 3.2 },
      uLight: { value: 0 },
    }),
    [],
  )

  const surface = useStore((s) => s.surface)
  useEffect(() => {
    const m = matRef.current
    if (!m) return
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
    m.uniforms.uEmission.value = s.emission * 0.62
    m.uniforms.uDotSize.value = 0.11 * s.dotSize
    m.uniforms.uDrawIn.value = drawInValue.current
    m.uniforms.uAtmo.value = s.atmosphere
    m.uniforms.uCamDist.value = state.camera.position.length()
    m.uniforms.uFogR.value = field.radius
    m.uniforms.uMorph.value = field.nodePosB ? morphValue.current : 0
    m.uniforms.uMouse.value.copy(mouseValue.current)
    m.uniforms.uGradMap.value = GRAD_MAP[s.gradMap] ?? 0
    m.uniforms.uFieldR.value = field.radius
    m.uniforms.uLight.value = s.surface === 'light' ? 1 : 0
  })

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={2}>
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
