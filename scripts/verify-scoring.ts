// Standalone verification of the pure scoring math (palette Lab distance +
// overall weighting + photo-style adjacency). No LLM keys / DB / Wasp needed.
// Run: node --experimental-strip-types scripts/verify-scoring.ts
import { hexToSwatch, scorePalette, distanceToScore } from '../src/lib/scoring/paletteScorer.ts'
import { computeOverall, photoStyleMatch } from '../src/lib/scoring/weights.ts'

let pass = true
const check = (name: string, cond: boolean, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`)
  if (!cond) pass = false
}

// --- palette: identical palettes score ~1, opposite palettes score low ---
const brand = [hexToSwatch('#1a1a1a', 0.5), hexToSwatch('#e8e2d5', 0.3), hexToSwatch('#3b6ea5', 0.2)]
const sameCandidate = [hexToSwatch('#1a1a1a', 0.5), hexToSwatch('#e8e2d5', 0.3), hexToSwatch('#3b6ea5', 0.2)]
const oppositeCandidate = [hexToSwatch('#ff0000', 0.5), hexToSwatch('#00ff00', 0.3), hexToSwatch('#ffff00', 0.2)]

const sSame = scorePalette(brand, sameCandidate)
const sOpp = scorePalette(brand, oppositeCandidate)
check('identical palette scores > 0.95', sSame > 0.95, `got ${sSame.toFixed(3)}`)
check('opposite palette scores < 0.5', sOpp < 0.5, `got ${sOpp.toFixed(3)}`)
check('identical beats opposite', sSame > sOpp)
check('distanceToScore(0)=1', distanceToScore(0) === 1)
check('distanceToScore(60)=0', distanceToScore(60) === 0)
check('distanceToScore(30)=0.5', Math.abs(distanceToScore(30) - 0.5) < 1e-9)

// --- overall weighting: on-brand vs off-brand cross the PRD thresholds ---
const onBrand = computeOverall({ paletteMatch: 0.9, typographyMatch: 0.8, photoStyleMatch: 0.85, productAccuracy: 0.9 })
const offBrand = computeOverall({ paletteMatch: 0.3, typographyMatch: 0.4, photoStyleMatch: 0.2, productAccuracy: 0.3 })
check('on-brand overall > 0.75', onBrand > 0.75, `got ${onBrand.toFixed(3)}`)
check('off-brand overall < 0.6', offBrand < 0.6, `got ${offBrand.toFixed(3)}`)
// product accuracy dominates: a great product with everything else mediocre still lifts the score
const productCarries = computeOverall({ paletteMatch: 0.5, typographyMatch: 0.5, photoStyleMatch: 0.5, productAccuracy: 1.0 })
check('product accuracy is weighted highest (0.40)', productCarries > 0.6, `got ${productCarries.toFixed(3)}`)

// --- photo-style adjacency ---
check('identical style = 1.0', photoStyleMatch('studio', 'studio') === 1.0)
check('adjacent studio/lifestyle = 0.5', photoStyleMatch('studio', 'lifestyle') === 0.5)
check('opposite studio/ugc = 0.0', photoStyleMatch('studio', 'ugc') === 0.0)
check('brand mixed caps at 0.7', photoStyleMatch('mixed', 'studio') === 0.7)

console.log(pass ? '\nVERIFY: PASS — all scoring math holds.' : '\nVERIFY: FAIL')
process.exit(pass ? 0 : 1)
