import { HttpError } from 'wasp/server'
import { type GetBrand } from 'wasp/server/operations'
import { type Brand, type Candidate, type Scoring } from 'wasp/entities'
import { z } from 'zod'
import { brandIdSchema, parseOrThrow } from '../lib/security/validation'

type Args = { id: string }
export type BrandWithCandidates = Brand & { candidates: (Candidate & { scoring: Scoring | null })[] }

const getBrandArgsSchema = z.object({ id: brandIdSchema })

export const getBrand: GetBrand<Args, BrandWithCandidates> = async (args, context) => {
  const { id } = parseOrThrow(getBrandArgsSchema, args)
  const brand = await context.entities.Brand.findUnique({
    where: { id },
    include: { candidates: { include: { scoring: true }, orderBy: { createdAt: 'asc' } } },
  })
  if (!brand) throw new HttpError(404, 'brand not found')
  return brand as BrandWithCandidates
}
