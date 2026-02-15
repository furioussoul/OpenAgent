# openagent-ai

A lightweight, extensible AI Agent framework with tool calling, streaming, and multi-provider support.

## 30 Seconds Quick Start

```typescript
import { anthropic } from 'openagent-ai'

const agent = anthropic('your-api-key')
const result = await agent.chat('Hello!')
console.log(result.text)
```

That's it! The agent can read/write files, execute commands, search code, and more.

## Features

- **Simple API**: One-line initialization, easy `chat()` and `stream()` methods
- **Built-in Tools**: File operations, bash execution, web fetching out of the box
- **Multi-Provider**: Works with Anthropic, OpenAI, Google, and OpenAI-compatible APIs
- **Extensible**: Custom tools, custom agents, pluggable storage
- **Streaming**: Real-time streaming of responses and tool execution
- **Agent Loop**: Automatic multi-step tool execution

## Installation

```bash
npm install openagent-ai
```

## Usage Examples

### Basic Chat

```typescript
import { anthropic } from 'openagent-ai'

const agent = anthropic(process.env.ANTHROPIC_API_KEY)

// Simple chat
const result = await agent.chat('List files in current directory')
console.log(result.text)
console.log(result.toolCalls) // See what tools were used
```

### Streaming

```typescript
for await (const event of agent.stream('Create a hello.txt file')) {
  if (event.type === 'text') process.stdout.write(event.text)
  if (event.type === 'tool-start') console.log(`\nUsing: ${event.name}`)
  if (event.type === 'done') console.log(`\nCost: $${event.result.cost}`)
}
```

### Use with OpenCode Config

If you have an `opencode.json` config file, you can load it directly:

```typescript
import { OpenAgent, configureFromOpenCodeConfig } from 'openagent-ai'

// Load your opencode.json configuration
const config = require('./opencode.json')
configureFromOpenCodeConfig(config)

// Now use any configured provider
const agent = new OpenAgent({
  provider: 'anthropic',
  model: 'claude-opus-4.5',
})

const result = await agent.chat('Hello!')
```

## Built-in Tools

| Tool | Description |
|------|-------------|
| `read` | Read file contents |
| `write` | Create or overwrite files |
| `edit` | Edit files with smart text matching |
| `bash` | Execute shell commands |
| `glob` | Find files by pattern |
| `grep` | Search file contents with regex |
| `webfetch` | Fetch web content |
| `question` | Ask user for input |

## Provider Setup

### Anthropic (Recommended)

```typescript
import { anthropic } from 'openagent-ai'

// Direct API
const agent = anthropic('sk-ant-xxx')

// With proxy/custom endpoint
const agent = new OpenAgent({
  provider: 'anthropic',
  apiKey: 'your-key',
  baseURL: 'https://your-proxy.com/v1',  // optional
  model: 'claude-opus-4.5',
})
```

### OpenAI

```typescript
import { openai } from 'openagent-ai'
const agent = openai('sk-xxx', 'gpt-4o')
```

### Google Gemini

```typescript
import { google } from 'openagent-ai'
const agent = google('your-api-key', 'gemini-1.5-pro')
```

### OpenAI-Compatible APIs (Together, Groq, DeepSeek, etc.)

```typescript
import { OpenAgent } from 'openagent-ai'

// Together AI
const agent = new OpenAgent({
  provider: 'openai',
  apiKey: process.env.TOGETHER_API_KEY,
  baseURL: 'https://api.together.xyz/v1',
  model: 'meta-llama/Llama-3-70b-chat-hf',
})

// Groq
const agent = new OpenAgent({
  provider: 'openai',
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
  model: 'llama-3.1-70b-versatile',
})

// DeepSeek
const agent = new OpenAgent({
  provider: 'openai',
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
})

// ZhipuAI (GLM)
const agent = new OpenAgent({
  provider: 'openai',
  apiKey: process.env.ZHIPU_API_KEY,
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
  model: 'glm-4',
})

// Local Ollama
const agent = new OpenAgent({
  provider: 'openai',
  apiKey: 'not-needed',
  baseURL: 'http://localhost:11434/v1',
  model: 'llama3',
})
```

## Advanced Configuration

### Full Options

```typescript
const agent = new OpenAgent({
  // Provider settings
  provider: 'anthropic',           // 'anthropic' | 'openai' | 'google'
  apiKey: 'your-api-key',
  baseURL: 'https://custom.api/v1', // optional proxy
  model: 'claude-sonnet-4-20250514',
  headers: { 'X-Custom': 'value' }, // optional headers
  
  // Behavior settings
  mode: 'build',                   // 'plan' (read-only) | 'build' (full access)
  maxSteps: 10,                    // max tool execution rounds
  temperature: 0.7,
  maxOutputTokens: 4096,
  workingDirectory: '/path/to/dir',
  
  // Custom tools
  tools: [myCustomTool],
  useBuiltinTools: true,           // default: true
})
```

### Custom Tools

```typescript
import { OpenAgent, defineTool } from 'openagent-ai'
import { z } from 'zod'

const calculator = defineTool({
  id: 'calculator',
  description: 'Perform math calculations',
  parameters: z.object({
    expression: z.string().describe('Math expression like "2 + 2"'),
  }),
  execute: async (args) => ({
    title: 'Calculation',
    output: `Result: ${eval(args.expression)}`,
  }),
})

const agent = new OpenAgent({
  provider: 'anthropic',
  apiKey: 'your-key',
  tools: [calculator],
})
```

### Custom System Prompt

```typescript
const agent = new OpenAgent({
  provider: 'anthropic',
  apiKey: 'your-key',
  agent: {
    name: 'code-reviewer',
    systemPrompt: `You are an expert code reviewer.
Focus on: code quality, security, performance.`,
    allowedTools: ['read', 'grep', 'glob'],  // optional: restrict tools
  },
})
```

### Session Management

```typescript
// Chat returns sessionId for continuation
const result1 = await agent.chat('Read package.json')
console.log(result1.sessionId)

// Continue same conversation
const result2 = await agent.chat('What version?', { 
  sessionId: result1.sessionId 
})

// Or use fluent API
const result3 = await agent
  .continueSession(result1.sessionId)
  .chat('Summarize it')

// Start fresh session
const result4 = await agent.newSession().chat('New topic')
```

## Agent Modes

- **`build`** (default): Full access - can read, write, execute
- **`plan`**: Read-only - can only read files and search

```typescript
// Start in plan mode
const agent = new OpenAgent({ mode: 'plan' })

// Switch to build mode when ready
agent.setMode('build')
```

## Examples

See the [examples/](./examples/) directory:

```bash
# Basic usage
npx tsx examples/simple.ts

# Custom tools
npx tsx examples/advanced.ts

# Test different providers
npx tsx examples/test-providers.ts
npx tsx examples/test-providers.ts anthropic --tools
```

## API Reference

### ChatResult

```typescript
interface ChatResult {
  text: string           // Final response text
  toolCalls: ToolCall[]  // Tools that were called
  usage: TokenUsage      // { input, output }
  cost: number           // Estimated cost in USD
  finishReason: string   // 'stop', 'tool_use', etc.
  sessionId: string      // For continuing conversation
}
```

### StreamEvent

```typescript
type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'tool-start'; name: string; input: object }
  | { type: 'tool-end'; name: string; output: string }
  | { type: 'done'; result: ChatResult }
  | { type: 'error'; error: Error }
```

## Documentation

- [Architecture](./ARCHITECTURE.md) - System design
- [Roadmap](./ROADMAP.md) - Future plans
- [Contributing](./CONTRIBUTING.md) - How to contribute

## License

MIT

## Links

- [GitHub](https://github.com/furioussoul/OpenAgent)
- [npm](https://www.npmjs.com/package/openagent-ai)
