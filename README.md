<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
<div align="center">

  [![Contributors][contributors-shield]][contributors-url]
  [![Forks][forks-shield]][forks-url]
  [![Stargazers][stars-shield]][stars-url]
  [![Issues][issues-shield]][issues-url]
  [![MIT License][license-shield]][license-url]

</div>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h3 align="center">Nora</h3>

  <p align="center">
    the missing eval layer for AI-generated ad creative.
    <br />
    <a href="https://github.com/teddycitrus/olivia_aide"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://nora-olivia-client.fly.dev/">View Live</a>
    &middot;
    <a href="https://github.com/teddycitrus/olivia_aide/issues/new?labels=bug">Report Bug</a>
    &middot;
    <a href="https://github.com/teddycitrus/olivia_aide/issues/new?labels=enhancement">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#mcp-server">MCP Server</a></li>
    <li><a href="#deployment">Deployment</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

Nora takes a Shopify store URL and extracts the brand's visual identity: color palette, typography, photo style, and tone. It then scores any candidate ad or creative image against that identity across five explainable axes, so a marketer (or an agent generating creative on their behalf) can tell if an image is on-brand without eyeballing it.

Key capabilities:

**Brand DNA extraction**
- pulls product copy and imagery from a Shopify store and Instagram, then derives a palette, typography treatment, photo style, and tone profile for the brand
**Five-axis scoring**
- scores palette match, typography match, photo style match, product accuracy, and an overall on-brand score for any candidate image, each with a plain-language explanation of what drove the score
**Multi-hero product matching**
- compares a candidate against every product hero image on file (via CLIP embeddings) and refines the closest match with a vision model, rather than checking against a single reference shot
**Progressive scoring via SSE**
- candidate scores stream in as they finish instead of waiting on the full batch
**MCP server**
- the scorer is exposed as an MCP tool, so agents (including Olivia) can call it directly instead of going through the UI
**Self-service API keys**
- developers can sign up with Wasp email/password auth, verify email, create an MCP API key from `/dashboard`, and revoke it without backend access
**Spend-capped AI calls**
- every LLM and embedding call is metered against a per-provider daily USD cap, so a runaway batch fails closed instead of running up a bill

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

| layer | tools |
|---|---|
| framework | ![Wasp](https://img.shields.io/badge/Wasp-EFC63A?style=flat-square) |
| frontend | ![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![Three.js](https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=threedotjs&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) |
| backend | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white) |
| AI / vision | ![Anthropic](https://img.shields.io/badge/Claude-D97757?style=flat-square) ![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white) ![Google Gemini](https://img.shields.io/badge/Gemini-4285F4?style=flat-square&logo=googlegemini&logoColor=white) ![Replicate](https://img.shields.io/badge/Replicate-000000?style=flat-square) |
| language | ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) |
| deployment | ![Fly.io](https://img.shields.io/badge/Fly.io-8B5CF6?style=flat-square&logo=flydotio&logoColor=white) ![Neon](https://img.shields.io/badge/Neon-00E599?style=flat-square) |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

* Node.js 18+
* [Wasp CLI](https://wasp.sh) 0.24.x
* A reachable Postgres instance (Docker locally, or managed/serverless Postgres in production)
* API keys for Anthropic, OpenAI, Google Generative AI, and Replicate

```sh
npm i -g @wasp.sh/wasp-cli@0.24.0
```

For a local Docker database that matches the default examples:

```sh
docker run --name nora-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=olivia_aide \
  -p 5432:5432 \
  -d postgres:16
```

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/teddycitrus/olivia_aide.git
   cd olivia_aide
   ```

2. Install dependencies
   ```sh
   npm install
   ```

3. Copy the env template and fill in your keys
   ```sh
   cp .env.server.example .env.server
   ```

   ```env
   ANTHROPIC_API_KEY=sk-ant-...
   OPENAI_API_KEY=sk-...
   GOOGLE_GENERATIVE_AI_API_KEY=...
   REPLICATE_API_TOKEN=r8_...
   DATABASE_URL=postgresql://user:pass@localhost:5432/olivia_aide
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_USERNAME=...
   SMTP_PASSWORD=...

   ANTHROPIC_DAILY_USD_CAP=0.25
   OPENAI_DAILY_USD_CAP=0.25
   GOOGLE_DAILY_USD_CAP=0.25
   REPLICATE_DAILY_USD_CAP=0.25
   ```

4. Run the database migrations
   ```sh
   wasp db migrate-dev
   ```

5. Start the dev server
   ```sh
   wasp start
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the app.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE -->
## Usage

**Extract a Brand DNA**

paste a Shopify store URL on the landing page. The app scrapes product copy and imagery, pulls recent Instagram posts if a handle is found, and derives a palette, typography read, photo style classification, and tone profile. The result is stored as a Brand and shown as a Brand DNA card.

**Score candidate images**

on a brand's detail page, upload one or more candidate ad images. Each is scored on five axes (palette match, typography match, photo style match, product accuracy, and overall on-brand score) with a short explanation of what drove the number. Scores stream in as each candidate finishes rather than waiting on the full batch.

**Backend operations**: all data operations are Wasp actions and queries defined in `src/`.

| operation | type | description |
|---|---|---|
| `extractBrand` | action | Scrape a Shopify store and derive its Brand DNA |
| `scoreCandidate` | action | Score a candidate image against a brand on all five axes |
| `listBrands` | query | Fetch all extracted brands |
| `getBrand` | query | Fetch a single brand with its candidates and scores |
| `streamScoringHandler` | api | SSE endpoint for progressive scoring updates |
| `mcpServerHandler` | api | MCP server endpoint for agent access to the scorer |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MCP SERVER -->
## MCP Server

The scorer is exposed as an MCP server (Streamable HTTP, JSON-RPC 2.0) at `POST /mcp` on the server app, so any MCP-compatible agent (Claude Code, Olivia, or your own tool runner) can call it directly instead of going through the UI.

Endpoints:
- Local: `http://localhost:3001/mcp`
- Live: `https://nora-olivia-server.fly.dev/mcp`

### Auth

Every request needs an `X-MCP-Secret` header matching one of your own per-account API keys — there is no shared/global secret anymore. To get one:

1. Sign up at `/signup` and verify your email (link is emailed through the configured Wasp SMTP sender).
2. Log in and open `/dashboard`.
3. Click **+ New key**. The plaintext key is shown exactly once — copy it immediately. Only one-way argon2id hashes are ever stored; if you lose the plaintext, revoke the key and create a new one.
4. Revoke a key any time from the same dashboard. Revocation is immediate — the next request with that key gets `401`, and no other account's keys are affected.

Missing, unknown, wrong, or revoked keys all fail closed with the same `401` and the same response timing (a fixed argon2id verify cost plus random jitter is paid on every rejection path, so none of those cases are distinguishable from the outside). Requests are also rate-limited: a coarse 100/hour-per-IP guard applies before auth even runs (so a key-guessing flood trips it regardless of whether any attempt would've succeeded), and every authenticated request additionally counts against your account's own tier quota (`DEFAULT` 100/hour, `PRO` 1000/hour, `ADMIN` 10000/hour) — keyed by account, not IP, so one caller can't be throttled by another's traffic. New signups start at `DEFAULT`; there's no self-service upgrade path, an operator has to bump a user's `User.mcpTier` by hand.

**Migration note:** this replaced a single shared `MCP_SHARED_SECRET` env var used by every caller. Rather than invalidate it and require every existing integration (most importantly Olivia's) to coordinate a cutover, `npm run migrate:mcp-secret` grandfathers the existing secret value into one `ADMIN`-tier `McpApiKey` row owned by an `ADMIN`-tier bare service-account `User` with no login identity — so it keeps authenticating unchanged. `MCP_SHARED_SECRET` is only read by that one migration script, never by request-time auth; remove it from env once the migration reports success.

To verify the DB-backed lifecycle against a real Postgres database, run:

```sh
npm run verify:mcp-auth
```

That verifier creates disposable users and keys, confirms the DB stores only hashes/fingerprints, checks valid/missing/unknown/unverified/revoked auth outcomes, and confirms revoking one user's key does not affect another user's key.

### Supported methods

Standard MCP over JSON-RPC 2.0 (protocol version `2024-11-05`):

| method | description |
|---|---|
| `initialize` | handshake, returns protocol version + server info |
| `ping` | liveness check |
| `tools/list` | returns the 4 tool definitions below with their JSON schemas |
| `tools/call` | invoke a tool by name with arguments |
| `notifications/*` | acknowledged with `202` and no body, per spec |

### Tools

| tool | arguments | description |
|---|---|---|
| `extract_brand` | `storeUrl` | Extract a brand's visual DNA from a Shopify store URL. Runs the full scrape + AI pipeline, costs real API spend, rate-limited to 3/hour per IP. |
| `score_candidate` | `brandId`, `imageUrl` | Score a candidate image against a brand's DNA on 5 axes. Costs real API spend, rate-limited to 30/hour per IP. |
| `list_brands` | none | List all extracted brands. Read-only, no AI cost. |
| `get_brand` | `brandId` | Get a single brand by id. Read-only, no AI cost. |

### Example request

```sh
curl -s -X POST https://nora-olivia-server.fly.dev/mcp \
  -H "Content-Type: application/json" \
  -H "X-MCP-Secret: <your secret>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_brands","arguments":{}}}'
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- DEPLOYMENT -->
## Deployment

The planned production shape is serverless-managed data plus scale-to-zero compute:

- Postgres runs on a managed/serverless provider such as Neon. Set `DATABASE_URL` to the provider's pooled, TLS-enabled connection string, for example `postgresql://...?...sslmode=require`.
- The Wasp client is static and can be hosted on any static/CDN host, including Fly, Netlify, Cloudflare Pages, or Vercel.
- The Wasp server is a generated Node/Express app, not a bundle of per-route serverless functions. In this repo it runs on Fly Machines with `auto_stop_machines = 'stop'`, `auto_start_machines = true`, and `min_machines_running = 0`, so it scales to zero when idle while preserving the normal Wasp deployment path.
- MCP auth, key revocation, spend caps, and rate limits are database-backed and survive cold starts. The scoring concurrency guard is process-local by design, so it limits concurrent work per running server instance rather than globally across every possible instance.
- A pure function-as-a-service deployment would require refactoring the Wasp server APIs, MCP endpoint, auth sessions, migrations, and SSE streaming path out of the generated Wasp server. That is a deliberate platform migration, not part of the MCP auth change.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

- [x] Shopify + Instagram scraping into a structured Brand DNA (palette, typography, photo style, tone)
- [x] Five-axis candidate scoring with plain-language explanations
- [x] Multi-hero CLIP matching with vision-model refinement for product accuracy
- [x] Per-provider daily spend caps and rate limiting
- [x] Wasp email/password signup, verification, login, dashboard sessions, and password reset
- [x] Per-account MCP API keys with one-time plaintext display, argon2id hashing, dashboard listing, and revocation
- [x] Account-tier MCP rate limits loaded during key verification
- [ ] SSE-streamed progressive scoring in the UI
- [x] MCP server exposed as a callable tool for external agents
- [ ] Move production Postgres to Neon or equivalent serverless Postgres
- [ ] Deploy Wasp server on scale-to-zero compute with static client hosting
- [ ] WebGL mood board view for candidate results
- [ ] Historical ad performance data, as a separate "winner-learning loop" project

See the [open issues](https://github.com/teddycitrus/olivia_aide/issues) for a full list of proposed features and known bugs.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

Contributions are welcome. If you have a suggestion, please fork the repo and open a pull request, or file an issue with the `enhancement` label.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a pull request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

Project Link: [https://github.com/teddycitrus/olivia_aide](https://github.com/teddycitrus/olivia_aide)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & BADGES -->
[contributors-shield]: https://img.shields.io/github/contributors/teddycitrus/olivia_aide.svg?style=for-the-badge
[contributors-url]: https://github.com/teddycitrus/olivia_aide/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/teddycitrus/olivia_aide.svg?style=for-the-badge
[forks-url]: https://github.com/teddycitrus/olivia_aide/network/members
[stars-shield]: https://img.shields.io/github/stars/teddycitrus/olivia_aide.svg?style=for-the-badge
[stars-url]: https://github.com/teddycitrus/olivia_aide/stargazers
[issues-shield]: https://img.shields.io/github/issues/teddycitrus/olivia_aide.svg?style=for-the-badge
[issues-url]: https://github.com/teddycitrus/olivia_aide/issues
[license-shield]: https://img.shields.io/github/license/teddycitrus/olivia_aide.svg?style=for-the-badge
[license-url]: https://github.com/teddycitrus/olivia_aide/blob/main/LICENSE
