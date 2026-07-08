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
  <h3 align="center">Brand-Fit Scorer</h3>

  <p align="center">
    the missing eval layer for AI-generated ad creative.
    <br />
    <a href="https://github.com/teddycitrus/olivia_aide"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://brand-fit-scorer-olivia-client.fly.dev/">View Live</a>
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
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

Brand-Fit Scorer takes a Shopify store URL and extracts the brand's visual identity: color palette, typography, photo style, and tone. It then scores any candidate ad or creative image against that identity across five explainable axes, so a marketer (or an agent generating creative on their behalf) can tell if an image is on-brand without eyeballing it.

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
| deployment | ![Fly.io](https://img.shields.io/badge/Fly.io-8B5CF6?style=flat-square&logo=flydotio&logoColor=white) |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

### Prerequisites

* Node.js 18+
* [Wasp CLI](https://wasp.sh) 0.24.x
* A local Postgres instance (native, not Dockerized)
* API keys for Anthropic, OpenAI, Google Generative AI, and Replicate

```sh
npm i -g @wasp.sh/wasp-cli@0.24.0
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

   ANTHROPIC_DAILY_USD_CAP=0.25
   OPENAI_DAILY_USD_CAP=0.25
   GOOGLE_DAILY_USD_CAP=0.25
   REPLICATE_DAILY_USD_CAP=0.25
   MCP_SHARED_SECRET=
   ```

   Generate `MCP_SHARED_SECRET` with:
   ```sh
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
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
- Live: `https://brand-fit-scorer-olivia-server.fly.dev/mcp`

### Auth

Every request needs an `X-MCP-Secret` header matching the server's `MCP_SHARED_SECRET` env var. Missing or wrong secret returns `401` (constant-time comparison, fails closed if the server has no secret configured, never falls back to open access). Requests are also rate-limited to 100/hour per IP regardless of auth outcome, so a secret-guessing flood trips the limiter same as legitimate traffic.

Generate a secret with:
```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use a different secret for local vs. deployed. `mcp.json` has example configs for both; never commit the real value into it.

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
curl -s -X POST https://brand-fit-scorer-olivia-server.fly.dev/mcp \
  -H "Content-Type: application/json" \
  -H "X-MCP-Secret: <your secret>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_brands","arguments":{}}}'
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

- [x] Shopify + Instagram scraping into a structured Brand DNA (palette, typography, photo style, tone)
- [x] Five-axis candidate scoring with plain-language explanations
- [x] Multi-hero CLIP matching with vision-model refinement for product accuracy
- [x] Per-provider daily spend caps and rate limiting
- [ ] SSE-streamed progressive scoring in the UI
- [ ] MCP server exposed as a callable tool for external agents
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
