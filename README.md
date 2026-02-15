# openagent-ai

A lightweight, extensible AI Agent framework with tool calling, streaming, and multi-provider support.

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
# or
pnpm add openagent-ai
# or
yarn add openagent-ai
```

## Quick Start

```typescript
import { anthropic } from 'openagent-ai'

// Create agent with one line
const agent = anthropic(process.env.ANTHROPIC_API_KEY)

// Non-streaming chat
const result = await agent.chat('List files in current directory')
console.log(result.text)
console.log(result.toolCalls) // See what tools were used

// Streaming chat
for await (const event of agent.stream('Create a hello.txt file')) {
  if (event.type === 'text') process.stdout.write(event.text)
  if (event.type === 'tool-start') console.log(`Using: ${event.name}`)
  if (event.type === 'done') console.log(`Cost: $${event.result.cost}`)
}
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

## Configuration

### Basic Configuration

```typescript
import { OpenAgent } from 'openagent-ai'

const agent = new OpenAgent({
  provider: 'anthropic',           // or 'openai', 'google'
  apiKey: process.env.API_KEY,
  model: 'claude-sonnet-4-20250514',  // optional, has defaults
  mode: 'build',                   // 'plan' for read-only, 'build' for full access
  maxSteps: 10,                    // max tool execution rounds
  temperature: 0.7,                // optional
})
```

### Custom Tools

```typescript
import { OpenAgent, defineTool } from 'openagent-ai'
import { z } from 'zod'

const myTool = defineTool({
  id: 'calculator',
  description: 'Perform calculations',
  parameters: z.object({
    expression: z.string(),
  }),
  execute: async (args) => ({
    title: 'Calculation',
    output: `Result: ${eval(args.expression)}`,
  }),
})

const agent = new OpenAgent({
  provider: 'anthropic',
  apiKey: process.env.API_KEY,
  tools: [myTool],
})
```

### Custom Agent Definition

```typescript
const agent = new OpenAgent({
  provider: 'anthropic',
  apiKey: process.env.API_KEY,
  agent: {
    name: 'code-reviewer',
    systemPrompt: `You are an expert code reviewer.
Focus on:
- Code quality and best practices
- Security vulnerabilities
- Performance issues`,
    allowedTools: ['read', 'grep', 'glob'],  // restrict tools
  },
})
```

### Session Continuation

```typescript
// First conversation
const result1 = await agent.chat('Read the package.json file')
const sessionId = result1.sessionId

// Continue the conversation
const result2 = await agent
  .continueSession(sessionId)
  .chat('What version is it?')

// Start fresh
const result3 = await agent
  .newSession()
  .chat('Hello!')
```

## Provider Options

### Anthropic (Default)

```typescript
import { anthropic } from 'openagent-ai'
const agent = anthropic(apiKey, 'claude-sonnet-4-20250514')
```

### OpenAI

```typescript
import { openai } from 'openagent-ai'
const agent = openai(apiKey, 'gpt-4o')
```

### Google

```typescript
import { google } from 'openagent-ai'
const agent = google(apiKey, 'gemini-1.5-pro')
```

### OpenAI-Compatible APIs

Works with any OpenAI-compatible API by setting `baseURL`:

```typescript
const agent = new OpenAgent({
  provider: 'openai',
  apiKey: process.env.API_KEY,
  baseURL: 'https://api.together.xyz/v1',
  model: 'meta-llama/Llama-3-70b-chat-hf',
})
```

**Popular Providers:**

| Provider | Base URL | Example Model |
|----------|----------|---------------|
| Together | `https://api.together.xyz/v1` | `meta-llama/Llama-3-70b-chat-hf` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.1-70b-versatile` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| OpenRouter | `https://openrouter.ai/api/v1` | `anthropic/claude-3.5-sonnet` |
| Ollama | `http://localhost:11434/v1` | `llama3` |

**With Custom Headers:**

```typescript
const agent = new OpenAgent({
  provider: 'openai',
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  model: 'anthropic/claude-3.5-sonnet',
  headers: {
    'HTTP-Referer': 'https://your-site.com',
    'X-Title': 'Your App Name',
  },
})
```

## Agent Modes

- **`build`** (default): Full access to all tools, can modify files
- **`plan`**: Read-only mode, cannot modify files or execute destructive commands

```typescript
const agent = new OpenAgent({
  mode: 'plan',  // Start in read-only mode
})

// Switch modes
agent.setMode('build')
```

## Low-Level API

For advanced use cases, you can access the low-level API:

```typescript
import {
  initOpenAgent,
  createSession,
  llmStream,
  registerTool,
  // ... more exports
} from 'openagent-ai'
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for details.

## Examples

- [Simple Example](./examples/simple.ts) - Basic usage
- [Advanced Example](./examples/advanced.ts) - Custom tools and configuration
- [Custom Provider](./examples/custom-provider.ts) - OpenAI-compatible APIs (Together, Groq, DeepSeek, etc.)

Run examples:
```bash
# Anthropic
ANTHROPIC_API_KEY=your-key npx tsx examples/simple.ts

# Together AI
TOGETHER_API_KEY=your-key npx tsx examples/custom-provider.ts together

# Groq
GROQ_API_KEY=your-key npx tsx examples/custom-provider.ts groq

# DeepSeek
DEEPSEEK_API_KEY=your-key npx tsx examples/custom-provider.ts deepseek
```

## Documentation

- [Architecture](./ARCHITECTURE.md) - System design and components
- [Roadmap](./ROADMAP.md) - Future plans and features

## License

MIT

## Links

- [GitHub](https://github.com/furioussoul/OpenAgent)
- [npm](https://www.npmjs.com/package/openagent-ai)
