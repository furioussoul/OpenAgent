/**
 * OpenAgent - Session Store Interface
 * 可插拔的会话存储接口
 */

import type {
  Session,
  CreateSessionInput,
  Message,
  MessageWithParts,
  MessagePart,
  TokenUsage,
  ToolStatus,
  AgentMode as _AgentMode,
} from '../types'

// ============================================================================
// Part Input Types
// ============================================================================

export type CreatePartInput = 
  | { type: 'TEXT'; text: string }
  | { type: 'TOOL'; toolName: string; toolCallId: string; toolInput: Record<string, unknown>; toolOutput?: string; toolStatus: ToolStatus; toolMeta?: Record<string, unknown> }
  | { type: 'REASONING'; reasoning: string }
  | { type: 'FILE'; fileUrl: string; fileName?: string; fileMime?: string }

export interface CreateMessageInput {
  sessionId: string
  parentId?: string
  role: 'USER' | 'ASSISTANT'
  agent?: string
  providerId?: string
  modelId?: string
}

export interface UpdateMessageInput {
  cost?: number
  tokens?: TokenUsage
  finish?: string
  error?: { name: string; message: string; code?: string }
  completedAt?: Date
}

export interface UpdatePartInput {
  text?: string
  toolOutput?: string
  toolStatus?: ToolStatus
  toolMeta?: Record<string, unknown>
  reasoning?: string
}

export interface BatchSaveMessageInput {
  sessionId: string
  parentId?: string
  role: 'USER' | 'ASSISTANT'
  agent?: string
  providerId?: string
  modelId?: string
  finish?: string
  cost?: number
  tokens?: TokenUsage
  completedAt?: Date
  parts: CreatePartInput[]
}

// ============================================================================
// Session Store Interface
// ============================================================================

/**
 * SessionStore 接口
 * 实现此接口以提供自定义存储后端（如 SQLite、Redis、PostgreSQL 等）
 */
export interface SessionStore {
  // ---- Session CRUD ----
  
  /** 创建新会话 */
  createSession(input: CreateSessionInput): Promise<Session>
  
  /** 获取会话 */
  getSession(id: string): Promise<Session | null>
  
  /** 更新会话 */
  updateSession(
    id: string,
    data: Partial<Pick<Session, 'status' | 'title' | 'summary' | 'totalCost' | 'totalTokens' | 'mode'>>
  ): Promise<Session>
  
  /** 删除会话 */
  deleteSession(id: string): Promise<void>
  
  /** 列出会话 */
  listSessions(options: {
    projectId?: string
    taskId?: string
    status?: Session['status']
    limit?: number
    offset?: number
  }): Promise<Session[]>
  
  // ---- Message CRUD ----
  
  /** 创建消息 */
  createMessage(data: CreateMessageInput): Promise<Message>
  
  /** 获取消息及其内容 */
  getMessage(id: string): Promise<MessageWithParts | null>
  
  /** 更新消息 */
  updateMessage(id: string, data: UpdateMessageInput): Promise<Message>
  
  /** 获取会话的所有消息 */
  getSessionMessages(sessionId: string): Promise<MessageWithParts[]>
  
  // ---- Part CRUD ----
  
  /** 创建消息部分 */
  createPart(messageId: string, data: CreatePartInput): Promise<MessagePart>
  
  /** 更新消息部分 */
  updatePart(id: string, data: UpdatePartInput): Promise<MessagePart>
  
  /** 追加文本到 Part */
  appendPartText(id: string, delta: string): Promise<void>
  
  /** 追加推理文本到 Part */
  appendPartReasoning(id: string, delta: string): Promise<void>
  
  // ---- Batch Operations ----
  
  /** 批量保存消息和所有 Parts */
  batchSaveMessage(input: BatchSaveMessageInput): Promise<MessageWithParts>
  
  /** 批量更新 Session 统计 */
  batchUpdateSession(input: { sessionId: string; totalCost: number; totalTokens: TokenUsage }): Promise<void>
}

// ============================================================================
// Store Factory
// ============================================================================

let currentStore: SessionStore | null = null

/**
 * 设置当前使用的 SessionStore
 */
export function setSessionStore(store: SessionStore): void {
  currentStore = store
}

/**
 * 获取当前的 SessionStore
 * @throws 如果未设置 store
 */
export function getSessionStore(): SessionStore {
  if (!currentStore) {
    throw new Error('SessionStore not initialized. Call setSessionStore() or initOpenAgent() first.')
  }
  return currentStore
}

/**
 * 检查是否已设置 SessionStore
 */
export function hasSessionStore(): boolean {
  return currentStore !== null
}
