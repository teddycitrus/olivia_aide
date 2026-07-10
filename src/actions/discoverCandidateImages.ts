import { type DiscoverCandidateImages } from 'wasp/server/operations'
import { discoverImagesFromPage } from '../lib/scraping/discoverImages'
import { discoverCandidateImagesArgsSchema, parseOrThrow } from '../lib/security/validation'

type Args = { pageUrl: string }

/** Auto-discover candidate ad-creative image URLs from a page instead of the user pasting each one by hand. */
export const discoverCandidateImages: DiscoverCandidateImages<Args, string[]> = async (args) => {
  const { pageUrl } = parseOrThrow(discoverCandidateImagesArgsSchema, args)
  return discoverImagesFromPage(pageUrl)
}
