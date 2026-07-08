import { runExtraction } from '../extractors'
import { scoreCandidateImage, type BrandLike } from '../scoring'
import { extractBrandArgsSchema, scoreCandidateArgsSchema, brandIdSchema, parseOrThrow } from '../security/validation'

// Minimal shape of the Wasp entity context the MCP tools operate on.
export type McpContext = {
  entities: {
    Brand: any
    Candidate: any
    Scoring: any
  }
}

export const TOOL_DEFS = [
  {
    name: 'extract_brand',
    description:
      "Extract a brand's visual DNA from a Shopify store URL. Returns palette, photo style, typography, tone words.",
    inputSchema: { type: 'object', properties: { storeUrl: { type: 'string' } }, required: ['storeUrl'] },
  },
  {
    name: 'score_candidate',
    description:
      "Score a candidate image against a brand's DNA on 5 axes. Returns scores + explanation.",
    inputSchema: {
      type: 'object',
      properties: { brandId: { type: 'string' }, imageUrl: { type: 'string' } },
      required: ['brandId', 'imageUrl'],
    },
  },
  {
    name: 'list_brands',
    description: 'List all brands that have been extracted.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_brand',
    description: 'Get a single extracted brand by id.',
    inputSchema: { type: 'object', properties: { brandId: { type: 'string' } }, required: ['brandId'] },
  },
]

export async function callTool(name: string, args: Record<string, unknown>, context: McpContext): Promise<unknown> {
  switch (name) {
    case 'extract_brand': {
      const { storeUrl } = parseOrThrow(extractBrandArgsSchema, args)
      const dna = await runExtraction(storeUrl)
      const data = {
        storeUrl: dna.storeUrl,
        domain: dna.domain,
        name: dna.name,
        palette: dna.palette,
        photoStyle: dna.photoStyle,
        typography: dna.typography,
        toneWords: dna.toneWords,
        toneVector: dna.toneVector,
        sourceAssets: dna.sourceAssets,
        productHeroes: dna.productHeroes,
      }
      return context.entities.Brand.upsert({ where: { domain: dna.domain }, update: data, create: data })
    }
    case 'score_candidate': {
      const { brandId, imageUrl } = parseOrThrow(scoreCandidateArgsSchema, args)
      const brand = await context.entities.Brand.findUnique({ where: { id: brandId } })
      if (!brand) throw new Error('brand not found')
      const candidate = await context.entities.Candidate.create({
        data: { brandId: brand.id, imageUrl },
      })
      const scoring = await scoreCandidateImage(brand as BrandLike, imageUrl)
      return context.entities.Scoring.upsert({
        where: { candidateId: candidate.id },
        update: scoring,
        create: { candidateId: candidate.id, ...scoring },
      })
    }
    case 'list_brands':
      return context.entities.Brand.findMany({ orderBy: { createdAt: 'desc' } })
    case 'get_brand': {
      const brandId = parseOrThrow(brandIdSchema, args.brandId)
      return context.entities.Brand.findUnique({ where: { id: brandId } })
    }
    default:
      throw new Error(`unknown tool: ${name}`)
  }
}
