/**
 * OpenAgent Tool Output Truncation
 * Tool 输出截断工具（开源版 - 不依赖数据库）
 */

import { estimateTokens } from './token'
import { createLogger } from './log'

const log = createLogger('truncation')

// ============================================================================
// Configuration
// ============================================================================

export interface TruncationConfig {
  maxLines: number
  maxBytes: number
  lineMaxLength: number
}

export const DEFAULT_TRUNCATION_CONFIG: TruncationConfig = {
  maxLines: 2000,
  maxBytes: 50 * 1024,
  lineMaxLength: 2000,
}

// ============================================================================
// Simple Truncation
// ============================================================================

/**
 * 截断单行文本
 */
function truncateLine(line: string, maxLength: number): string {
  if (line.length <= maxLength) return line
  return line.substring(0, maxLength) + '... (line truncated)'
}

/**
 * 简单截断
 */
export function truncateSimple(
  text: string,
  maxLength: number = 100000
): { content: string; truncated: boolean } {
  if (text.length <= maxLength) {
    return { content: text, truncated: false }
  }
  
  return {
    content: text.substring(0, maxLength) + '\n\n... (output truncated)',
    truncated: true,
  }
}

/**
 * 截断 Tool 输出（同步版本，不保存到数据库）
 */
export function truncateToolOutput(
  output: string,
  config?: Partial<TruncationConfig>
): { content: string; truncated: boolean } {
  const cfg = { ...DEFAULT_TRUNCATION_CONFIG, ...config }
  
  const lines = output.split('\n')
  const totalBytes = Buffer.byteLength(output, 'utf-8')
  
  // 检查是否需要截断
  if (lines.length <= cfg.maxLines && totalBytes <= cfg.maxBytes) {
    const truncatedLines = lines.map(line => truncateLine(line, cfg.lineMaxLength))
    return {
      content: truncatedLines.join('\n'),
      truncated: false,
    }
  }
  
  // 需要截断
  const truncatedLines: string[] = []
  let currentBytes = 0
  
  for (let i = 0; i < lines.length && i < cfg.maxLines; i++) {
    const line = truncateLine(lines[i], cfg.lineMaxLength)
    const lineBytes = Buffer.byteLength(line, 'utf-8') + 1
    
    if (currentBytes + lineBytes > cfg.maxBytes) {
      break
    }
    
    truncatedLines.push(line)
    currentBytes += lineBytes
  }
  
  const removedLines = lines.length - truncatedLines.length
  const removedBytes = totalBytes - currentBytes
  
  const hint = `\n\n... (${removedLines} lines / ${removedBytes} bytes truncated)`
  
  return {
    content: truncatedLines.join('\n') + hint,
    truncated: true,
  }
}

// ============================================================================
// Smart Truncation for AI Context
// ============================================================================

export interface SmartTruncationConfig {
  maxTokens: number
  headRatio: number
  tailRatio: number
  partId?: string
}

export const DEFAULT_SMART_TRUNCATION_CONFIG: SmartTruncationConfig = {
  maxTokens: 10000,
  headRatio: 0.3,
  tailRatio: 0.7,
}

export interface SmartTruncateResult {
  content: string
  truncated: boolean
  originalTokens: number
  keptTokens: number
}

/**
 * 智能截断：保留头部 + 尾部
 */
export function truncateForAI(
  text: string,
  config?: Partial<SmartTruncationConfig>
): SmartTruncateResult {
  const cfg = { ...DEFAULT_SMART_TRUNCATION_CONFIG, ...config }
  
  const originalTokens = estimateTokens(text)
  
  if (originalTokens <= cfg.maxTokens) {
    return {
      content: text,
      truncated: false,
      originalTokens,
      keptTokens: originalTokens,
    }
  }
  
  const lines = text.split('\n')
  const totalLines = lines.length
  
  const headTokens = Math.floor(cfg.maxTokens * cfg.headRatio)
  const tailTokens = Math.floor(cfg.maxTokens * cfg.tailRatio)
  
  // 收集头部行
  const headLines: string[] = []
  let headTokenCount = 0
  for (let i = 0; i < lines.length; i++) {
    const lineTokens = estimateTokens(lines[i])
    if (headTokenCount + lineTokens > headTokens) {
      break
    }
    headLines.push(lines[i])
    headTokenCount += lineTokens
  }
  
  // 收集尾部行
  const tailLines: string[] = []
  let tailTokenCount = 0
  for (let i = lines.length - 1; i >= headLines.length; i--) {
    const lineTokens = estimateTokens(lines[i])
    if (tailTokenCount + lineTokens > tailTokens) {
      break
    }
    tailLines.unshift(lines[i])
    tailTokenCount += lineTokens
  }
  
  const omittedLines = totalLines - headLines.length - tailLines.length
  const omittedTokens = originalTokens - headTokenCount - tailTokenCount
  
  const separator = cfg.partId
    ? `\n\n... [${omittedLines} lines / ~${omittedTokens} tokens omitted]\n` +
      `[Use read_tool_output with partId="${cfg.partId}" to see full content]\n\n`
    : `\n\n... [${omittedLines} lines / ~${omittedTokens} tokens omitted]\n\n`
  
  const truncatedContent = headLines.join('\n') + separator + tailLines.join('\n')
  const keptTokens = headTokenCount + tailTokenCount + estimateTokens(separator)
  
  log.debug('Smart truncation applied', {
    originalTokens,
    keptTokens,
    headLines: headLines.length,
    tailLines: tailLines.length,
    omittedLines,
  })
  
  return {
    content: truncatedContent,
    truncated: true,
    originalTokens,
    keptTokens,
  }
}
