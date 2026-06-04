import { Bloom, DotScreen, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { useStore } from '../store/store'

export function Effects() {
  const bloomIntensity = useStore((s) => s.bloomIntensity)
  const bloomThreshold = useStore((s) => s.bloomThreshold)
  const grain = useStore((s) => s.grain)
  const vignette = useStore((s) => s.vignette)
  const halftone = useStore((s) => s.halftone)

  return (
    <EffectComposer multisampling={4}>
      <Bloom
        mipmapBlur
        intensity={bloomIntensity}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.22}
        radius={0.75}
      />
      {halftone ? (
        <DotScreen blendFunction={BlendFunction.OVERLAY} angle={1.57} scale={0.9} />
      ) : (
        <></>
      )}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Noise blendFunction={BlendFunction.OVERLAY} opacity={grain * 6} premultiply />
      <Vignette eskil={false} offset={0.32} darkness={vignette} />
    </EffectComposer>
  )
}
