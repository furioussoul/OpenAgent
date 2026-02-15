/**
 * OpenAgent LLM - LLM 抽象层
 * 基于 Vercel AI SDK v6 封装（开源版）
 */

import { streamText, stepCountIs, convertToModelMessages as aiConvertToModelMessages, type Tool, type UIMessage } from 'ai'
import type { ModelMessage } from '@ai-sdk/provider-utils'
import { getLanguageModel, calculateCost } from '../provider/registry'
import type { TokenUsage, MessageWithParts, AgentDefinition } from '../types'
import { createLogger } from '../utils/log'
import { truncateForAI, type SmartTruncationConfig } from '../utils/truncation'

const log = createLogger('llm')

// ============================================================================
// Configuration
// ============================================================================

const TOOL_OUTPUT_MAX_TOKENS = 10000

const TOOL_OUTPUT_TRUNCATION_CONFIG: Partial<SmartTruncationConfig> = {
  maxTokens: TOOL_OUTPUT_MAX_TOKENS,
  headRatio: 0.3,
  tailRatio: 0.7,
}

// ============================================================================
// Types
// ============================================================================

export interface LLMStreamInput {
  providerId: string
  modelId: string
  messages: ModelMessage[]
  system?: string
  tools?: Record<string, Tool>
  temperature?: number
  maxOutputTokens?: number
  maxSteps?: number
  abort?: AbortSignal
}

export interface LLMStreamResult {
  fullStream: AsyncIterable<LLMStreamEvent>
  textPromise: Promise<string>
  usagePromise: Promise<LLMUsage>
}

export interface LLMUsage {
  tokens: TokenUsage
  cost: number
}

export type LLMStreamEvent =
  | { type: 'text-delta'; text: string }
  | { type: 'reasoning-delta'; text: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; args: Record<string, unknown>; providerMetadata?: Record<string, unknown> }
  | { type: 'tool-result'; toolCallId: string; toolName: string; args: Record<string, unknown>; result: unknown }
  | { type: 'finish'; finishReason: string; usage: LLMUsage }
  | { type: 'error'; error: Error }

// ============================================================================
// Message Conversion
// ============================================================================

function toModelOutput(output: unknown) {
  if (typeof output === 'string') {
    return { type: 'text' as const, value: output }
  }
  if (typeof output === 'object' && output !== null) {
    const obj = output as { text?: string }
    if (obj.text !== undefined) {
      return { type: 'text' as const, value: obj.text }
    }
    return { type: 'json' as const, value: output }
  }
  return { type: 'json' as const, value: output }
}

/**
 * 将 OpenAgent 消息转换为 AI SDK v6 消息格式
 */
export async function toModelMessages(messages: MessageWithParts[]): Promise<ModelMessage[]> {
  const result: UIMessage[] = []
  const toolNames = new Set<string>()

  for (const msg of messages) {
    if (msg.parts.length === 0) continue

    if (msg.role === 'USER') {
      const userMessage: UIMessage = {
        id: msg.id,
        role: 'user',
        parts: [],
      }
      
      for (const part of msg.parts) {
        if (part.type === 'TEXT' && part.text) {
          userMessage.parts.push({
            type: 'text',
            text: part.text,
          })
        }
        if (part.type === 'FILE' && part.fileUrl) {
          if (part.fileMime?.startsWith('image/')) {
            userMessage.parts.push({
              type: 'file',
              url: part.fileUrl,
              mediaType: part.fileMime,
              filename: part.fileName,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)
          }
        }
      }
      
      if (userMessage.parts.length > 0) {
        result.push(userMessage)
      }
    } else if (msg.role === 'ASSISTANT') {
      const assistantMessage: UIMessage = {
        id: msg.id,
        role: 'assistant',
        parts: [],
      }

      for (const part of msg.parts) {
        if (part.type === 'TEXT' && part.text) {
          assistantMessage.parts.push({
            type: 'text',
            text: part.text,
          })
        }
        
        if (part.type === 'REASONING' && part.reasoning) {
          assistantMessage.parts.push({
            type: 'reasoning',
            text: part.reasoning,
          })
        }
        
        if (part.type === 'TOOL' && part.toolName && part.toolCallId) {
          toolNames.add(part.toolName)
          
          if (part.toolStatus === 'COMPLETED') {
            let output: string
            if (part.prunedAt) {
              output = `[Tool output pruned - use read_tool_output tool with partId="${part.id}" to retrieve if needed]`
            } else {
              const rawOutput = part.toolOutput || ''
              const truncateResult = truncateForAI(rawOutput, {
                ...TOOL_OUTPUT_TRUNCATION_CONFIG,
                partId: part.id,
              })
              output = truncateResult.content
            }
            
            assistantMessage.parts.push({
              type: `tool-${part.toolName}` as `tool-${string}`,
              state: 'output-available',
              toolCallId: part.toolCallId,
              input: part.toolInput || {},
              output,
              // 传回 providerMetadata (包含 Gemini 3 的 thoughtSignature)
              providerMetadata: part.toolMeta,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)
          } else if (part.toolStatus === 'ERROR') {
            assistantMessage.parts.push({
              type: `tool-${part.toolName}` as `tool-${string}`,
              state: 'output-error',
              toolCallId: part.toolCallId,
              input: part.toolInput || {},
              errorText: part.toolOutput || 'Tool execution failed',
              providerMetadata: part.toolMeta,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)
          } else {
            assistantMessage.parts.push({
              type: `tool-${part.toolName}` as `tool-${string}`,
              state: 'output-error',
              toolCallId: part.toolCallId,
              input: part.toolInput || {},
              errorText: '[Tool execution was interrupted]',
              providerMetadata: part.toolMeta,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any)
          }
        }
      }

      if (assistantMessage.parts.length > 0) {
        result.push(assistantMessage)
      }
    }
  }

  const tools = Object.fromEntries(
    Array.from(toolNames).map((toolName) => [toolName, { toModelOutput }])
  )

  let modelMessages = await aiConvertToModelMessages(result, {
    // @ts-expect-error convertToModelMessages expects a ToolSet but only actually needs tools[name]?.toModelOutput
    tools,
  })

  modelMessages = modelMessages
    .map((msg) => {
      if (typeof msg.content === 'string') {
        if (msg.content === '') return undefined
        return msg
      }
      if (!Array.isArray(msg.content)) return msg
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filtered = (msg.content as any[]).filter((part) => {
        if (part.type === 'text' || part.type === 'reasoning') {
          return part.text !== '' && part.text !== undefined
        }
        return true
      })
      
      if (filtered.length === 0) return undefined
      return { ...msg, content: filtered }
    })
    .filter((msg): msg is ModelMessage => msg !== undefined && msg.content !== '')

  return modelMessages
}

// ============================================================================
// Context Overflow Detection
// ============================================================================

const CONTEXT_OVERFLOW_PATTERNS = [
  /prompt is too long/i,
  /input is too long/i,
  /exceeds.*context/i,
  /token.*limit.*exceeded/i,
  /context.*overflow/i,
  /maximum.*context.*length/i,
  /too many tokens/i,
  /request too large/i,
]

export function isContextOverflowError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return CONTEXT_OVERFLOW_PATTERNS.some(pattern => pattern.test(message))
}

// ============================================================================
// LLM Stream
// ============================================================================

/**
 * 发起 LLM 流式请求
 */
export async function stream(input: LLMStreamInput): Promise<LLMStreamResult> {
  const { providerId, modelId, messages, system, tools, temperature, abort, maxSteps = 10 } = input

  log.info('Starting LLM stream', { 
    providerId, 
    modelId, 
    messageCount: messages.length,
    hasSystem: !!system,
    toolCount: tools ? Object.keys(tools).length : 0,
    maxSteps,
  })

  const model = getLanguageModel(providerId, modelId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const streamOptions: any = {
    model,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: messages as any,
    system,
    tools,
    temperature,
    abortSignal: abort,
    stopWhen: stepCountIs(maxSteps),
  }
  
  if (input.maxOutputTokens) {
    streamOptions.maxTokens = input.maxOutputTokens
  }
  
  const response = streamText(streamOptions)

  let resolvedUsage: LLMUsage | null = null

  async function* convertStream(): AsyncIterable<LLMStreamEvent> {
    try {
      for await (const event of (await response).fullStream) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e = event as any
        switch (e.type) {
          case 'text-delta':
            yield { type: 'text-delta', text: e.text ?? e.textDelta ?? '' }
            break

          case 'reasoning-delta':
            yield { type: 'reasoning-delta', text: e.text ?? e.textDelta ?? '' }
            break

          case 'tool-call':
            yield {
              type: 'tool-call',
              toolCallId: e.toolCallId,
              toolName: e.toolName,
              args: (e.args ?? e.input ?? {}) as Record<string, unknown>,
              providerMetadata: e.providerMetadata as Record<string, unknown> | undefined,
            }
            break

          case 'tool-result':
            yield {
              type: 'tool-result',
              toolCallId: e.toolCallId,
              toolName: e.toolName,
              args: (e.args ?? e.input ?? {}) as Record<string, unknown>,
              result: e.result ?? e.output,
            }
            break

          case 'finish':
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const usage = await (await response).usage as any
            const tokens: TokenUsage = {
              input: usage?.inputTokens ?? usage?.promptTokens ?? 0,
              output: usage?.outputTokens ?? usage?.completionTokens ?? 0,
            }
            const cost = calculateCost(providerId, modelId, tokens)
            resolvedUsage = { tokens, cost }
            yield {
              type: 'finish',
              finishReason: e.finishReason,
              usage: resolvedUsage,
            }
            break

          case 'error':
            yield { type: 'error', error: e.error as Error }
            break
        }
      }
    } catch (error) {
      log.error('LLM stream error', { error: String(error) })
      yield { type: 'error', error: error as Error }
    }
  }

  return {
    fullStream: convertStream(),
    textPromise: (async () => {
      const result = await response
      return await result.text
    })(),
    usagePromise: (async () => {
      if (resolvedUsage) return resolvedUsage
      const result = await response
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usage = await result.usage as any
      const tokens: TokenUsage = {
        input: usage?.inputTokens ?? usage?.promptTokens ?? 0,
        output: usage?.outputTokens ?? usage?.completionTokens ?? 0,
      }
      return {
        tokens,
        cost: calculateCost(providerId, modelId, tokens),
      }
    })(),
  }
}

// ============================================================================
// System Prompt Builder
// ============================================================================

const TOOL_USAGE_GUIDELINES = `
## Tool Usage Guidelines

### Parallel Tool Execution
- You can call multiple tools in a single response when the calls are independent
- This significantly reduces latency when you need to:
  - Read multiple files
  - Run multiple searches
  - Fetch multiple web pages
`

/**
 * 构建系统提示词
 */
export function buildSystemPrompt(agent: AgentDefinition, additionalContext?: string): string {
  const parts: string[] = []

  parts.push(agent.systemPrompt)
  parts.push(TOOL_USAGE_GUIDELINES)

  if (additionalContext) {
    parts.push('')
    parts.push(additionalContext)
  }

  return parts.join('\n')
}
