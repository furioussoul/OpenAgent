/**
 * OpenAgent - Core Type Definitions
 * 核心类型定义
 */

import type { z } from 'zod'

// ============================================================================
// Agent Mode Types
// ============================================================================

/**
 * Agent 操作模式
 * - plan: 只读模式，只能进行分析和规划，不能修改文件或执行有副作用的命令
 * - build: 执行模式，可以修改文件、执行命令等
 */
export type AgentMode = 'plan' | 'build'

/**
 * 工具权限分类
 */
export const TOOL_PERMISSIONS = {
  // 只读工具 - plan 模式下允许
  readonly: [
    'read',           // 读取文件
    'glob',           // 文件模式匹配
    'grep',           // 内容搜索
    'list',           // 列出目录
    'bash',           // Shell 命令 (plan 模式下仅限只读命令，由 system prompt 约束)
    'webfetch',       // 获取网页内容
    'websearch',      // 网页搜索
    'codesearch',     // 代码搜索
    'read_tool_output', // 读取工具输出
    'batch',          // 批量执行 (只能批量执行 plan 模式允许的工具)
    'todoread',       // 读取待办事项
  ],
  // 写操作工具 - 仅 build 模式下允许
  write: [
    'write',          // 写入文件
    'edit',           // 编辑文件
    'todowrite',      // 写入待办事项
    'task',           // 创建子任务 (可能触发写操作)
    'question',       // 询问用户 (仅 build 模式需要交互)
    'skill',          // 加载技能 (可能包含写操作)
  ],
} as const

/**
 * 根据模式获取允许的工具列表
 */
export function getAllowedToolsForMode(mode: AgentMode): string[] {
  if (mode === 'plan') {
    return [...TOOL_PERMISSIONS.readonly]
  }
  // build 模式允许所有工具
  return [...TOOL_PERMISSIONS.readonly, ...TOOL_PERMISSIONS.write]
}

/**
 * 检查工具是否在指定模式下被允许
 */
export function isToolAllowedInMode(toolId: string, mode: AgentMode): boolean {
  if (mode === 'build') {
    return true // build 模式允许所有工具
  }
  // plan 模式只允许只读工具
  return (TOOL_PERMISSIONS.readonly as readonly string[]).includes(toolId)
}

/**
 * 获取模式切换的 System Prompt
 */
export function getModeChangePrompt(from: AgentMode, to: AgentMode): string {
  if (from === 'plan' && to === 'build') {
    return `<system-reminder>
Your operational mode has changed from plan to build.
You are no longer in read-only mode.
You are permitted to make file changes, run shell commands, and utilize your arsenal of tools as needed.
</system-reminder>`
  }
  
  if (from === 'build' && to === 'plan') {
    return `<system-reminder>
Your operational mode has changed from build to plan.
You are now in read-only mode.
You MUST NOT make any file edits, write new files, or run shell commands that have side effects.
You are only permitted to use read-only tools for analysis, exploration, and planning.
Focus on understanding the codebase and creating a detailed plan for the task.
</system-reminder>`
  }
  
  return ''
}

// ============================================================================
// Session Types
// ============================================================================

export type SessionStatus = 'IDLE' | 'BUSY' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export interface Session {
  id: string
  projectId?: string
  taskId?: string
  parentId?: string
  agent: string
  mode: AgentMode
  status: SessionStatus
  title?: string
  summary?: string
  totalCost: number
  totalTokens?: TokenUsage
  createdAt: Date
  updatedAt: Date
}

export interface CreateSessionInput {
  projectId?: string
  taskId?: string
  parentId?: string
  agent: string
  mode?: AgentMode
  title?: string
}

// ============================================================================
// Message Types
// ============================================================================

export type MessageRole = 'USER' | 'ASSISTANT'

export interface Message {
  id: string
  sessionId: string
  parentId?: string
  role: MessageRole
  agent?: string
  providerId?: string
  modelId?: string
  cost: number
  tokens?: TokenUsage
  finish?: string
  error?: MessageError
  createdAt: Date
  completedAt?: Date
}

export interface MessageWithParts extends Message {
  parts: MessagePart[]
}

export interface MessageError {
  name: string
  message: string
  code?: string
}

// ============================================================================
// Message Part Types
// ============================================================================

export type PartType = 'TEXT' | 'TOOL' | 'REASONING' | 'FILE'
export type ToolStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR'

export interface BaseMessagePart {
  id: string
  messageId: string
  type: PartType
  createdAt: Date
  prunedAt?: Date
}

export interface TextPart extends BaseMessagePart {
  type: 'TEXT'
  text: string
}

export interface ToolPart extends BaseMessagePart {
  type: 'TOOL'
  toolName: string
  toolCallId: string
  toolInput: Record<string, unknown>
  toolOutput?: string
  toolStatus: ToolStatus
  toolMeta?: Record<string, unknown>
}

export interface ReasoningPart extends BaseMessagePart {
  type: 'REASONING'
  reasoning: string
}

export interface FilePart extends BaseMessagePart {
  type: 'FILE'
  fileUrl: string
  fileName?: string
  fileMime?: string
}

export type MessagePart = TextPart | ToolPart | ReasoningPart | FilePart

// ============================================================================
// Token & Cost Types
// ============================================================================

export interface TokenUsage {
  input: number
  output: number
  reasoning?: number
  cache?: {
    read: number
    write: number
  }
}

// ============================================================================
// Tool Types
// ============================================================================

export interface ToolContext {
  sessionId: string
  messageId: string
  agent: string
  abort: AbortSignal
  callId?: string
  
  /** Project ID */
  projectId?: string
  
  /** Working directory */
  workingDirectory?: string
  
  /** 当前使用的模型（用于子 Agent 继承） */
  model?: {
    providerId: string
    modelId: string
  }
  
  /** 更新 Tool 元数据 */
  metadata(input: { title?: string; metadata?: Record<string, unknown> }): Promise<void>
  
  /** 请求用户确认（权限检查） */
  ask(input: PermissionRequest): Promise<void>
}

export interface ToolResult {
  title: string
  output: string
  metadata?: Record<string, unknown>
  attachments?: FilePart[]
}

export interface ToolDefinition<TParams extends z.ZodType = z.ZodType> {
  id: string
  description: string
  parameters: TParams
  execute(args: z.infer<TParams>, ctx: ToolContext): Promise<ToolResult>
}

export interface ToolInfo {
  id: string
  description: string
  parameters: z.ZodType
}

// ============================================================================
// Permission Types
// ============================================================================

export type PermissionAction = 'ALLOW' | 'DENY' | 'ASK'

export interface PermissionRequest {
  permission: string
  patterns: string[]
  metadata?: Record<string, unknown>
}

export interface PermissionRule {
  permission: string
  pattern: string
  action: PermissionAction
}

// ============================================================================
// Agent Types
// ============================================================================

export interface AgentDefinition {
  name: string
  displayName?: string
  description?: string
  systemPrompt: string
  
  /** 默认模型 */
  model?: {
    providerId: string
    modelId: string
  }
  
  /** 模型参数 */
  temperature?: number
  maxTokens?: number
  
  /** Tool 权限 */
  allowedTools?: string[]
  deniedTools?: string[]
  
  /** MCP 权限 */
  allowedMcp?: string[]
}

export interface AgentConfig extends AgentDefinition {
  id: string
  projectId: string
  enabled: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// MCP Types
// ============================================================================

export type McpServerType = 'stdio' | 'streamable_http'
export type McpStatus = 'CONNECTED' | 'DISCONNECTED' | 'FAILED' | 'NEEDS_AUTH'

export interface McpServerConfig {
  name: string
  type: McpServerType
  
  // Stdio MCP
  command?: string[]
  environment?: Record<string, string>
  
  // HTTP MCP
  url?: string
  headers?: Record<string, string>
  
  timeout?: number
  enabled?: boolean
}

// ============================================================================
// Provider Types
// ============================================================================

export interface ProviderInfo {
  id: string
  name: string
  models: ModelInfo[]
}

export interface ModelInfo {
  id: string
  name: string
  contextWindow: number
  maxOutput?: number
  supportsFunctions: boolean
  supportsVision: boolean
  supportsStreaming: boolean
  pricing?: {
    input: number  // per 1M tokens
    output: number // per 1M tokens
    cache?: {
      read: number
      write: number
    }
  }
}

// ============================================================================
// Stream Event Types
// ============================================================================

export type SnapshotPart = 
  | { type: 'text'; id: string; content: string }
  | { type: 'reasoning'; id: string; content: string }
  | { type: 'tool'; id: string; toolName: string; toolCallId: string; input: Record<string, unknown>; output?: string; status: 'pending' | 'running' | 'completed' | 'error' }

export type StreamEvent =
  | { type: 'session-start'; sessionId: string; mode: AgentMode }
  | { type: 'mode-change'; sessionId: string; from: AgentMode; to: AgentMode }
  | { type: 'message-start'; messageId: string }
  | { type: 'message-snapshot'; messageId: string; parts: SnapshotPart[] }
  | { type: 'text-start'; partId: string }
  | { type: 'text-delta'; partId: string; text: string }
  | { type: 'text-end'; partId: string }
  | { type: 'reasoning-start'; partId: string }
  | { type: 'reasoning-delta'; partId: string; text: string }
  | { type: 'reasoning-end'; partId: string }
  | { type: 'tool-start'; partId: string; toolName: string; toolCallId: string }
  | { type: 'tool-input'; partId: string; input: Record<string, unknown> }
  | { type: 'tool-running'; partId: string }
  | { type: 'tool-result'; partId: string; output: string; metadata?: Record<string, unknown> }
  | { type: 'tool-error'; partId: string; error: string }
  | { type: 'message-end'; messageId: string; finish: string }
  | { type: 'session-end'; sessionId: string }
  | { type: 'error'; error: MessageError }
  | { type: 'compaction-start'; sessionId: string }
  | { type: 'compaction-end'; sessionId: string; summaryMessageId?: string }

// ============================================================================
// API Types
// ============================================================================

export interface PromptInput {
  sessionId: string
  content: string
  files?: Array<{
    url: string
    name?: string
    mime?: string
  }>
  agent?: string
  mode?: AgentMode
  model?: {
    providerId: string
    modelId: string
  }
}

export interface PromptResult {
  messageId: string
  response: string
  finish: string
  cost: number
  tokens: TokenUsage
  toolCalls: Array<{
    name: string
    input: Record<string, unknown>
    output?: string
    status: ToolStatus
  }>
}

// ============================================================================
// Executor Types (for pluggable execution)
// ============================================================================

/**
 * 工具执行器类型
 * - local: 本地执行（Node.js child_process, fs 等）
 * - sandbox: Sandbox 执行（需要提供 SandboxExecutor 实现）
 */
export type ExecutorType = 'local' | 'sandbox'

/**
 * Sandbox 执行器接口
 * 用于需要 Sandbox 执行的场景（如 DreamShip）
 */
export interface SandboxExecutor {
  /** 执行 bash 命令 */
  bash(args: { command: string; workdir?: string; timeout?: number }, ctx: ToolContext): Promise<ToolResult>
  
  /** 读取文件 */
  read(args: { filePath: string; offset?: number; limit?: number }, ctx: ToolContext): Promise<ToolResult>
  
  /** 写入文件 */
  write(args: { filePath: string; content: string }, ctx: ToolContext): Promise<ToolResult>
  
  /** 编辑文件 */
  edit(args: { filePath: string; oldString: string; newString: string; replaceAll?: boolean }, ctx: ToolContext): Promise<ToolResult>
  
  /** Glob 搜索 */
  glob(args: { pattern: string; path?: string }, ctx: ToolContext): Promise<ToolResult>
  
  /** Grep 搜索 */
  grep(args: { pattern: string; path?: string; include?: string }, ctx: ToolContext): Promise<ToolResult>
}
