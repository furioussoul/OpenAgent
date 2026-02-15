/**
 * OpenAgent - AI Agent Framework
 * 
 * A lightweight, extensible AI Agent framework with:
 * - Tool calling support
 * - MCP (Model Context Protocol) integration
 * - Streaming responses
 * - Pluggable session storage
 * 
 * @example Simple Usage (Recommended)
 * ```typescript
 * import { OpenAgent, anthropic } from 'mycto_agent'
 * 
 * // Quick start with factory function
 * const agent = anthropic(process.env.ANTHROPIC_API_KEY)
 * 
 * // Non-streaming chat
 * const result = await agent.chat('List files in current directory')
 * console.log(result.text)
 * console.log(result.toolCalls)
 * 
 * // Streaming chat
 * for await (const event of agent.stream('Create a React component')) {
 *   if (event.type === 'text') process.stdout.write(event.text)
 *   if (event.type === 'tool-start') console.log(`\nUsing tool: ${event.name}`)
 * }
 * ```
 * 
 * @example Advanced Usage
 * ```typescript
 * import { OpenAgent, defineTool } from 'mycto_agent'
 * 
 * const agent = new OpenAgent({
 *   provider: 'anthropic',
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 *   model: 'claude-sonnet-4-20250514',
 *   tools: [myCustomTool],
 *   mode: 'build',
 * })
 * 
 * const result = await agent.chat('Help me refactor this code')
 * ```
 */

// ============================================================================
// High-Level API (Recommended)
// ============================================================================

export {
  OpenAgent,
  createAgent,
  anthropic,
  openai,
  google,
  zhipu,
  kimi,
  type OpenAgentOptions,
  type ChatResult,
  type ToolCallRecord,
  type AgentStreamEvent,
  type ProviderType,
} from './agent'

// ============================================================================
// Core Exports (Low-Level API)
// ============================================================================

export {
  // Session Store
  setSessionStore,
  getSessionStore,
  hasSessionStore,
  type SessionStore,
  
  // Memory Store
  MemorySessionStore,
  createMemoryStore,
  
  // Session Operations
  createSession,
  getSession,
  updateSession,
  deleteSession,
  listSessions,
  createMessage,
  getMessage,
  updateMessage,
  getSessionMessages,
  createPart,
  updatePart,
  batchSaveMessage,
  batchUpdateSession,
  type CreatePartInput,
  type BatchSaveMessageInput,
  
  // Agent Management
  getAgent,
  getDefaultAgent,
  getDefaultAgentNames,
  getAllAgentNames,
  registerAgent,
  registerAgents,
  unregisterAgent,
  clearAgents,
  
  // LLM
  llmStream,
  toModelMessages,
  buildSystemPrompt,
  isContextOverflowError,
  type LLMStreamInput,
  type LLMStreamResult,
  type LLMUsage,
  type LLMStreamEvent,
} from './core'

// ============================================================================
// Tool Exports
// ============================================================================

export {
  // Tool Definition
  defineTool,
  toAITool,
  toAITools,
  
  // Tool Registry
  registerTool,
  registerTools,
  getTool,
  getAllTools,
  unregisterTool,
  clearTools,
  getToolsForAgent,
  getAIToolsForAgent,
  getToolsForMode,
  getToolDescriptions,
  
  // Built-in Tools
  readTool,
  writeTool,
  editTool,
  globTool,
  grepTool,
  bashTool,
  webfetchTool,
  questionTool,
  taskTool,
  todowriteTool,
  todoreadTool,
  skillTool,
  builtinTools,
  getBuiltinTools,
  
  // Todo management
  getTodos,
  setTodos,
  clearTodos,
  type TodoItem,
  type TodoStatus,
  type TodoPriority,
  
  // Skill management
  registerSkill,
  getAvailableSkills,
  type SkillDefinition,
  
  // Local Executors
  localBashExecutor,
  localReadExecutor,
  localWriteExecutor,
  localEditExecutor,
  localGlobExecutor,
  localGrepExecutor,
  smartReplace,
  type BashArgs,
  type ReadArgs,
  type WriteArgs,
  type EditArgs,
  type GlobArgs,
  type GrepArgs,
} from './tool'

// ============================================================================
// Provider Exports
// ============================================================================

export {
  configureProvider,
  configureProviders,
  configureFromOpenCodeConfig,
  resetProviders,
  getProviders,
  getProvider,
  getModelInfo,
  getLanguageModel,
  getDefaultModel,
  calculateCost,
  PROVIDERS,
  type ProviderConfig,
  type ProviderOptions,
} from './provider'

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Mode
  AgentMode,
  
  // Session
  Session,
  SessionStatus,
  CreateSessionInput,
  
  // Message
  Message,
  MessageRole,
  MessageWithParts,
  MessagePart,
  MessageError,
  
  // Parts
  PartType,
  TextPart,
  ToolPart,
  ReasoningPart,
  FilePart,
  ToolStatus,
  
  // Token & Cost
  TokenUsage,
  
  // Tool
  ToolContext,
  ToolResult,
  ToolDefinition,
  ToolInfo,
  ExecutorType,
  SandboxExecutor,
  
  // Permission
  PermissionAction,
  PermissionRequest,
  PermissionRule,
  
  // Agent
  AgentDefinition,
  AgentConfig,
  
  // MCP
  McpServerConfig,
  McpServerType,
  McpStatus,
  
  // Provider
  ProviderInfo,
  ModelInfo,
  
  // Stream
  StreamEvent,
  SnapshotPart,
  
  // API
  PromptInput,
  PromptResult,
} from './types'

export {
  TOOL_PERMISSIONS,
  getAllowedToolsForMode,
  isToolAllowedInMode,
  getModeChangePrompt,
} from './types'

// ============================================================================
// Utility Exports
// ============================================================================

export {
  generateId,
  sessionId,
  messageId,
  partId,
  toolCallId,
  
  OpenAgentError,
  SessionNotFoundError,
  SessionBusyError,
  AgentNotFoundError,
  ModelNotFoundError,
  ToolExecutionError,
  PermissionDeniedError,
  McpConnectionError,
  ProviderApiError,
  ContextOverflowError,
  toMessageError,
  extractErrorInfo,
  
  createLogger,
  type Logger,
  type LogLevel,
  
  estimateTokens,
  estimateJsonTokens,
  estimateMessageTokens,
  estimateMessagesTokens,
  
  truncateSimple,
  truncateToolOutput,
  truncateForAI,
} from './utils'

// ============================================================================
// Initialization
// ============================================================================

import { setSessionStore, createMemoryStore } from './core'
import { registerTools, builtinTools } from './tool'
import { configureProviders, type ProviderConfig } from './provider'
import { createLogger } from './utils'

const log = createLogger('openagent')

export interface OpenAgentConfig {
  /** Provider 配置 */
  providers?: ProviderConfig[]
  
  /** 是否注册内置工具（默认 true） */
  registerBuiltinTools?: boolean
  
  /** 工作目录（默认 process.cwd()） */
  workingDirectory?: string
}

let initialized = false

/**
 * 初始化 OpenAgent
 */
export async function initOpenAgent(config?: OpenAgentConfig): Promise<void> {
  if (initialized) {
    log.info('OpenAgent already initialized')
    return
  }
  
  log.info('Initializing OpenAgent...')
  
  // 设置默认的内存存储
  setSessionStore(createMemoryStore())
  log.info('Using memory session store')
  
  // 注册内置工具
  if (config?.registerBuiltinTools !== false) {
    registerTools(builtinTools)
    log.info('Registered builtin tools', { count: builtinTools.length })
  }
  
  // 配置 Providers
  if (config?.providers && config.providers.length > 0) {
    configureProviders(config.providers)
    log.info('Configured providers', { count: config.providers.length })
  }
  
  initialized = true
  log.info('OpenAgent initialized')
}

/**
 * 检查是否已初始化
 */
export function isInitialized(): boolean {
  return initialized
}

/**
 * 重置（用于测试）
 */
export function resetOpenAgent(): void {
  initialized = false
}
