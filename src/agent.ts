/**
 * OpenAgent - High-Level API
 * 
 * 简化的 Agent 接口，封装了所有底层细节。
 * 
 * @example
 * ```typescript
 * const agent = new OpenAgent({
 *   provider: 'anthropic',
 *   model: 'claude-3-5-sonnet-20241022',
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 * })
 * 
 * // 简单对话
 * const result = await agent.chat('List files in current directory')
 * console.log(result.text)
 * 
 * // 流式对话
 * for await (const event of agent.stream('Create a React component')) {
 *   if (event.type === 'text') console.log(event.text)
 * }
 * ```
 */

import type { Tool as _Tool } from 'ai'
import type { 
  AgentDefinition, 
  AgentMode, 
  TokenUsage, 
  ToolContext,
  ToolResult,
  MessageWithParts as _MessageWithParts,
  ToolStatus,
} from './types'
import { 
  setSessionStore, 
  createMemoryStore, 
  MemorySessionStore as _MemorySessionStore,
  createSession,
  getSession,
  getSessionMessages,
  batchSaveMessage,
  type SessionStore,
  type CreatePartInput,
} from './core'
import { getAgent as _getAgent, registerAgent } from './core/agent'
import { stream as llmStream, toModelMessages, buildSystemPrompt, type LLMStreamEvent as _LLMStreamEvent } from './core/llm'
import { 
  registerTools, 
  builtinTools, 
  getAIToolsForAgent, 
  getTool,
  defineTool as _defineTool,
} from './tool'
import type { ToolDefinition } from './types'
import { 
  configureProviders as _configureProviders, 
  configureProvider, 
  getDefaultModel as _getDefaultModel,
  type ProviderConfig 
} from './provider'
import { createLogger, partId as _partId, toolCallId as _toolCallId } from './utils'

const log = createLogger('OpenAgent')

// ============================================================================
// Types
// ============================================================================

/** Provider 类型 */
export type ProviderType = 'anthropic' | 'openai' | 'google' | 'zhipu' | 'kimi'

/** OpenAgent 配置选项 */
export interface OpenAgentOptions {
  /** Provider 类型 */
  provider?: ProviderType
  
  /** 模型 ID */
  model?: string
  
  /** API Key */
  apiKey?: string
  
  /** 自定义 baseURL（用于 OpenAI 兼容 API） */
  baseURL?: string
  
  /** 自定义 headers */
  headers?: Record<string, string>
  
  /** 完整的 Provider 配置（高级用法） */
  providerConfig?: ProviderConfig
  
  /** Agent 定义（自定义 system prompt） */
  agent?: AgentDefinition
  
  /** 工作目录 */
  workingDirectory?: string
  
  /** 是否注册内置工具（默认 true） */
  useBuiltinTools?: boolean
  
  /** 自定义工具 */
  tools?: ToolDefinition[]
  
  /** 自定义 SessionStore */
  sessionStore?: SessionStore
  
  /** Agent 模式 */
  mode?: AgentMode
  
  /** 最大工具调用步数（默认 10） */
  maxSteps?: number
  
  /** 温度参数 */
  temperature?: number
  
  /** 最大输出 token */
  maxOutputTokens?: number
}

/** Chat 结果 */
export interface ChatResult {
  /** 最终文本响应 */
  text: string
  
  /** 工具调用记录 */
  toolCalls: ToolCallRecord[]
  
  /** Token 使用量 */
  usage: TokenUsage
  
  /** 总费用（美元） */
  cost: number
  
  /** 完成原因 */
  finishReason: string
  
  /** Session ID（可用于继续对话） */
  sessionId: string
}

/** 工具调用记录 */
export interface ToolCallRecord {
  name: string
  input: Record<string, unknown>
  output: string
  status: ToolStatus
}

/** 流式事件 */
export type AgentStreamEvent =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'tool-start'; name: string; input: Record<string, unknown> }
  | { type: 'tool-end'; name: string; output: string }
  | { type: 'done'; result: ChatResult }
  | { type: 'error'; error: Error }

// ============================================================================
// Default Models
// ============================================================================

const DEFAULT_MODELS: Record<ProviderType, { id: string; contextWindow: number; maxOutput: number }> = {
  anthropic: { 
    id: 'claude-sonnet-4-20250514', 
    contextWindow: 200000, 
    maxOutput: 8192 
  },
  openai: { 
    id: 'gpt-5-mini', 
    contextWindow: 128000, 
    maxOutput: 4096 
  },
  google: { 
    id: 'gemini-3-flash-preview', 
    contextWindow: 1000000, 
    maxOutput: 8192 
  },
  zhipu: {
    id: 'glm-4.7',
    contextWindow: 128000,
    maxOutput: 8192
  },
  kimi: {
    id: 'kimi-k2.5-free',
    contextWindow: 128000,
    maxOutput: 8192
  },
}

// ============================================================================
// OpenAgent Class
// ============================================================================

/**
 * OpenAgent - 高层 API
 * 
 * 封装了 Session、Message、Tool 等底层细节，
 * 提供简单的 chat() 和 stream() 方法。
 */
export class OpenAgent {
  private providerId: string
  private modelId: string
  private agent: AgentDefinition
  private mode: AgentMode
  private maxSteps: number
  private temperature?: number
  private maxOutputTokens?: number
  private workingDirectory: string
  private sessionId?: string
  private initialized = false
  private customTools: ToolDefinition[] = []

  constructor(private options: OpenAgentOptions = {}) {
    // 设置默认值
    const providerType = options.provider ?? 'anthropic'
    const defaultModel = DEFAULT_MODELS[providerType]
    
    this.providerId = providerType
    this.modelId = options.model ?? defaultModel.id
    this.mode = options.mode ?? 'build'
    this.maxSteps = options.maxSteps ?? 10
    this.temperature = options.temperature
    this.maxOutputTokens = options.maxOutputTokens
    this.workingDirectory = options.workingDirectory ?? process.cwd()
    this.customTools = options.tools ?? []
    
    // 设置 Agent
    this.agent = options.agent ?? {
      name: 'default',
      systemPrompt: `You are a helpful AI assistant with access to tools.

When working on tasks:
1. Understand the request fully before acting
2. Use tools to gather information and make changes
3. Be precise and verify your work

You can read, write, and edit files, search code, and execute commands.`,
    }
  }

  /**
   * 初始化（延迟初始化，首次调用时执行）
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return

    log.info('Initializing OpenAgent...')

    // 1. 设置 SessionStore
    if (this.options.sessionStore) {
      setSessionStore(this.options.sessionStore)
    } else {
      setSessionStore(createMemoryStore())
    }

    // 2. 配置 Provider
    if (this.options.providerConfig) {
      configureProvider(this.options.providerConfig)
    } else if (this.options.apiKey) {
      const providerType = this.options.provider ?? 'anthropic'
      const defaultModel = DEFAULT_MODELS[providerType]
      
      configureProvider({
        id: providerType,
        name: providerType.charAt(0).toUpperCase() + providerType.slice(1),
        type: providerType,
        options: {
          apiKey: this.options.apiKey,
          baseURL: this.options.baseURL,
          headers: this.options.headers,
        },
        models: [{
          id: this.modelId,
          name: this.modelId,
          contextWindow: defaultModel.contextWindow,
          maxOutput: defaultModel.maxOutput,
          supportsFunctions: true,
          supportsVision: true,
          supportsStreaming: true,
        }],
      })
    }

    // 3. 注册工具
    if (this.options.useBuiltinTools !== false) {
      registerTools(builtinTools)
      log.info('Registered builtin tools', { count: builtinTools.length })
    }
    
    // 注册自定义工具
    if (this.customTools.length > 0) {
      registerTools(this.customTools)
      log.info('Registered custom tools', { count: this.customTools.length })
    }

    // 4. 注册 Agent
    registerAgent(this.agent)

    this.initialized = true
    log.info('OpenAgent initialized', { 
      provider: this.providerId, 
      model: this.modelId,
      mode: this.mode,
    })
  }

  /**
   * 获取或创建 Session
   */
  private async getOrCreateSession(): Promise<string> {
    await this.ensureInitialized()
    
    if (this.sessionId) {
      const session = await getSession(this.sessionId)
      if (session) return this.sessionId
    }
    
    const session = await createSession({
      agent: this.agent.name,
      mode: this.mode,
    })
    this.sessionId = session.id
    return session.id
  }

  /**
   * 构建 ToolContext
   */
  private createToolContext(sessionId: string, messageId: string): ToolContext {
    const abortController = new AbortController()
    
    return {
      sessionId,
      messageId,
      agent: this.agent.name,
      abort: abortController.signal,
      workingDirectory: this.workingDirectory,
      model: {
        providerId: this.providerId,
        modelId: this.modelId,
      },
      metadata: async () => {},
      ask: async () => {},
    }
  }

  /**
   * 执行工具调用
   */
  private async executeTool(
    toolName: string, 
    args: Record<string, unknown>,
    ctx: ToolContext
  ): Promise<ToolResult> {
    const tool = getTool(toolName)
    if (!tool) {
      return {
        title: `Unknown tool: ${toolName}`,
        output: `Error: Tool "${toolName}" is not registered`,
      }
    }
    
    try {
      return await tool.execute(args, ctx)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        title: `Tool error: ${toolName}`,
        output: `Error executing tool: ${message}`,
      }
    }
  }

  /**
   * 非流式对话（AI SDK 自动多步）
   */
  async chat(message: string, options?: { sessionId?: string }): Promise<ChatResult> {
    await this.ensureInitialized()
    
    // 获取或创建 session
    const sessionId = options?.sessionId ?? await this.getOrCreateSession()
    
    // 保存用户消息
    await batchSaveMessage({
      sessionId,
      role: 'USER',
      parts: [{ type: 'TEXT', text: message }],
    })
    
    // 准备上下文
    const msgId = `msg_${Date.now()}`
    const ctx = this.createToolContext(sessionId, msgId)
    const tools = getAIToolsForAgent(this.agent, ctx, this.mode)
    
    // 获取消息历史
    const messages = await getSessionMessages(sessionId)
    const modelMessages = await toModelMessages(messages)
    
    // 调用 LLM（AI SDK 自动处理多步工具调用）
    const result = await llmStream({
      providerId: this.providerId,
      modelId: this.modelId,
      messages: modelMessages,
      system: buildSystemPrompt(this.agent),
      tools,
      temperature: this.temperature,
      maxOutputTokens: this.maxOutputTokens,
      maxSteps: this.maxSteps, // AI SDK 自动处理多步
    })
    
    // 收集响应
    let fullText = ''
    const toolCalls: ToolCallRecord[] = []
    const totalUsage: TokenUsage = { input: 0, output: 0 }
    let totalCost = 0
    let finishReason = 'unknown'
    const assistantParts: CreatePartInput[] = []
    
    for await (const event of result.fullStream) {
      switch (event.type) {
        case 'text-delta':
          fullText += event.text
          break
        case 'tool-call':
          // AI SDK 会自动执行工具，这里只记录调用
          log.debug(`Tool call: ${event.toolName}`, { args: event.args })
          break
        case 'tool-result':
          // 工具执行完成，记录结果
          toolCalls.push({
            name: event.toolName,
            input: event.args,
            output: String(event.result),
            status: 'COMPLETED',
          })
          assistantParts.push({
            type: 'TOOL',
            toolName: event.toolName,
            toolCallId: event.toolCallId,
            toolInput: event.args,
            toolOutput: String(event.result),
            toolStatus: 'COMPLETED',
          })
          break
        case 'finish':
          finishReason = event.finishReason
          totalUsage.input += event.usage.tokens.input
          totalUsage.output += event.usage.tokens.output
          totalCost += event.usage.cost
          break
      }
    }
    
    // 保存 assistant 消息
    if (fullText) {
      assistantParts.unshift({ type: 'TEXT', text: fullText })
    }
    
    if (assistantParts.length > 0) {
      await batchSaveMessage({
        sessionId,
        role: 'ASSISTANT',
        parts: assistantParts,
      })
    }
    
    return {
      text: fullText,
      toolCalls,
      usage: totalUsage,
      cost: totalCost,
      finishReason,
      sessionId,
    }
  }

  /**
   * 流式对话（AI SDK 自动多步）
   */
  async *stream(message: string, options?: { sessionId?: string }): AsyncGenerator<AgentStreamEvent> {
    await this.ensureInitialized()
    
    // 获取或创建 session
    const sessionId = options?.sessionId ?? await this.getOrCreateSession()
    
    // 保存用户消息
    await batchSaveMessage({
      sessionId,
      role: 'USER',
      parts: [{ type: 'TEXT', text: message }],
    })
    
    // 准备上下文
    const msgId = `msg_${Date.now()}`
    const ctx = this.createToolContext(sessionId, msgId)
    const tools = getAIToolsForAgent(this.agent, ctx, this.mode)
    
    // 获取消息历史
    const messages = await getSessionMessages(sessionId)
    const modelMessages = await toModelMessages(messages)
    
    // 收集响应
    let fullText = ''
    const toolCalls: ToolCallRecord[] = []
    const totalUsage: TokenUsage = { input: 0, output: 0 }
    let totalCost = 0
    let finishReason = 'unknown'
    const assistantParts: CreatePartInput[] = []
    
    try {
      // 调用 LLM（AI SDK 自动处理多步工具调用）
      const result = await llmStream({
        providerId: this.providerId,
        modelId: this.modelId,
        messages: modelMessages,
        system: buildSystemPrompt(this.agent),
        tools,
        temperature: this.temperature,
        maxOutputTokens: this.maxOutputTokens,
        maxSteps: this.maxSteps, // AI SDK 自动处理多步
      })
      
      for await (const event of result.fullStream) {
        switch (event.type) {
          case 'text-delta':
            fullText += event.text
            yield { type: 'text', text: event.text }
            break
          case 'reasoning-delta':
            yield { type: 'reasoning', text: event.text }
            break
          case 'tool-call':
            // AI SDK 会自动执行工具
            yield { 
              type: 'tool-start', 
              name: event.toolName, 
              input: event.args,
            }
            break
          case 'tool-result':
            // 工具执行完成
            toolCalls.push({
              name: event.toolName,
              input: event.args,
              output: String(event.result),
              status: 'COMPLETED',
            })
            assistantParts.push({
              type: 'TOOL',
              toolName: event.toolName,
              toolCallId: event.toolCallId,
              toolInput: event.args,
              toolOutput: String(event.result),
              toolStatus: 'COMPLETED',
            })
            yield { 
              type: 'tool-end', 
              name: event.toolName, 
              output: String(event.result),
            }
            break
          case 'finish':
            finishReason = event.finishReason
            totalUsage.input += event.usage.tokens.input
            totalUsage.output += event.usage.tokens.output
            totalCost += event.usage.cost
            break
          case 'error':
            yield { type: 'error', error: event.error }
            return
        }
      }
      
      // 保存 assistant 消息
      if (fullText) {
        assistantParts.unshift({ type: 'TEXT', text: fullText })
      }
      
      if (assistantParts.length > 0) {
        await batchSaveMessage({
          sessionId,
          role: 'ASSISTANT',
          parts: assistantParts,
        })
      }
      
      // 发送完成事件
      yield {
        type: 'done',
        result: {
          text: fullText,
          toolCalls,
          usage: totalUsage,
          cost: totalCost,
          finishReason,
          sessionId,
        },
      }
    } catch (error) {
      yield { type: 'error', error: error as Error }
    }
  }

  /**
   * 继续已有会话
   */
  continueSession(sessionId: string): OpenAgent {
    this.sessionId = sessionId
    return this
  }

  /**
   * 开始新会话
   */
  newSession(): OpenAgent {
    this.sessionId = undefined
    return this
  }

  /**
   * 添加自定义工具
   */
  addTool(tool: ToolDefinition): OpenAgent {
    this.customTools.push(tool)
    if (this.initialized) {
      registerTools([tool])
    }
    return this
  }

  /**
   * 设置模式
   */
  setMode(mode: AgentMode): OpenAgent {
    this.mode = mode
    return this
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * 创建 OpenAgent 实例（简便方法）
 */
export function createAgent(options?: OpenAgentOptions): OpenAgent {
  return new OpenAgent(options)
}

/**
 * 快速创建 Anthropic Agent
 */
export function anthropic(apiKey: string, model?: string): OpenAgent {
  return new OpenAgent({
    provider: 'anthropic',
    apiKey,
    model: model ?? 'claude-sonnet-4-20250514',
  })
}

/**
 * 快速创建 OpenAI Agent
 */
export function openai(apiKey: string, model?: string): OpenAgent {
  return new OpenAgent({
    provider: 'openai',
    apiKey,
    model: model ?? 'gpt-4o',
  })
}

/**
 * 快速创建 Google Agent
 */
export function google(apiKey: string, model?: string): OpenAgent {
  return new OpenAgent({
    provider: 'google',
    apiKey,
    model: model ?? 'gemini-3-flash-preview',
  })
}

/**
 * 快速创建 Zhipu/GLM Agent
 */
export function zhipu(apiKey: string, model?: string): OpenAgent {
  return new OpenAgent({
    provider: 'zhipu',
    apiKey,
    model: model ?? 'glm-4.7',
  })
}

/**
 * 快速创建 Kimi Agent
 */
export function kimi(apiKey: string, model?: string): OpenAgent {
  return new OpenAgent({
    provider: 'kimi',
    apiKey,
    model: model ?? 'kimi-k2.5-free',
  })
}
