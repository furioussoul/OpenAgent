/**
 * Custom Provider Example - OpenAI Compatible APIs
 * 
 * This example shows how to use OpenAgent with:
 * - Custom baseURL (for self-hosted or third-party APIs)
 * - OpenAI-compatible providers (Together, Groq, DeepSeek, etc.)
 * - Custom headers for authentication
 * 
 * Run with: 
 *   TOGETHER_API_KEY=your-key npx tsx examples/custom-provider.ts
 *   DEEPSEEK_API_KEY=your-key npx tsx examples/custom-provider.ts deepseek
 */

import { OpenAgent } from '../src'

// Provider configurations for popular OpenAI-compatible APIs
const PROVIDERS = {
  together: {
    baseURL: 'https://api.together.xyz/v1',
    model: 'meta-llama/Llama-3-70b-chat-hf',
    apiKeyEnv: 'TOGETHER_API_KEY',
  },
  groq: {
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'llama-3.1-70b-versatile',
    apiKeyEnv: 'GROQ_API_KEY',
  },
  deepseek: {
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
  },
  openrouter: {
    baseURL: 'https://openrouter.ai/api/v1',
    model: 'anthropic/claude-3.5-sonnet',
    apiKeyEnv: 'OPENROUTER_API_KEY',
  },
  // Self-hosted example (e.g., vLLM, Ollama with OpenAI compatibility)
  local: {
    baseURL: 'http://localhost:8000/v1',
    model: 'llama3',
    apiKeyEnv: 'LOCAL_API_KEY', // May not be required
  },
}

async function main() {
  // Get provider from command line argument
  const providerName = process.argv[2] || 'together'
  const providerConfig = PROVIDERS[providerName as keyof typeof PROVIDERS]
  
  if (!providerConfig) {
    console.error(`Unknown provider: ${providerName}`)
    console.error(`Available providers: ${Object.keys(PROVIDERS).join(', ')}`)
    process.exit(1)
  }

  const apiKey = process.env[providerConfig.apiKeyEnv]
  if (!apiKey && providerName !== 'local') {
    console.error(`Please set ${providerConfig.apiKeyEnv} environment variable`)
    console.error(`Usage: ${providerConfig.apiKeyEnv}=your-key npx tsx examples/custom-provider.ts ${providerName}`)
    process.exit(1)
  }

  console.log(`Using provider: ${providerName}`)
  console.log(`Base URL: ${providerConfig.baseURL}`)
  console.log(`Model: ${providerConfig.model}`)
  console.log('')

  // Create agent with custom baseURL
  const agent = new OpenAgent({
    provider: 'openai', // Use OpenAI SDK for compatibility
    apiKey: apiKey || 'not-required',
    baseURL: providerConfig.baseURL,
    model: providerConfig.model,
    
    // Optional: Custom headers (some providers require additional headers)
    headers: {
      // Example: OpenRouter requires site info
      // 'HTTP-Referer': 'https://your-site.com',
      // 'X-Title': 'Your App Name',
    },
  })

  console.log('=== Testing Custom Provider ===\n')

  // Simple chat without tools (to test basic connectivity)
  try {
    const result = await agent.chat('Say "Hello from OpenAgent!" and nothing else.')
    console.log('Response:', result.text)
    console.log('Tokens:', result.usage)
    console.log('Cost: $' + result.cost.toFixed(6))
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error)
  }

  console.log('\n=== Testing with Tools ===\n')

  // Chat with tools (if the model supports function calling)
  try {
    for await (const event of agent.newSession().stream('What is 2 + 2? Use your tools if you have a calculator.')) {
      switch (event.type) {
        case 'text':
          process.stdout.write(event.text)
          break
        case 'tool-start':
          console.log(`\n[Tool: ${event.name}]`)
          break
        case 'tool-end':
          console.log(`[Result: ${event.output}]`)
          break
        case 'done':
          console.log('\n[Done]')
          break
        case 'error':
          console.error('\n[Error]', event.error.message)
          break
      }
    }
  } catch (error) {
    console.error('Error with tools:', error instanceof Error ? error.message : error)
    console.log('Note: Some models may not support function calling.')
  }
}

main().catch(console.error)
