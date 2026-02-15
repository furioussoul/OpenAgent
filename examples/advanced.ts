/**
 * Advanced Example - Custom Tools and Configuration
 * 
 * This example shows advanced usage:
 * - Custom tool definition
 * - Custom agent configuration
 * - Session continuation
 * 
 * Run with: ANTHROPIC_API_KEY=your-key npx tsx examples/advanced.ts
 */

import { OpenAgent, defineTool } from '../src'
import { z } from 'zod'

// Define a custom tool
const calculatorTool = defineTool({
  id: 'calculator',
  description: 'Perform basic arithmetic calculations',
  parameters: z.object({
    expression: z.string().describe('Math expression to evaluate, e.g., "2 + 3 * 4"'),
  }),
  execute: async (args) => {
    try {
      // Simple and safe eval for basic math
      const result = Function(`"use strict"; return (${args.expression})`)()
      return {
        title: `Calculator: ${args.expression}`,
        output: `${args.expression} = ${result}`,
      }
    } catch (error) {
      return {
        title: 'Calculator Error',
        output: `Error evaluating expression: ${error}`,
      }
    }
  },
})

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('Please set ANTHROPIC_API_KEY environment variable')
    process.exit(1)
  }

  // Create agent with custom configuration
  const agent = new OpenAgent({
    provider: 'anthropic',
    apiKey,
    model: 'claude-sonnet-4-20250514',
    
    // Custom agent definition
    agent: {
      name: 'math-assistant',
      systemPrompt: `You are a helpful math assistant.
You can perform calculations using the calculator tool.
Always show your work and explain the results.`,
    },
    
    // Add custom tool
    tools: [calculatorTool],
    
    // Configuration
    mode: 'build',
    maxSteps: 5,
    temperature: 0.7,
    workingDirectory: process.cwd(),
  })

  console.log('=== Custom Tool Example ===\n')
  
  // Use the custom tool
  const result = await agent.chat('What is 15% of 250? Also calculate 2^10.')
  
  console.log('Response:', result.text)
  console.log('\nTool Calls:')
  for (const call of result.toolCalls) {
    console.log(`  ${call.name}: ${call.output}`)
  }

  console.log('\n=== Session Continuation Example ===\n')
  
  // Continue in the same session
  const followUp = await agent.chat('What was the first calculation you did?')
  console.log('Follow-up:', followUp.text)

  console.log('\n=== New Session Example ===\n')
  
  // Start a new session
  const newResult = await agent.newSession().chat('What is 100 divided by 7?')
  console.log('New session:', newResult.text)
}

main().catch(console.error)
