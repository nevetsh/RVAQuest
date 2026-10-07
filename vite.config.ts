import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * VULN-003 in `docs/security-review.md`: the built app shipped with no content
 * security policy, so an injected `<script>` (or a `javascript:` URL, or an
 * off-origin form post) had nothing stopping it.
 *
 * The policy is injected into the production HTML only. The dev server injects
 * inline scripts for HMR and react-refresh, which a strict `script-src 'self'`
 * blocks — a policy that has to be disabled to develop is a policy nobody keeps.
 * The same policy, plus the headers a meta tag cannot express (HSTS,
 * `frame-ancestors`), is set in `Caddyfile` for real deployments.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  // Leaflet positions panes with inline styles.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.tile.openstreetmap.org",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

function contentSecurityPolicy(): Plugin {
  return {
    name: 'rva-quest-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => ({
        html,
        tags: [
          {
            tag: 'meta',
            attrs: {
              'http-equiv': 'Content-Security-Policy',
              content: CONTENT_SECURITY_POLICY,
            },
            injectTo: 'head-prepend',
          },
        ],
      }),
    },
  }
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  build: {
    rollupOptions: {
      output: {
        // Keep Leaflet out of the initial bundle so first paint stays fast.
        manualChunks: {
          map: ['leaflet'],
        },
      },
    },
  },
})
