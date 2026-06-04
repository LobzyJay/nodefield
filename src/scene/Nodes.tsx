import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  ShaderMaterial,
  Sphere,
  Texture,
  Vector3,
} from 'three'
import type { FieldData } from '../lib/geometry'
import { snap } from '../store/store'

const VERT = /* glsl */ `
  attribute vec3 aOffset;
  attribute vec3 aOffsetB;
  attribute float aT;
  attribute float aAccent;
  attribute float aScale;
  uniform float uDotSize;
  uniform float uMorph;
  varying vec2 vUv;
  varying float vT;
  varying float vAccent;
  varying float vViewDepth;
  void main() {
    vUv = position.xy;
    vT = aT;
    vAccent = aAccent;
    vec3 pos = mix(aOffset, aOffsetB, uMorph);
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
  varying vec2 vUv;
  varying float vT;
  varying float vAccent;
  varying float vViewDepth;
  void main() {
    vec3 base = texture2D(uLUT, vec2(clamp(vT, 0.0, 1.0), 0.5)).rgb;
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

    vec3 color = base * uEmission * (soft * 0.4 + core * 1.25) * df;
    float alpha = soft * reveal * mix(1.0, df, uAtmo * 0.6);
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
}: {
  field: FieldData
  lut: Texture | null
  drawInValue: { current: number }
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
    }),
    [],
  )

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
    m.uniforms.uMorph.value = field.nodePosB ? s.morph : 0
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
