import { defineConfig } from "vite"
import { wasp } from "wasp/client/vite"

// Security headers on the app's OWN documents. In dev, Wasp/Vite serve the
// client on a separate port (3000) from the API server (3001) — the API
// server's helmet config (src/server/middleware.ts) never touches responses
// from this process, so without this, CSP/HSTS/etc would only ever protect
// API responses, never the actual page a browser navigates to.
const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: blob: data:; connect-src 'self' http://localhost:3001 ws://localhost:3000; object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}

// Vite's `server.headers` option doesn't reach the root "/" document — Wasp's
// SSR plugin (@wasp.sh/lib-vite-ssr) serves that route through its own
// middleware, which ends the response before Vite's normal header injection
// runs (confirmed: `curl -I localhost:3000/@vite/client` gets the headers,
// `curl -I localhost:3000/` does not). Setting headers here instead, in a
// plugin registered BEFORE wasp(), guarantees this middleware runs first and
// attaches the headers to every response regardless of which later
// middleware actually ends it.
const securityHeadersPlugin = {
  name: "security-headers",
  configureServer(server: import("vite").ViteDevServer) {
    server.middlewares.use((_req, res, next) => {
      for (const [key, value] of Object.entries(securityHeaders)) res.setHeader(key, value)
      next()
    })
  },
}

export default defineConfig({
  plugins: [securityHeadersPlugin, wasp()],
  server: { headers: securityHeaders },
  preview: { headers: securityHeaders },
})
