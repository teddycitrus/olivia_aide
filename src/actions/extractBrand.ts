import { type ExtractBrand } from 'wasp/server/operations'
import { type Brand } from 'wasp/entities'
import { runExtraction } from '../lib/extractors'
import { extractBrandArgsSchema, parseOrThrow } from '../lib/security/validation'

type Args = { storeUrl: string }

/**
 * Run the extraction pipeline and upsert a Brand row keyed by domain.
 * 30s server budget; every sub-step has its own fallback so this returns a
 * persistable Brand even on partial failure.
 *
 * SSRF validation happens inside scrapeStore (src/lib/scraping/shopify.ts),
 * which is the single normalization+validation point shared by this action
 * AND the MCP extract_brand tool — deliberately not duplicated here, since
 * an earlier duplicate here had a subtly different (buggy) scheme check.
 */
export const extractBrand: ExtractBrand<Args, Brand> = async (args, context) => {
  const { storeUrl } = parseOrThrow(extractBrandArgsSchema, args)

  const dna = await runExtraction(storeUrl)

  const data = {
    storeUrl: dna.storeUrl,
    domain: dna.domain,
    name: dna.name,
    palette: dna.palette as object,
    photoStyle: dna.photoStyle,
    typography: dna.typography as object,
    toneWords: dna.toneWords,
    toneVector: dna.toneVector,
    sourceAssets: dna.sourceAssets as object,
    productHeroes: dna.productHeroes as unknown as object,
  }

  return context.entities.Brand.upsert({
    where: { domain: dna.domain },
    update: data,
    create: data,
  })
}
