import { action, api, app, page, query, route } from "@wasp.sh/spec"

import { LandingPage } from "./src/pages/Landing" with { type: "ref" }
import { BrandDetailPage } from "./src/pages/BrandDetail" with { type: "ref" }

import { extractBrand } from "./src/actions/extractBrand" with { type: "ref" }
import { scoreCandidate } from "./src/actions/scoreCandidate" with { type: "ref" }

import { listBrands } from "./src/queries/listBrands" with { type: "ref" }
import { getBrand } from "./src/queries/getBrand" with { type: "ref" }

import { streamScoringHandler } from "./src/api/streamScoring" with { type: "ref" }
import { mcpServerHandler } from "./src/api/mcpServer" with { type: "ref" }

import { configureGlobalMiddleware } from "./src/server/middleware" with { type: "ref" }
import { setupServer } from "./src/server/setup" with { type: "ref" }

export default app({
  name: "BrandFitScorer",
  wasp: {
    version: "^0.24.0",
  },
  title: "Brand-Fit Scorer",
  head: [
    "<meta property='og:title' content='Brand-Fit Scorer for Olivia' />",
    "<meta property='og:description' content='The missing eval layer for AI-generated ad creative. Score any ad against a brand DNA on 5 axes.' />",
    "<meta name='viewport' content='width=device-width, initial-scale=1' />",
  ],
  server: {
    middlewareConfigFn: configureGlobalMiddleware,
    setupFn: setupServer,
  },
  spec: [
    route("LandingRoute", "/", page(LandingPage)),
    route("BrandDetailRoute", "/brands/:id", page(BrandDetailPage)),

    action(extractBrand, { entities: ["Brand"] }),
    action(scoreCandidate, { entities: ["Brand", "Candidate", "Scoring"] }),

    query(listBrands, { entities: ["Brand"] }),
    query(getBrand, { entities: ["Brand", "Candidate", "Scoring"] }),

    api("GET", "/api/stream-scoring/:brandId", streamScoringHandler, {
      entities: ["Brand", "Candidate", "Scoring"],
      auth: false,
    }),
    api("POST", "/mcp", mcpServerHandler, {
      entities: ["Brand", "Candidate", "Scoring"],
      auth: false,
    }),
  ],
})
