import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Tests for the pure logic (src/lib) and the demo's simulator. `npm test`
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
