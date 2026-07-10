import { action, api, app, page, query, route } from "@wasp.sh/spec"

import { LandingPage } from "./src/pages/Landing" with { type: "ref" }
import { BrandDetailPage } from "./src/pages/BrandDetail" with { type: "ref" }
import { SignupPage } from "./src/pages/Signup" with { type: "ref" }
import { LoginPage } from "./src/pages/Login" with { type: "ref" }
import { EmailVerificationPage } from "./src/pages/EmailVerification" with { type: "ref" }
import { ForgotPasswordPage } from "./src/pages/ForgotPassword" with { type: "ref" }
import { ResetPasswordPage } from "./src/pages/ResetPassword" with { type: "ref" }
import { DashboardPage } from "./src/pages/Dashboard" with { type: "ref" }

import { extractBrand } from "./src/actions/extractBrand" with { type: "ref" }
import { scoreCandidate } from "./src/actions/scoreCandidate" with { type: "ref" }
import { discoverCandidateImages } from "./src/actions/discoverCandidateImages" with { type: "ref" }
import { createApiKey } from "./src/actions/apiKeys" with { type: "ref" }
import { revokeApiKey } from "./src/actions/apiKeys" with { type: "ref" }

import { listBrands } from "./src/queries/listBrands" with { type: "ref" }
import { getBrand } from "./src/queries/getBrand" with { type: "ref" }
import { listMyApiKeys } from "./src/queries/apiKeys" with { type: "ref" }

import { streamScoringHandler } from "./src/api/streamScoring" with { type: "ref" }
import { mcpServerHandler } from "./src/api/mcpServer" with { type: "ref" }

import { configureGlobalMiddleware } from "./src/server/middleware" with { type: "ref" }
import { setupServer } from "./src/server/setup" with { type: "ref" }

import { onAfterEmailVerified, onBeforeSignup } from "./src/auth/hooks" with { type: "ref" }
import { getVerificationEmailContent, getPasswordResetEmailContent } from "./src/auth/email" with { type: "ref" }

export default app({
  name: "Nora",
  wasp: {
    version: "^0.24.0",
  },
  title: "Nora",
  head: [
    "<meta property='og:title' content='Nora for Olivia' />",
    "<meta property='og:description' content='The missing eval layer for AI-generated ad creative. Score any ad against a brand DNA on 5 axes.' />",
    "<meta name='viewport' content='width=device-width, initial-scale=1' />",
  ],
  emailSender: {
    provider: "SMTP",
  },
  auth: {
    userEntity: "User",
    methods: {
      email: {
        fromField: {
          name: "Nora",
          email: "noreply@nora.dev",
        },
        emailVerification: {
          clientRoute: "EmailVerificationRoute",
          getEmailContentFn: getVerificationEmailContent,
        },
        passwordReset: {
          clientRoute: "PasswordResetRoute",
          getEmailContentFn: getPasswordResetEmailContent,
        },
      },
    },
    onAuthFailedRedirectTo: "/login",
    onAuthSucceededRedirectTo: "/dashboard",
    onAfterEmailVerified,
    onBeforeSignup,
  },
  server: {
    middlewareConfigFn: configureGlobalMiddleware,
    setupFn: setupServer,
  },
  spec: [
    route("LandingRoute", "/", page(LandingPage)),
    route("BrandDetailRoute", "/brands/:id", page(BrandDetailPage)),
    route("SignupRoute", "/signup", page(SignupPage)),
    route("LoginRoute", "/login", page(LoginPage)),
    route("EmailVerificationRoute", "/email-verification", page(EmailVerificationPage)),
    route("ForgotPasswordRoute", "/forgot-password", page(ForgotPasswordPage)),
    route("PasswordResetRoute", "/password-reset", page(ResetPasswordPage)),
    route("DashboardRoute", "/dashboard", page(DashboardPage, { authRequired: true })),

    // Public product demo — must stay reachable without an account regardless
    // of app-level auth being enabled (auth defaults operations to required).
    action(extractBrand, { entities: ["Brand"], auth: false }),
    action(scoreCandidate, { entities: ["Brand", "Candidate", "Scoring"], auth: false }),
    action(discoverCandidateImages, { entities: [], auth: false }),
    query(listBrands, { entities: ["Brand"], auth: false }),
    query(getBrand, { entities: ["Brand", "Candidate", "Scoring"], auth: false }),

    // MCP API key management — requires a logged-in, verified-email session.
    action(createApiKey, { entities: ["McpApiKey"] }),
    action(revokeApiKey, { entities: ["McpApiKey"] }),
    query(listMyApiKeys, { entities: ["McpApiKey"] }),

    api("GET", "/api/stream-scoring/:brandId", streamScoringHandler, {
      entities: ["Brand", "Candidate", "Scoring"],
      auth: false,
    }),
    // MCP callers authenticate with their own X-MCP-Secret API key, not a
    // Wasp session/cookie, so this stays auth:false at the Wasp level —
    // verifyMcpSecret (src/lib/security/mcpAuth.ts) is the real gate.
    api("POST", "/mcp", mcpServerHandler, {
      entities: ["Brand", "Candidate", "Scoring", "McpApiKey", "User"],
      auth: false,
    }),
  ],
})
