import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CandidateTile } from './CandidateTile'
import { AxisLegend } from './AxisLegend'

export type Scoring = {
  paletteMatch: number
  typographyMatch: number
  photoStyleMatch: number
  productAccuracy: number
  onBrandOverall: number
  explanation: string
  matchedHero: string | null
}
export type ScoredCandidate = { candidateId: string; imageUrl: string; scoring: Scoring }

export function ResultsCanvas({
  candidates,
  threshold,
  showOnlyPassing,
  onSelect,
}: {
  candidates: ScoredCandidate[]
  threshold: number
  showOnlyPassing: boolean
  onSelect: (c: ScoredCandidate) => void
}) {
  return (
    <Canvas camera={{ position: [4.5, 3, 6], fov: 45 }} dpr={[1, 2]} className="h-full w-full">
      <color attach="background" args={['#0b0b0f']} />
      <ambientLight intensity={0.8} />
      <Suspense fallback={null}>
        {candidates.map((c) => (
          <CandidateTile
            key={c.candidateId}
            candidate={c}
            threshold={threshold}
            showOnlyPassing={showOnlyPassing}
            onClick={onSelect}
          />
        ))}
        <AxisLegend />
      </Suspense>
      <gridHelper args={[10, 10, '#1c1c28', '#14141c']} position={[0, -2.8, 0]} />
      <OrbitControls enablePan enableZoom enableRotate makeDefault />
    </Canvas>
  )
}
