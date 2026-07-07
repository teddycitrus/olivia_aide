# Brand-Fit Scorer — PRD

A weekend-buildable tool that extracts a DTC brand's visual identity from their Shopify store and scores any candidate ad/creative image against that identity on 5 axes. Built specifically to impress the Cresva team (`shubham@cresva.ai`) — positioned as the missing eval layer for their Olivia creative agent.

Every stack decision below is optimized for one thing: **when Shubham opens the repo, he immediately sees that the applicant already speaks Cresva's dialect.**

## Elevator pitch

Paste a Shopify store URL. In under 30 seconds the tool extracts the brand's DNA (palette, typography, photo style, tone) and displays it. Upload candidate ad images. Each gets scored on 5 axes with a human-readable explanation. Off-brand variants filter out automatically. Same input tokens, much better human-per-review yield. Bonus: the scorer is also exposed as an MCP server so any agent (Olivia included) can call it as a tool.

## Success criteria

The build is done when:

1. Given `https://www.allbirds.com` (or any Shopify store), the app produces a Brand DNA card in <30s that a human would nod at.
2. Given 10 candidate images (4 obviously off-brand, 6 on-brand), the scorer flags the 4 with `onBrandOverall < 0.6` and the 6 with `> 0.75`.
3. The results view renders as a WebGL mood board — each candidate is a tile in a Three.js scene, colored by pass/fail, draggable, with hover-to-inspect.
4. Scoring results stream in progressively (SSE) rather than blocking on batch completion.
5. Exposed as an MCP server (`brand-fit-scorer` tool) that Claude Code can invoke locally.
6. Deploys to Vercel with 3 env vars (Anthropic, Google, OpenAI keys) + DB URL.
7. README pitches the project directly to Cresva and links a live demo.

## Non-goals

- No auth / no multi-tenancy. Single-user demo.
- No integration with real Meta/TikTok/Google Ads APIs.
- No historical performance data (that's the separate "Winner-Learning Loop" project — flag as v2 in the README).
- No fine-tuning of any model.
- No video, no carousels, no multi-frame handling.
- No Cresva OAuth / real API integration. This is a standalone artifact.

## Tech stack

Pick these exactly. The specific choices are signal, not detail.

- **Framework:** [Wasp](https://wasp.sh) (`.wasp` config-driven, React + Node.js + Prisma under the hood).
  - Why: Cresva's stack. Job description explicitly names it. Zero ambiguity signal.
- **UI:** Tailwind + shadcn/ui components.
- **DB:** Postgres via Neon (serverless) + Prisma (Wasp uses Prisma natively).
- **LLM routing:**
  - `@anthropic-ai/sdk` — **Claude Sonnet 4.6** for reasoning + explanation generation.
  - `@google/generative-ai` — **Gemini 2.5 Flash** for cheap/fast vision classification (photo style, typography).
  - `openai` — **GPT-5** (or current flagship) for product accuracy comparison (its grounding on physical-object identity is strongest).
- **Image processing:** `sharp` (server-side resize) + `node-vibrant` (palette extraction) + `chroma-js` (Lab color space math).
- **Vector embeddings:** OpenAI `text-embedding-3-large` for tone-vector storage; CLIP via Replicate for image similarity (multi-hero product accuracy).
- **WebGL canvas:** `three` + `@react-three/fiber` + `@react-three/drei` for the results mood board.
- **Streaming:** Server-Sent Events for progressive scoring updates.
- **MCP server:** `@modelcontextprotocol/sdk` for exposing the scorer as an MCP tool.
- **Deploy:** Vercel (Wasp deploys to it fine) with Neon-hosted Postgres.
- **Package manager:** pnpm.
- **Local dev:** Cursor + Claude Code. Commit history should reflect agent-driven development — this is itself a signal.

## Environment variables

```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_GENERATIVE_AI_API_KEY=...
REPLICATE_API_TOKEN=r8_...
DATABASE_URL=postgres://...
```

## Data model (Prisma via Wasp)

```prisma
model Brand {
  id             String     @id @default(cuid())
  createdAt      DateTime   @default(now())
  storeUrl       String
  domain         String     @unique
  name           String
  palette        Json       // { swatches: [{ hex: "#ff88aa", labL: 65.2, labA: 22.1, labB: -3.4, weight: 0.34 }, ...] }
  photoStyle     String     // "studio" | "lifestyle" | "ugc" | "mixed"
  typography     Json       // { family: "sans-serif" | "serif" | "display", weight, casing }
  toneWords      String[]   // ["bold", "playful", "minimal"] — max 5
  toneVector     Float[]    // 3072-dim embedding of concatenated tone words + brand description
  sourceAssets   Json       // { pdpImages: string[], igImages: string[] }
  productHeroes  Json       // Array of { url, sku, embedding: Float[] } — CLIP embeddings of every PDP hero
  candidates     Candidate[]
}

model Candidate {
  id        String   @id @default(cuid())
  brandId   String
  brand     Brand    @relation(fields: [brandId], references: [id])
  imageUrl  String
  createdAt DateTime @default(now())
  scoring   Scoring?
}

model Scoring {
  id              String    @id @default(cuid())
  candidateId     String    @unique
  candidate       Candidate @relation(fields: [candidateId], references: [id])
  paletteMatch    Float     // 0-1, computed in Lab color space
  typographyMatch Float     // 0-1
  photoStyleMatch Float     // 0-1
  productAccuracy Float     // 0-1, best-match across all PDP hero embeddings
  onBrandOverall  Float     // 0-1, weighted average
  explanation     String    // 1-2 sentences, human-readable
  matchedHero     String?   // URL of the best-matching PDP hero (for UI display)
  createdAt       DateTime  @default(now())
}
```

## Wasp config (excerpt)

```wasp
app brandFitScorer {
  wasp: { version: "^0.14.0" },
  title: "Brand-Fit Scorer",
  head: [
    "<meta property='og:title' content='Brand-Fit Scorer for Olivia' />"
  ]
}

route Landing { path: "/", to: LandingPage }
page LandingPage { component: import { LandingPage } from "@src/pages/Landing" }

route BrandDetail { path: "/brands/:id", to: BrandDetailPage }
page BrandDetailPage { component: import { BrandDetailPage } from "@src/pages/BrandDetail" }

action extractBrand {
  fn: import { extractBrand } from "@src/actions/extractBrand",
  entities: [Brand]
}

action scoreCandidate {
  fn: import { scoreCandidate } from "@src/actions/scoreCandidate",
  entities: [Brand, Candidate, Scoring]
}

api streamScoring {
  fn: import { streamScoringHandler } from "@src/api/streamScoring",
  httpRoute: (GET, "/api/stream-scoring/:brandId"),
  entities: [Brand, Candidate, Scoring]
}

api mcpServer {
  fn: import { mcpServerHandler } from "@src/api/mcpServer",
  httpRoute: (POST, "/mcp"),
  entities: [Brand, Candidate, Scoring]
}
```

## API surface

### Wasp action: `extractBrand({ storeUrl })`

Runs the extraction pipeline, persists a Brand row. Timeout budget: 30s server-side. If it hits 25s and hasn't finished, return partial results with best-effort defaults.

### Wasp action: `scoreCandidate({ brandId, imageUrl })`

Scores a single candidate synchronously. Timeout budget: 12s.

### `GET /api/stream-scoring/:brandId?imageUrls[]=...`

Server-Sent Events endpoint. Scores each candidate in parallel (concurrency cap 3), streams each result as an `event: score` frame as it completes. Frontend consumes with `EventSource`.

Payload per frame:
```json
{
  "type": "score",
  "candidateId": "...",
  "imageUrl": "...",
  "scoring": { "paletteMatch": 0.88, "..." }
}
```

Terminal frame: `event: done`.

### `POST /mcp`

MCP server surface. Tools exposed:
- `extract_brand(storeUrl: string) -> Brand`
- `score_candidate(brandId: string, imageUrl: string) -> Scoring`
- `list_brands() -> Brand[]`
- `get_brand(brandId: string) -> Brand`

The MCP endpoint runs the standard MCP handshake and tool-invocation protocol. Include a `mcp.json` in the repo root so Claude Code can add the server locally with one command.

## UI

### Route: `/` (Landing)

- Hero: "Score any ad against your brand's DNA. In 30 seconds."
- Sub-hero: one-line pitch mentioning Olivia by name.
- Single input: Shopify store URL. On submit → skeleton loading state → redirect to `/brands/[id]`.
- Below the fold: 3 pre-seeded example brands (Allbirds, Haus, Away) as cards. Clicking one skips extraction and loads the pre-seeded DB row.
- Footer: link to GitHub, link to the MCP setup instructions.

### Route: `/brands/[id]`

Layout: 2-column on desktop (35% / 65%), stacked on mobile.

**Left column (35%) — Brand DNA Card:**
- Palette: 5 color swatches with hex codes and weight bars.
- Typography: rendered sample text in extracted family/weight/casing.
- Photo Style: badge (studio | lifestyle | UGC | mixed) with 3 example thumbnails.
- Tone Words: 5 pill-style tags.
- Source Assets: collapsible grid of images used for extraction.
- "Regenerate DNA" button (re-runs extraction).

**Right column (65%) — WebGL Results Canvas:**

This is the visual centerpiece. Three.js scene rendered via `@react-three/fiber`.

- Fullscreen `<Canvas>` occupying the right 65% of the viewport.
- Every candidate renders as a floating textured plane (the image itself) at a 3D position determined by its scores:
  - X axis: `paletteMatch`
  - Y axis: `photoStyleMatch`
  - Z axis: `productAccuracy` (deeper = more accurate)
- Tile size proportional to `onBrandOverall`.
- Tint color: green if pass (>= threshold), red if fail.
- Hover on a tile: raycasting shows a floating card with all 5 scores + explanation.
- Click on a tile: opens a modal with the full candidate image, matched PDP hero, and side-by-side sub-scores.
- Camera controls: `OrbitControls` from drei. Users can rotate/zoom the mood board.

**Below the canvas:**
- Threshold slider (0.0–1.0, default 0.7). Dragging retints tiles in real time.
- Toggle: "Show only passing" — passing tiles float forward, failing tiles fade to 20% opacity.
- Drop zone / URL input for adding new candidates.
- Live progress indicator during streaming ("scoring 4 of 10...").

## Model routing (`lib/ai/*`)

| Task                              | Model                          | Why                                                                 |
| --------------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| Photo style classification        | Gemini 2.5 Flash               | Cheap, fast, vision is strong enough for 4-way classification.      |
| Typography extraction             | Gemini 2.5 Flash               | Same reason. Structured JSON output, low cost per image.            |
| Tone extraction from copy         | Claude Sonnet 4.6              | Best at nuanced qualitative language extraction.                    |
| Product accuracy comparison       | GPT-5 (or current flagship)    | Strongest at physical-object grounding + fine-detail comparison.    |
| Multi-hero image embedding        | Replicate CLIP (ViT-L/14)      | Standard for image similarity. Cheap. Fast.                         |
| Explanation generation            | Claude Sonnet 4.6              | Best at concise, specific, human-toned prose without generic filler.|
| Tone vector embedding             | OpenAI `text-embedding-3-large`| 3072-dim, well-supported, cheap.                                    |

## Extraction pipeline (`lib/extractors/index.ts`)

Given `storeUrl`, in order:

1. **Fetch homepage HTML** (`lib/scraping/shopify.ts`). Timeout 5s. Parse for collection URLs, OG brand name, IG handle.
2. **Fetch top 6 PDPs.** Timeout 3s each, parallel. Extract hero image, title, description, SKU/handle.
3. **Fetch IG (optional).** If handle found and IG oEmbed reachable, get 12 most recent post images.
4. **Assemble asset set:** 18–24 images total. Downsize to 512px longest side via `sharp`.
5. **Extract palette:** `node-vibrant`, k-means (k=5), weight by coverage, convert hex→Lab.
6. **Extract photo style:** Gemini Flash on 6 sampled assets, majority vote.
7. **Extract typography:** Gemini pre-filter for visible text, then extract family/weight/casing.
8. **Extract tone:** concat titles+descriptions, Claude tone prompt.
9. **Embed tone vector:** OpenAI embedding of tone-words + brand description.
10. **Embed product heroes:** CLIP-embed every PDP hero via Replicate.
11. **Persist** Brand row.

## Scoring pipeline (`lib/scoring/index.ts`)

Given `brand: Brand` and `imageUrl: string`:

1. Fetch and preprocess candidate with `sharp`, resize to 512px.
2. **Palette match:** candidate 5 dominant colors → Lab; nearest brand swatch by CIE76; weighted geometric mean. Return 0-1 (1.0 = dist 0, 0.0 = dist > 60).
3. **Photo style match:** Gemini classifies; 1.0 identical, 0.5 adjacent, 0.0 opposite; cap 0.7 if brand is mixed.
4. **Typography match:** 0.5 neutral if no text; else score per dimension.
5. **Product accuracy:** CLIP-embed candidate; cosine vs every hero; take max. >0.8 → GPT refine; 0.5-0.8 → CLIP sim; <0.5 → 0.7 neutral. Persist `matchedHero`.
6. **Overall:** palette 0.20, typography 0.15, photoStyle 0.25, productAccuracy 0.40.
7. **Explanation:** single Claude call → 1-2 sentences.
8. **Persist** Scoring row.

Concurrency: steps 2–5 parallel. Step 7 waits.

## Prompt templates

Keep these in `lib/ai/*.ts` as named exports. Never inline prompts in business logic.

### `photoStylePrompt` (Gemini)
```
You are classifying the photography style of a brand's visual identity.
The candidate images are attached. Classify them into ONE of:
- "studio": clean seamless backgrounds, controlled lighting, product-only or model with product
- "lifestyle": natural environments, models using the product in context, editorial feel
- "ugc": phone-camera aesthetic, casual framing, low production value, feels like a customer took it
- "mixed": genuinely evenly split, no dominant style
Return only the single word, no explanation.
```

### `typographyExtractionPrompt` (Gemini)
```
Analyze the visible text in this brand asset. Return JSON:
{ "family": "sans-serif"|"serif"|"display"|"mono"|null, "weight": "light"|"regular"|"medium"|"bold"|"heavy"|null, "casing": "sentence"|"title"|"upper"|"lower"|null }
Base the decision on the dominant text treatment (largest / most prominent).
If no visible text, return all nulls. Return only the JSON.
```

### `toneExtractionPrompt` (Claude)
```
Read this product copy and extract the brand's tone as 5 single-word adjectives.
Rules: Concrete, not vague. No commas. No sentences. Return as a JSON array of 5 strings.
Product copy: {PRODUCT_COPY}
```

### `productAccuracyRefinementPrompt` (GPT-5)
```
Two images are attached. The first is the brand's canonical product hero. The second is a candidate ad image that likely depicts the same product.
Score the product accuracy from 0.0 to 1.0:
- 1.0: same product, correct color/shape/branding
- 0.7: recognizably similar, minor errors
- 0.4: clearly different variant/SKU of same line
- 0.0: entirely different product
Return only the number.
```

### `explanationPrompt` (Claude)
```
Given: Brand DNA {BRAND_DNA_JSON}; Sub-scores palette={p}, typography={t}, photoStyle={s}, productAccuracy={pa}, overall={o}; Candidate image attached.
Write a 1-2 sentence explanation of the score. Address the founder as "you".
Rules: Be specific, reference concrete visual attributes. If overall>0.75 lead with strongest point. If overall<0.6 lead with biggest miss. No em dashes. No "not just X, it's Y" quips.
Return only the 1-2 sentences.
```

## MCP server (`lib/mcp/*`)

Expose the scoring surface as an MCP server. Tools: `extract_brand`, `score_candidate`, `list_brands`, `get_brand`. Include `mcp.json` in repo root; support both stdio (local) and HTTP (remote demo).

## Milestones

- **M1** — Wasp scaffold + extraction. Accept: paste Allbirds → Brand DNA card in <30s with palette/style/typography/tone + stored hero embeddings.
- **M2** — Single-candidate scoring. Accept: 1 on-brand + 1 off-brand → correctly-signed scores + explanations.
- **M3** — WebGL results canvas. Accept: 5+ tiles positioned by scores, hover reveals scores, threshold retints at 60fps.
- **M4** — Streaming + batch. Accept: 10 candidates stream in <45s, no rate-limit errors.
- **M5** — MCP server + polish + deploy. Accept: `claude mcp add` works against deployed URL; `extract_brand`/`score_candidate` invocable.

## Design principles

- Every LLM call: 10s timeout + graceful fallback (neutral score, log to console).
- Every scoring axis returns valid 0-1 even on partial extraction failure.
- No LLM call on the landing-page critical render path.
- Pre-seed demo brands so "click Allbirds → DNA + scored candidates" is <2s.
- Batch scoring concurrency cap = 3.
- All images at 512px longest side; never send larger to any LLM.
- All vision calls send base64 data URLs, not public URLs.
- WebGL scene holds 60fps with 20+ tiles on a mid-range laptop.
- No auth. No accounts. Not even a cookie.

## Out of scope (do NOT build)

Auth/multi-tenancy; historical performance ingestion (Winner-Learning Loop, v2); real Meta/TikTok/Google Ads APIs; fine-tuning; video/carousel/multi-frame; real IG scraping past oEmbed; a11y beyond Tailwind defaults; analytics beyond console.log; rate limiting; real Cresva API integration.
