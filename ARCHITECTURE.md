# OpenAgent Architecture

## Overview

OpenAgent is a **TypeScript SDK** for building AI agents with tool-calling capabilities. It is designed to be:

- **Simple**: One-line initialization, easy-to-use `chat()` and `stream()` methods
- **Extensible**: Custom tools, custom agents, pluggable storage
- **Provider-agnostic**: Works with Anthropic, OpenAI, Google, and OpenAI-compatible APIs

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         User Application                                 │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │      OpenAgent        │  ◄── High-Level API
                    │   (agent.ts)          │
                    │                       │
                    │  • chat()             │
                    │  • stream()           │
                    │  • Agent Loop         │
                    └───────────┬───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
│   Provider    │       │    Tool       │       │   Session     │
│   Registry    │       │   Registry    │       │    Store      │
│               │       │               │       │               │
│ • Anthropic   │       │ • read/write  │       │ • Memory      │
│ • OpenAI      │       │ • edit/bash   │       │ • (Pluggable) │
│ • Google      │       │ • glob/grep   │       │               │
│ • Custom      │       │ • task/skill  │       │               │
└───────┬───────┘       │ • todowrite   │       └───────┬───────┘
        │               │ • Custom      │               │
        │               └───────┬───────┘               │
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │      LLM Stream       │  ◄── Low-Level API
                    │   (core/llm.ts)       │
                    │                       │
                    │  • Vercel AI SDK      │
                    │  • Multi-step tools   │
                    │  • Streaming          │
                    └───────────────────────┘
```

## Core Components

### 1. OpenAgent Class (`src/agent.ts`)

The main entry point for users. Provides a simple, high-level API:

```typescript
const agent = anthropic(apiKey)
const result = await agent.chat('Hello')
```

**Responsibilities:**
- Initialize providers, tools, and session store
- Manage Agent Loop (multi-step tool execution)
- Handle streaming and non-streaming responses

### 2. Provider Registry (`src/provider/`)

Manages LLM provider configurations:

```typescript
configureProvider({
  id: 'anthropic',
  type: 'anthropic',
  options: { apiKey: '...' },
  models: [...]
})
```

**Supported Providers:**
- `anthropic` - Claude models
- `openai` - GPT models
- `google` - Gemini models
- Custom OpenAI-compatible APIs

### 3. Tool Registry (`src/tool/`)

Manages tool definitions and execution:

```typescript
// Built-in tools
registerTools(builtinTools)

// Custom tools
const myTool = defineTool({
  id: 'my-tool',
  description: '...',
  parameters: z.object({ ... }),
  execute: async (args, ctx) => { ... }
})
registerTool(myTool)
```

**Built-in Tools:**
| Tool | Description |
|------|-------------|
| `read` | Read file contents |
| `write` | Create/overwrite files |
| `edit` | Edit files with smart matching |
| `bash` | Execute shell commands |
| `glob` | Find files by pattern |
| `grep` | Search file contents |
| `webfetch` | Fetch web content |
| `question` | Ask user for input |
| `task` | Launch sub-agents for complex tasks |
| `todowrite` | Task management and progress tracking |
| `todoread` | Read current task list (read-only) |
| `skill` | Load specialized domain knowledge |

### 4. Session Store (`src/core/session-store.ts`)

Pluggable interface for session persistence:

```typescript
interface SessionStore {
  createSession(input): Promise<Session>
  getSession(id): Promise<Session | null>
  // ... message and part operations
}
```

**Implementations:**
- `MemorySessionStore` - In-memory (default)
- Custom implementations for SQLite, Redis, PostgreSQL, etc.

### 5. LLM Stream (`src/core/llm.ts`)

Low-level streaming interface using Vercel AI SDK:

```typescript
const result = await llmStream({
  providerId: 'anthropic',
  modelId: 'claude-sonnet-4-20250514',
  messages: [...],
  tools: {...},
})

for await (const event of result.fullStream) {
  // Handle streaming events
}
```

## Data Flow

### Chat Flow

```
1. User calls agent.chat("message")
          │
          ▼
2. Save user message to SessionStore
          │
          ▼
3. Build ToolContext with tools
          │
          ▼
4. ┌─────────────────────────────────┐
   │       Agent Loop (max steps)    │
   │                                 │
   │  a. Get message history         │
   │  b. Convert to model messages   │
   │  c. Call LLM with tools         │
   │  d. If tool calls:              │
   │     - Execute tools             │
   │     - Save results              │
   │     - Continue loop             │
   │  e. If no tool calls:           │
   │     - Save response             │
   │     - Exit loop                 │
   └─────────────────────────────────┘
          │
          ▼
5. Return ChatResult
```

### Streaming Flow

Same as chat flow, but yields events as they occur:

```
text-delta → tool-start → tool-end → text-delta → done
```

## Extension Points

### Custom Tools

```typescript
const agent = new OpenAgent({
  tools: [
    defineTool({
      id: 'custom',
      description: 'My custom tool',
      parameters: z.object({ ... }),
      execute: async (args, ctx) => ({
        title: 'Result',
        output: '...'
      })
    })
  ]
})
```

### Custom Session Store

```typescript
class MyStore implements SessionStore {
  // Implement all methods
}

const agent = new OpenAgent({
  sessionStore: new MyStore()
})
```

### Custom Agent Definition

```typescript
const agent = new OpenAgent({
  agent: {
    name: 'my-agent',
    systemPrompt: 'You are a specialized assistant...',
    allowedTools: ['read', 'write'],
  }
})
```

## File Structure

```
packages/openagent/
├── src/
│   ├── index.ts           # Main exports
│   ├── agent.ts           # OpenAgent class (high-level API)
│   ├── types.ts           # Type definitions
│   ├── core/
│   │   ├── session-store.ts  # SessionStore interface
│   │   ├── memory-store.ts   # Memory implementation
│   │   ├── session.ts        # Session operations
│   │   ├── agent.ts          # Agent definitions
│   │   └── llm.ts            # LLM streaming
│   ├── tool/
│   │   ├── define.ts         # Tool definition helpers
│   │   ├── registry.ts       # Tool registry
│   │   ├── builtin/          # Built-in tools
│   │   └── local/            # Local executors
│   ├── provider/
│   │   └── registry.ts       # Provider configuration
│   └── utils/
│       ├── id.ts             # ID generation
│       ├── error.ts          # Error classes
│       ├── token.ts          # Token counting
│       └── truncation.ts     # Output truncation
├── examples/
│   ├── simple.ts          # Simple usage example
│   └── advanced.ts        # Advanced usage example
└── dist/                  # Built output
```

## Design Principles

1. **Simplicity First**: The most common use case should be the simplest code
2. **Sensible Defaults**: Works out of the box with minimal configuration
3. **Escape Hatches**: Advanced users can access low-level APIs
4. **Type Safety**: Full TypeScript support with strict types
5. **No Side Effects**: Pure functions where possible, explicit state management
