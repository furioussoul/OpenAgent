/**
 * OpenAgent Token Utilities
 * Token 计数和管理工具
 */

import { getEncoding, type Tiktoken } from 'js-tiktoken'
import type { ModelMessage } from '@ai-sdk/provider-utils'

// ============================================================================
// Token Encoder
// ============================================================================

let encoder: Tiktoken | null = null

/**
 * 获取或初始化 tokenizer
 * 使用 cl100k_base 编码，兼容 Claude 和 GPT-4
 */
function getEncoder(): Tiktoken {
  if (!encoder) {
    encoder = getEncoding('cl100k_base')
  }
  return encoder
}

// ============================================================================
// Token Counting
// ============================================================================

/**
 * 估算文本的 token 数量
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  try {
    return getEncoder().encode(text).length
  } catch {
    // 降级：按字符数估算（约 4 字符 = 1 token）
    return Math.ceil(text.length / 4)
  }
}

/**
 * 估算 JSON 对象的 token 数量
 */
export function estimateJsonTokens(obj: unknown): number {
  try {
    return estimateTokens(JSON.stringify(obj))
  } catch {
    return 0
  }
}

/**
 * 估算单条消息的 token 数量
 */
export function estimateMessageTokens(message: ModelMessage): number {
  let tokens = 0
  
  // 消息角色开销（约 4 tokens）
  tokens += 4
  
  // 计算内容
  if (typeof message.content === 'string') {
    tokens += estimateTokens(message.content)
  } else if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (part.type === 'text') {
        tokens += estimateTokens(part.text)
      } else if (part.type === 'image') {
        // 图片按固定值估算（约 765 tokens for low detail, 2000+ for high）
        tokens += 1000
      } else if (part.type === 'tool-call') {
        tokens += estimateTokens(part.toolName)
        tokens += estimateJsonTokens(part.input)
      } else if (part.type === 'tool-result') {
        tokens += estimateJsonTokens(part.output)
      }
    }
  }
  
  return tokens
}

/**
 * 估算消息列表的总 token 数
 */
export function estimateMessagesTokens(messages: ModelMessage[]): number {
  let total = 0
  for (const message of messages) {
    total += estimateMessageTokens(message)
  }
  // 添加系统开销（约 3 tokens）
  total += 3
  return total
}

/**
 * 估算系统提示词的 token 数
 */
export function estimateSystemTokens(system: string | undefined): number {
  if (!system) return 0
  return estimateTokens(system) + 4 // 4 tokens 作为角色开销
}

// ============================================================================
// Token Limit Checking
// ============================================================================

export interface TokenLimitConfig {
  contextWindow: number
  bufferTokens?: number  // 默认 20000
}

/**
 * 检查是否接近上下文限制
 */
export function isApproachingLimit(
  currentTokens: number,
  config: TokenLimitConfig
): boolean {
  const buffer = config.bufferTokens ?? 20_000
  const limit = config.contextWindow
  return currentTokens >= (limit - buffer)
}

/**
 * 计算可用的剩余 token 数
 */
export function getRemainingTokens(
  currentTokens: number,
  config: TokenLimitConfig
): number {
  const buffer = config.bufferTokens ?? 20_000
  const limit = config.contextWindow
  return Math.max(0, limit - buffer - currentTokens)
}

/**
 * 获取建议的最大输出 token 数
 * 确保不超过模型限制和剩余空间
 */
export function getSuggestedMaxOutput(
  currentTokens: number,
  config: TokenLimitConfig & { maxOutput?: number }
): number {
  const remaining = getRemainingTokens(currentTokens, config)
  const modelMax = config.maxOutput ?? 16000
  return Math.min(remaining, modelMax)
}
