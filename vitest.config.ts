import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Rules and services run in plain Node. Component tests opt into jsdom with a
    // `// @vitest-environment jsdom` header, so they stay off the fast path.
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
