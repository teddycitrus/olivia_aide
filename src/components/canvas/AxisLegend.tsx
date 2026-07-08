import { Text } from '@react-three/drei'

/** Subtle in-scene axis labels: X = palette, Y = photo style, Z = product accuracy. */
export function AxisLegend() {
  const props = { fontSize: 0.22, color: '#6b6b7b' as const, anchorX: 'center' as const, anchorY: 'middle' as const }
  return (
    <group>
      <Text position={[3, 0, 0]} {...props}>
        palette →
      </Text>
      <Text position={[0, 3, 0]} {...props}>
        photo style ↑
      </Text>
      <Text position={[0, 0, -3.2]} rotation={[0, Math.PI / 2, 0]} {...props}>
        product accuracy ⊙
      </Text>
    </group>
  )
}
