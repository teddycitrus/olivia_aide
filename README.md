## About The Project

olivia_aide is an intelligence and validation tool designed to sit directly on top of Olivia (cresva.ai) to score, filter, and guide its creative generation output. By parsing a store's live presence, it ensures that every generated marketing asset tightly respects the host brand's native design guidelines.

By pasting any Shopify storefront URL, olivia_aide instantly scrapes and analyzes the active storefront to extract its foundational visual DNA (including typography styles, dominant color palettes, layout density, and emotional brand voice). It then runs candidate advertising graphics through a rigorous multi-axis evaluation engine to prevent off-brand deviations before they reach production workflows.

Key capabilities:

* **Brand DNA Extraction**: Automatically targets and deconstructs live Shopify storefront architectures to establish an authoritative visual identity reference.
* **Explainable 5-Axis Scoring**: Computes objective compatibility scores across five deterministic design axes, complete with clear text explanations for why an asset succeeds or fails.
* **Guardrail Filtering Engine**: Intercepts low-scoring or aesthetically divergent asset variations, keeping generational drift out of the final creative canvas.
* **Model Context Protocol (MCP) Support**: Packages and exposes the underlying evaluation loop directly as an MCP tool, allowing autonomous agents like Olivia to self-correct during the design loop.

### Built With
* [![TypeScript][TypeScript-badge]][TypeScript-url]
* [![Node.js][Node-badge]][Node-url]
* [![Prisma][Prisma-badge]][Prisma-url]
* [![PostgreSQL][Postgres-badge]][Postgres-url]
* [![Zod][Zod-badge]][Zod-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>
## Getting Started

### Prerequisites

* Node.js 18+
* A running PostgreSQL database instance
* API keys for the underlying LLM/Vision evaluators (such as Anthropic or OpenAI)

```sh
npm install npm@latest -g

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


3. Copy the example environment file and fill in your values
```sh
cp .env.example .env

```


Required variables:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/olivia_aide"
ANTHROPIC_API_KEY="your_anthropic_key"
OPENAI_API_KEY="your_openai_key"

```


4. Initialize the database schema
```sh
npm run db:push

```


5. Start the engine / local environment
```sh
npm run dev

```



## Usage

**Brand Identity Parsing**

Provide a Shopify domain directly to the extraction engine to create a persistent brand profile schema:

```sh
npm run analyze -- --url https://your-target-store.myshopify.com

```

**Asset Assessment Loop**

Submit a candidate image asset payload against a saved brand profile to fetch its multi-axis grading metadata:

```sh
npm run evaluate -- --brandId <brand_id> --image ./candidate_ad.png

```

**MCP Agent Integration**

To attach this evaluator directly to an autonomous workflow tool belt, reference the server within your global MCP host configurations (such as Cursor or Claude Desktop):

```json
{
  "mcpServers": {
    "olivia-aide-evaluator": {
      "command": "node",
      "args": ["/path/to/olivia_aide/dist/mcp/index.js"]
    }
  }
}

```

## Roadmap

* [x] Automated storefront extraction pipelines for Shopify targets
* [x] Multimodal evaluation architecture across 5 explainable visual axes
* [x] Programmatic image validation guardrails and variation filtering
* [x] MCP interface abstraction for fluid human-in-the-loop and autonomous agent control
* [ ] Deep visual component layout matching against extracted CSS structures
* [ ] Real-time feedback synthesis loops to feed prompt modifications straight back into generative pipelines

## Contributing

Contributions are welcome. If you have a suggestion, please fork the repo and open a pull request, or file an issue with the `enhancement` label.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a pull request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Project Link: [https://github.com/teddycitrus/olivia_aide](https://github.com/teddycitrus/olivia_aide)
