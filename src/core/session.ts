/**
 * OpenAgent Session Manager
 * 会话管理 - 通过 SessionStore 接口操作
 */

import type { Session, CreateSessionInput, Message, MessageWithParts, MessagePart, TokenUsage, ToolStatus } from '../types'
import { 
  getSessionStore, 
  type CreatePartInput,
  type BatchSaveMessageInput,
} from './session-store'
import { createLogger } from '../utils/log'

const log = createLogger('session')

// ============================================================================
// Session CRUD (delegate to SessionStore)
// ============================================================================

export async function createSession(input: CreateSessionInput): Promise<Session> {
  log.info('Creating session', { agent: input.agent, mode: input.mode })
  return getSessionStore().createSession(input)
}

export async function getSession(id: string): Promise<Session | null> {
  return getSessionStore().getSession(id)
}

export async function updateSession(
  id: string,
  data: Partial<Pick<Session, 'status' | 'title' | 'summary' | 'totalCost' | 'totalTokens' | 'mode'>>
): Promise<Session> {
  return getSessionStore().updateSession(id, data)
}

export async function deleteSession(id: string): Promise<void> {
  return getSessionStore().deleteSession(id)
}

export async function listSessions(options: {
  projectId?: string
  taskId?: string
  status?: Session['status']
  limit?: number
  offset?: number
}): Promise<Session[]> {
  return getSessionStore().listSessions(options)
}

// ============================================================================
// Message CRUD
// ============================================================================

export async function createMessage(data: {
  sessionId: string
  parentId?: string
  role: 'USER' | 'ASSISTANT'
  agent?: string
  providerId?: string
  modelId?: string
}): Promise<Message> {
  return getSessionStore().createMessage(data)
}

export async function getMessage(id: string): Promise<MessageWithParts | null> {
  return getSessionStore().getMessage(id)
}

export async function updateMessage(
  id: string,
  data: Partial<Pick<Message, 'cost' | 'tokens' | 'finish' | 'error' | 'completedAt'>>
): Promise<Message> {
  return getSessionStore().updateMessage(id, data)
}

export async function getSessionMessages(sessionId: string): Promise<MessageWithParts[]> {
  return getSessionStore().getSessionMessages(sessionId)
}

// ============================================================================
// Part CRUD
// ============================================================================

export async function createPart(messageId: string, data: CreatePartInput): Promise<MessagePart> {
  return getSessionStore().createPart(messageId, data)
}

export async function updatePart(
  id: string,
  data: {
    text?: string
    toolOutput?: string
    toolStatus?: ToolStatus
    toolMeta?: Record<string, unknown>
    reasoning?: string
  }
): Promise<MessagePart> {
  return getSessionStore().updatePart(id, data)
}

export async function appendPartText(id: string, delta: string): Promise<void> {
  return getSessionStore().appendPartText(id, delta)
}

export async function appendPartReasoning(id: string, delta: string): Promise<void> {
  return getSessionStore().appendPartReasoning(id, delta)
}

// ============================================================================
// Batch Operations
// ============================================================================

export async function batchSaveMessage(input: BatchSaveMessageInput): Promise<MessageWithParts> {
  log.info('Batch saving message', { 
    sessionId: input.sessionId, 
    role: input.role,
    partsCount: input.parts.length,
  })
  return getSessionStore().batchSaveMessage(input)
}

export async function batchUpdateSession(input: { sessionId: string; totalCost: number; totalTokens: TokenUsage }): Promise<void> {
  return getSessionStore().batchUpdateSession(input)
}

// Re-export types
export type { CreatePartInput, BatchSaveMessageInput }
