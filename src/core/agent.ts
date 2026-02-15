/**
 * OpenAgent Agent Manager
 * Agent 定义与管理（开源版 - 内存存储）
 */

import type { AgentDefinition } from '../types'
import { AgentNotFoundError } from '../utils/error'

// ============================================================================
// 默认 Agent 定义
// ============================================================================

const DEFAULT_AGENTS: Record<string, AgentDefinition> = {
  'general': {
    name: 'general',
    displayName: 'General Assistant',
    description: 'A general-purpose AI assistant',
    systemPrompt: `You are a helpful AI assistant.

You have access to tools that allow you to:
- Read, write, and edit files
- Search files with glob patterns
- Search file contents with grep
- Execute bash commands
- Fetch web content

When working on tasks:
1. First understand the request fully
2. Break down complex tasks into steps
3. Use tools to gather information before making changes
4. Verify your changes work as expected

Be precise, efficient, and thorough in your work.`,
  },
  
  'coder': {
    name: 'coder',
    displayName: 'Code Assistant',
    description: 'Specialized in writing and modifying code',
    systemPrompt: `You are an expert software developer AI assistant.

## Your Capabilities
- Read and analyze code files
- Write new code and create files
- Edit existing code with precise modifications
- Search codebases efficiently
- Execute commands to test and build code

## Code Quality Guidelines
- Write clean, maintainable code
- Follow existing code style and conventions
- Include appropriate comments and documentation
- Handle errors gracefully
- Use TypeScript types properly

## Working Process
1. Understand the requirements
2. Explore the codebase to understand the context
3. Plan your changes
4. Implement changes incrementally
5. Verify changes work correctly

Be precise with edits - always read a file before editing it to ensure accuracy.`,
  },
}

// ============================================================================
// Runtime State
// ============================================================================

/** 运行时 Agent 配置（可覆盖默认配置） */
const runtimeAgents: Map<string, AgentDefinition> = new Map()

// ============================================================================
// Public API
// ============================================================================

/**
 * 获取默认 Agent 定义
 */
export function getDefaultAgent(name: string): AgentDefinition | undefined {
  return DEFAULT_AGENTS[name]
}

/**
 * 获取所有默认 Agent 名称
 */
export function getDefaultAgentNames(): string[] {
  return Object.keys(DEFAULT_AGENTS)
}

/**
 * 获取所有可用的 Agent 名称（包括运行时注册的）
 */
export function getAllAgentNames(): string[] {
  const names = new Set([
    ...Object.keys(DEFAULT_AGENTS),
    ...runtimeAgents.keys(),
  ])
  return Array.from(names)
}

/**
 * 获取 Agent 定义
 */
export function getAgent(name: string): AgentDefinition {
  // 优先使用运行时配置
  const runtimeAgent = runtimeAgents.get(name)
  if (runtimeAgent) {
    return runtimeAgent
  }
  
  // 使用默认 Agent
  const defaultAgent = DEFAULT_AGENTS[name]
  if (!defaultAgent) {
    throw new AgentNotFoundError(name)
  }
  
  return defaultAgent
}

/**
 * 注册或更新 Agent 定义
 */
export function registerAgent(agent: AgentDefinition): void {
  runtimeAgents.set(agent.name, agent)
}

/**
 * 批量注册 Agents
 */
export function registerAgents(agents: AgentDefinition[]): void {
  for (const agent of agents) {
    registerAgent(agent)
  }
}

/**
 * 移除已注册的 Agent
 */
export function unregisterAgent(name: string): boolean {
  return runtimeAgents.delete(name)
}

/**
 * 清空所有运行时注册的 Agents
 */
export function clearAgents(): void {
  runtimeAgents.clear()
}
