import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  external: [
    '@ai-sdk/anthropic',
    '@ai-sdk/google', 
    '@ai-sdk/openai',
    '@modelcontextprotocol/sdk',
    'ai',
  ],
})
