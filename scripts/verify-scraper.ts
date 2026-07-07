// Standalone verification of the Shopify scraper against a live store.
// Run: node --experimental-strip-types scripts/verify-scraper.ts [storeUrl]
import { scrapeStore } from '../src/lib/scraping/shopify.ts'

const url = process.argv[2] ?? 'https://www.allbirds.com'
const info = await scrapeStore(url, 6)

console.log('domain            :', info.domain)
console.log('name              :', info.name)
console.log('instagramHandle   :', info.instagramHandle)
console.log('products found    :', info.products.length)
for (const p of info.products) {
  console.log(`  - ${p.title} | sku=${p.sku} | hero=${p.heroImage ? 'yes' : 'no'} | desc=${p.description.slice(0, 60)}...`)
}

if (info.products.length >= 3 && info.name && info.products.every((p) => p.heroImage)) {
  console.log('\nVERIFY: PASS — brand name, >=3 products, all with hero images.')
  process.exit(0)
} else {
  console.log('\nVERIFY: FAIL — missing name, too few products, or missing hero images.')
  process.exit(1)
}
