/**
 * OpenAgent Tool Registry
 * Tool 注册与管理
 */

import type { Tool } from 'ai'
import type { ToolDefinition, AgentDefinition, ToolContext, AgentMode } from '../types'
import { isToolAllowedInMode } from '../types'
import { toAITool } from './define'
import { createLogger } from '../utils/log'

const log = createLogger('tool-registry')

// ============================================================================
// Registry State
// ============================================================================

const registeredTools: Map<string, ToolDefinition> = new Map()

// ============================================================================
// Public API
// ============================================================================

/**
 * 注册一个 Tool
 */
export function registerTool(tool: ToolDefinition): void {
  log.info('Registering tool', { id: tool.id })
  registeredTools.set(tool.id, tool)
}

/**
 * 批量注册 Tools
 */
export function registerTools(tools: ToolDefinition[]): void {
  for (const tool of tools) {
    registerTool(tool)
  }
}

/**
 * 获取已注册的 Tool
 */
export function getTool(id: string): ToolDefinition | undefined {
  return registeredTools.get(id)
}

/**
 * 获取所有已注册的 Tools
 */
export function getAllTools(): ToolDefinition[] {
  return Array.from(registeredTools.values())
}

/**
 * 移除已注册的 Tool
 */
export function unregisterTool(id: string): boolean {
  return registeredTools.delete(id)
}

/**
 * 清空所有注册的 Tools
 */
export function clearTools(): void {
  registeredTools.clear()
}

/**
 * 根据 Agent 配置筛选可用的 Tools
 */
export function getToolsForAgent(agent: AgentDefinition, mode?: AgentMode): ToolDefinition[] {
  const allTools = getAllTools()
  
  return allTools.filter((tool) => {
    // 首先检查模式权限
    if (mode && !isToolAllowedInMode(tool.id, mode)) {
      return false
    }
    
    // 如果指定了 allowedTools，只允许列表中的
    if (agent.allowedTools && agent.allowedTools.length > 0) {
      return agent.allowedTools.includes(tool.id)
    }
    
    // 如果指定了 deniedTools，排除列表中的
    if (agent.deniedTools && agent.deniedTools.length > 0) {
      return !agent.deniedTools.includes(tool.id)
    }
    
    // 默认允许所有
    return true
  })
}

/**
 * 获取适用于 Agent 的 AI SDK Tools
 */
export function getAIToolsForAgent(
  agent: AgentDefinition,
  ctx: Omit<ToolContext, 'callId'>,
  mode?: AgentMode
): Record<string, Tool> {
  const tools = getToolsForAgent(agent, mode)
  const result: Record<string, Tool> = {}
  
  for (const tool of tools) {
    result[tool.id] = toAITool(tool, ctx)
  }
  
  return result
}

/**
 * 获取指定模式下可用的工具列表
 */
export function getToolsForMode(mode: AgentMode): ToolDefinition[] {
  const allTools = getAllTools()
  return allTools.filter((tool) => isToolAllowedInMode(tool.id, mode))
}

/**
 * 获取 Tool 的描述列表（用于系统提示词）
 */
export function getToolDescriptions(tools: ToolDefinition[]): string {
  return tools
    .map((tool) => `- ${tool.id}: ${tool.description}`)
    .join('\n')
}
