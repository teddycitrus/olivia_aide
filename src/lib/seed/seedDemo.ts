import type { PrismaClient } from '@prisma/client'

// Static demo brands so "click Allbirds -> see DNA + scored candidates" is <2s
// and works even without API keys. Real extraction (with keys) overwrites these
// on demand via the extractBrand action (upsert keyed by domain).

type Sw = { hex: string; labL: number; labA: number; labB: number; weight: number }
const sw = (hex: string, weight: number): Sw => ({ hex, labL: 0, labA: 0, labB: 0, weight })

const DEMO = [
  {
    domain: 'allbirds.com',
    storeUrl: 'https://www.allbirds.com',
    name: 'Allbirds',
    palette: { swatches: [sw('#2b2b2b', 0.34), sw('#e8e2d5', 0.27), sw('#8a9a8b', 0.18), sw('#c9b8a3', 0.12), sw('#3b6ea5', 0.09)] },
    photoStyle: 'studio',
    typography: { family: 'sans-serif', weight: 'medium', casing: 'sentence' },
    toneWords: ['natural', 'comfortable', 'understated', 'earthy', 'considered'],
    heroes: [
      'https://cdn.shopify.com/s/files/1/1104/4168/files/AB_Product.jpg',
    ],
  },
  {
    domain: 'haus.com',
    storeUrl: 'https://haus.com',
    name: 'Haus',
    palette: { swatches: [sw('#e4573c', 0.3), sw('#f3e9dc', 0.26), sw('#7d3b2e', 0.2), sw('#d9a441', 0.14), sw('#2a2a2a', 0.1)] },
    photoStyle: 'lifestyle',
    typography: { family: 'serif', weight: 'regular', casing: 'title' },
    toneWords: ['warm', 'playful', 'aperitivo', 'social', 'low-key'],
    heroes: [],
  },
  {
    domain: 'awaytravel.com',
    storeUrl: 'https://www.awaytravel.com',
    name: 'Away',
    palette: { swatches: [sw('#1f3a5f', 0.32), sw('#f5f4f0', 0.28), sw('#c7d0d8', 0.18), sw('#d98b6a', 0.12), sw('#2a2a2a', 0.1)] },
    photoStyle: 'studio',
    typography: { family: 'sans-serif', weight: 'bold', casing: 'title' },
    toneWords: ['crisp', 'modern', 'reliable', 'wander', 'polished'],
    heroes: [],
  },
]

export const seedDemo = async (prisma: PrismaClient) => {
  for (const b of DEMO) {
    const data = {
      storeUrl: b.storeUrl,
      domain: b.domain,
      name: b.name,
      palette: b.palette as object,
      photoStyle: b.photoStyle,
      typography: b.typography as object,
      toneWords: b.toneWords,
      toneVector: [] as number[],
      sourceAssets: { pdpImages: b.heroes, igImages: [] } as object,
      productHeroes: b.heroes.map((url) => ({ url, sku: 'demo', embedding: [] as number[] })) as unknown as object,
    }
    await prisma.brand.upsert({ where: { domain: b.domain }, update: data, create: data })
  }
  console.log(`Seeded ${DEMO.length} demo brands.`)
}
