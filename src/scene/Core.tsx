import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, ShaderMaterial } from 'three'
import { snap } from '../store/store'

const VERT = /* glsl */ `
  varying vec2 vUv;
  uniform float uSize;
  void main() {
    vUv = uv - 0.5;
    vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    mv.xy += (uv - 0.5) * uSize;
    gl_Position = projectionMatrix * mv;
  }
`

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uEmission;
  void main() {
    float d = length(vUv);
    float halo = smoothstep(0.5, 0.0, d);
    float core = smoothstep(0.13, 0.0, d);
    vec3 col = uColor * (halo * halo * 0.7 + core * 2.4) * uEmission;
    float alpha = halo * halo + core;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(col, alpha);
  }
`

export function Core() {
  const glow = useRef<ShaderMaterial>(null)
  const inner = useRef<ShaderMaterial>(null)

  const glowU = useMemo(
    () => ({
      uSize: { value: 1.7 },
      uColor: { value: new Color('#ffcdae') },
      uEmission: { value: 0.95 },
    }),
    [],
  )
  const innerU = useMemo(
    () => ({
      uSize: { value: 0.42 },
      uColor: { value: new Color('#ffd9c2') },
      uEmission: { value: 1.0 },
    }),
    [],
  )

  useFrame(() => {
    const s = snap()
    // warm, restrained core — avoids the blown-out white blob on the black field
    if (glow.current) {
      glow.current.uniforms.uSize.value = 1.7 * s.coreSize
      glow.current.uniforms.uEmission.value = s.emission * 0.7
    }
    if (inner.current) {
      inner.current.uniforms.uSize.value = 0.42 * s.coreSize
      inner.current.uniforms.uEmission.value = s.emission * 0.85
    }
  })

  return (
    <group renderOrder={0}>
      <mesh frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={glow}
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={glowU}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={inner}
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={innerU}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
