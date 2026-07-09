import { Text } from '@react-three/drei'
import { configureTextBuilder } from 'troika-three-text'

// Typeset on the main thread instead of troika's default web worker: the
// worker loads its typesetting code via a blob: importScripts call, which
// needs `script-src blob:` in the app's CSP. That's a much bigger CSP
// concession than this handful of short static labels is worth.
configureTextBuilder({ useWorker: false })

/** Subtle in-scene axis labels: X = palette, Y = photo style, Z = product accuracy. */
export function AxisLegend() {
  const props = {
    // Explicit font so troika doesn't fall back to its network unicode-font-resolver
    // call (fetches cdn.jsdelivr.net to pick a covering font for the string), which
    // this app's connect-src CSP blocks.
    font: '/fonts/Outfit.ttf', // troika's font parser doesn't support woff2, unlike the CSS @font-face in Main.css
    fontSize: 0.22,
    fontWeight: 700 as const,
    color: '#F0C020' as const,
    anchorX: 'center' as const,
    anchorY: 'middle' as const,
  }
  return (
    <group>
      <Text position={[3, 0, 0]} {...props}>
        PALETTE
      </Text>
      <Text position={[0, 3, 0]} {...props}>
        PHOTO STYLE
      </Text>
      <Text position={[0, 0, -3.2]} rotation={[0, Math.PI / 2, 0]} {...props}>
        PRODUCT ACCURACY
      </Text>
    </group>
  )
}
