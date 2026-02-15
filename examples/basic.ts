/**
 * Basic Example - OpenAgent
 * 
 * This example demonstrates how to:
 * 1. Initialize OpenAgent with a provider
 * 2. Create a session
 * 3. Stream a response with tool calling
 * 
 * Run with: npx tsx examples/basic.ts
 */

import { 
  initOpenAgent, 
  createSession, 
  getAgent,
  llmStream,
  toModelMessages,
  buildSystemPrompt,
  getAIToolsForAgent,
  batchSaveMessage,
  getSessionMessages,
} from '../src'

async function main() {
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Please set ANTHROPIC_API_KEY environment variable')
    process.exit(1)
  }

  // Initialize OpenAgent
  console.log('Initializing OpenAgent...')
  await initOpenAgent({
    providers: [{
      id: 'anthropic',
      name: 'Anthropic',
      type: 'anthropic',
      options: {
        apiKey: process.env.ANTHROPIC_API_KEY,
      },
      models: [{
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        maxOutput: 8192,
        supportsFunctions: true,
        supportsVision: true,
        supportsStreaming: true,
      }],
    }],
  })
  console.log('Initialized!')

  // Create a session
  const session = await createSession({
    agent: 'general',
    mode: 'build',
  })
  console.log(`Created session: ${session.id}`)

  // Save user message
  await batchSaveMessage({
    sessionId: session.id,
    role: 'USER',
    parts: [{ type: 'TEXT', text: 'List the files in the current directory' }],
  })

  // Get agent and prepare tools
  const agent = getAgent('general')
  const abortController = new AbortController()

  const ctx = {
    sessionId: session.id,
    messageId: 'msg_assistant',
    agent: 'general',
    abort: abortController.signal,
    workingDirectory: process.cwd(),
    metadata: async () => {},
    ask: async () => {},
  }

  const tools = getAIToolsForAgent(agent, ctx, session.mode)

  // Get message history
  const messages = await getSessionMessages(session.id)
  const modelMessages = await toModelMessages(messages)

  console.log('\n--- Streaming Response ---\n')

  // Stream the response
  const result = await llmStream({
    providerId: 'anthropic',
    modelId: 'claude-3-5-sonnet-20241022',
    messages: modelMessages,
    system: buildSystemPrompt(agent),
    tools,
  })

  for await (const event of result.fullStream) {
    switch (event.type) {
      case 'text-delta':
        process.stdout.write(event.text)
        break
      case 'tool-call':
        console.log(`\n[Tool Call: ${event.toolName}]`)
        console.log(`Input: ${JSON.stringify(event.args, null, 2)}`)
        break
      case 'tool-result':
        console.log(`[Tool Result]`)
        break
      case 'finish':
        console.log(`\n\n[Finished: ${event.finishReason}]`)
        console.log(`Tokens: ${JSON.stringify(event.usage.tokens)}`)
        console.log(`Cost: $${event.usage.cost.toFixed(4)}`)
        break
      case 'error':
        console.error(`\n[Error: ${event.error.message}]`)
        break
    }
  }
}

main().catch(console.error)
