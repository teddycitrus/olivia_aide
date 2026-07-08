import { HttpError } from 'wasp/server'
import { type ScoreCandidate } from 'wasp/server/operations'
import { type Scoring } from 'wasp/entities'
import { scoreCandidateImage, type BrandLike } from '../lib/scoring'
import { scoreCandidateArgsSchema, parseOrThrow } from '../lib/security/validation'

type Args = { brandId: string; imageUrl: string }

/** Score a single candidate synchronously (12s budget) and persist Candidate + Scoring. */
export const scoreCandidate: ScoreCandidate<Args, Scoring> = async (args, context) => {
  const { brandId, imageUrl } = parseOrThrow(scoreCandidateArgsSchema, args)

  const brand = await context.entities.Brand.findUnique({ where: { id: brandId } })
  if (!brand) throw new HttpError(404, 'brand not found')

  const candidate = await context.entities.Candidate.create({ data: { brandId, imageUrl } })

  const result = await scoreCandidateImage(brand as unknown as BrandLike, imageUrl)

  return context.entities.Scoring.upsert({
    where: { candidateId: candidate.id },
    update: result,
    create: { candidateId: candidate.id, ...result },
  })
}
