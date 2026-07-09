import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture, Html } from '@react-three/drei'
import * as THREE from 'three'
import { HoverCard } from './HoverCard'
import type { ScoredCandidate } from './ResultsCanvas'

// Map a 0-1 score to a scene coordinate in roughly [-2.6, 2.6].
const axis = (s: number) => (s - 0.5) * 5.2

export function CandidateTile({
  candidate,
  threshold,
  showOnlyPassing,
  onClick,
}: {
  candidate: ScoredCandidate
  threshold: number
  showOnlyPassing: boolean
  onClick: (c: ScoredCandidate) => void
}) {
  const s = candidate.scoring
  const texture = useTexture(candidate.imageUrl)
  const mesh = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const pass = s.onBrandOverall >= threshold
  const target = new THREE.Vector3(axis(s.paletteMatch), axis(s.photoStyleMatch), -axis(s.productAccuracy))
  const size = 0.6 + s.onBrandOverall * 0.9
  const dim = showOnlyPassing && !pass

  useFrame(() => {
    if (!mesh.current) return
    mesh.current.position.lerp(target, 0.08)
    const m = mesh.current.material as THREE.MeshBasicMaterial
    const tint = pass ? new THREE.Color('#1040C0') : new THREE.Color('#D02020')
    // blend texture toward white then toward tint so the image stays legible
    m.color.lerp(new THREE.Color('#ffffff').lerp(tint, 0.45), 0.1)
    m.opacity = dim ? 0.2 : hovered ? 1 : 0.92
  })

  return (
    <mesh
      ref={mesh}
      scale={[size, size, 1]}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'auto'
      }}
      onClick={(e) => {
        e.stopPropagation()
        onClick(candidate)
      }}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} side={THREE.DoubleSide} />
      {hovered && (
        <Html center distanceFactor={8} position={[0, 0.8, 0]} zIndexRange={[100, 0]}>
          <HoverCard candidate={candidate} />
        </Html>
      )}
    </mesh>
  )
}
