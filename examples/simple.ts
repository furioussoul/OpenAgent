/**
 * Simple Example - OpenAgent High-Level API
 * 
 * This example demonstrates the simplest way to use OpenAgent:
 * - One-line initialization
 * - Simple chat() and stream() methods
 * 
 * Run with: ANTHROPIC_API_KEY=your-key npx tsx examples/simple.ts
 */

import { anthropic } from '../src'

async function main() {
  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('Please set ANTHROPIC_API_KEY environment variable')
    console.error('Usage: ANTHROPIC_API_KEY=sk-xxx npx tsx examples/simple.ts')
    process.exit(1)
  }

  // Create agent with one line!
  const agent = anthropic(apiKey)

  console.log('=== Non-Streaming Example ===\n')
  
  // Simple non-streaming chat
  const result = await agent.chat('What files are in the current directory? Just list them briefly.')
  
  console.log('Response:', result.text)
  console.log('\nTool Calls:', result.toolCalls.length)
  for (const call of result.toolCalls) {
    console.log(`  - ${call.name}: ${call.status}`)
  }
  console.log('\nTokens:', result.usage)
  console.log('Cost: $' + result.cost.toFixed(4))

  console.log('\n=== Streaming Example ===\n')

  // Streaming chat (new session)
  for await (const event of agent.newSession().stream('Create a simple hello.txt file with "Hello, World!" in it')) {
    switch (event.type) {
      case 'text':
        process.stdout.write(event.text)
        break
      case 'tool-start':
        console.log(`\n[Tool: ${event.name}]`)
        break
      case 'tool-end':
        console.log(`[Done: ${event.name}]`)
        break
      case 'done':
        console.log('\n\n[Completed]')
        console.log('Total cost: $' + event.result.cost.toFixed(4))
        break
      case 'error':
        console.error('\n[Error]', event.error.message)
        break
    }
  }
}

main().catch(console.error)
