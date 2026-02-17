/**
 * OpenAgent - Memory Session Store
 * 内存存储实现 - 适用于 CLI 和短期会话
 */

import type {
  Session,
  CreateSessionInput,
  Message,
  MessageWithParts,
  MessagePart,
  TextPart,
  ToolPart,
  ReasoningPart,
  FilePart,
  TokenUsage,
  ToolStatus as _ToolStatus,
  AgentMode as _AgentMode,
} from '../types'

import type {
  SessionStore,
  CreatePartInput,
  CreateMessageInput,
  UpdateMessageInput,
  UpdatePartInput,
  BatchSaveMessageInput,
} from './session-store'

import { sessionId as generateSessionId, messageId as generateMessageId, partId as generatePartId } from '../utils/id'

// ============================================================================
// Memory Storage
// ============================================================================

interface Storage {
  sessions: Map<string, Session>
  messages: Map<string, Message>
  parts: Map<string, MessagePart>
  // Index: sessionId -> messageIds
  sessionMessages: Map<string, string[]>
  // Index: messageId -> partIds
  messageParts: Map<string, string[]>
}

function createStorage(): Storage {
  return {
    sessions: new Map(),
    messages: new Map(),
    parts: new Map(),
    sessionMessages: new Map(),
    messageParts: new Map(),
  }
}

// ============================================================================
// Memory Session Store Implementation
// ============================================================================

export class MemorySessionStore implements SessionStore {
  private storage: Storage

  constructor() {
    this.storage = createStorage()
  }

  // ---- Session CRUD ----

  async createSession(input: CreateSessionInput): Promise<Session> {
    const id = generateSessionId()
    const now = new Date()

    const session: Session = {
      id,
      projectId: input.projectId,
      taskId: input.taskId,
      parentId: input.parentId,
      agent: input.agent,
      mode: input.mode ?? 'build',
      status: 'IDLE',
      title: input.title,
      totalCost: 0,
      createdAt: now,
      updatedAt: now,
    }

    this.storage.sessions.set(id, session)
    this.storage.sessionMessages.set(id, [])

    return session
  }

  async getSession(id: string): Promise<Session | null> {
    return this.storage.sessions.get(id) ?? null
  }

  async updateSession(
    id: string,
    data: Partial<Pick<Session, 'status' | 'title' | 'summary' | 'totalCost' | 'totalTokens' | 'mode'>>
  ): Promise<Session> {
    const session = this.storage.sessions.get(id)
    if (!session) {
      throw new Error(`Session not found: ${id}`)
    }

    const updated: Session = {
      ...session,
      ...data,
      updatedAt: new Date(),
    }

    this.storage.sessions.set(id, updated)
    return updated
  }

  async deleteSession(id: string): Promise<void> {
    // Delete all messages and parts for this session
    const messageIds = this.storage.sessionMessages.get(id) ?? []
    for (const messageId of messageIds) {
      const partIds = this.storage.messageParts.get(messageId) ?? []
      for (const partId of partIds) {
        this.storage.parts.delete(partId)
      }
      this.storage.messageParts.delete(messageId)
      this.storage.messages.delete(messageId)
    }
    this.storage.sessionMessages.delete(id)
    this.storage.sessions.delete(id)
  }

  async listSessions(options: {
    projectId?: string
    taskId?: string
    status?: Session['status']
    limit?: number
    offset?: number
  }): Promise<Session[]> {
    let sessions = Array.from(this.storage.sessions.values())

    // Filter
    if (options.projectId) {
      sessions = sessions.filter(s => s.projectId === options.projectId)
    }
    if (options.taskId) {
      sessions = sessions.filter(s => s.taskId === options.taskId)
    }
    if (options.status) {
      sessions = sessions.filter(s => s.status === options.status)
    }

    // Sort by createdAt desc
    sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Pagination
    const offset = options.offset ?? 0
    const limit = options.limit ?? 50
    return sessions.slice(offset, offset + limit)
  }

  // ---- Message CRUD ----

  async createMessage(data: CreateMessageInput): Promise<Message> {
    const id = generateMessageId()
    const now = new Date()

    const message: Message = {
      id,
      sessionId: data.sessionId,
      parentId: data.parentId,
      role: data.role,
      agent: data.agent,
      providerId: data.providerId,
      modelId: data.modelId,
      cost: 0,
      createdAt: now,
    }

    this.storage.messages.set(id, message)
    this.storage.messageParts.set(id, [])

    // Add to session index
    const messageIds = this.storage.sessionMessages.get(data.sessionId) ?? []
    messageIds.push(id)
    this.storage.sessionMessages.set(data.sessionId, messageIds)

    return message
  }

  async getMessage(id: string): Promise<MessageWithParts | null> {
    const message = this.storage.messages.get(id)
    if (!message) return null

    const partIds = this.storage.messageParts.get(id) ?? []
    const parts = partIds
      .map(pid => this.storage.parts.get(pid))
      .filter((p): p is MessagePart => p !== undefined)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

    return { ...message, parts }
  }

  async updateMessage(id: string, data: UpdateMessageInput): Promise<Message> {
    const message = this.storage.messages.get(id)
    if (!message) {
      throw new Error(`Message not found: ${id}`)
    }

    const updated: Message = {
      ...message,
      ...data,
    }

    this.storage.messages.set(id, updated)
    return updated
  }

  async getSessionMessages(sessionId: string): Promise<MessageWithParts[]> {
    const messageIds = this.storage.sessionMessages.get(sessionId) ?? []
    const messages: MessageWithParts[] = []

    for (const messageId of messageIds) {
      const message = await this.getMessage(messageId)
      if (message) {
        messages.push(message)
      }
    }

    // Sort by createdAt asc
    messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    return messages
  }

  // ---- Part CRUD ----

  async createPart(messageId: string, data: CreatePartInput): Promise<MessagePart> {
    const id = generatePartId()
    const now = new Date()

    let part: MessagePart

    switch (data.type) {
      case 'TEXT':
        part = {
          id,
          messageId,
          type: 'TEXT',
          text: data.text,
          createdAt: now,
        } as TextPart
        break
      case 'TOOL':
        part = {
          id,
          messageId,
          type: 'TOOL',
          toolName: data.toolName,
          toolCallId: data.toolCallId,
          toolInput: data.toolInput,
          toolOutput: data.toolOutput,
          toolStatus: data.toolStatus,
          toolMeta: data.toolMeta,
          createdAt: now,
        } as ToolPart
        break
      case 'REASONING':
        part = {
          id,
          messageId,
          type: 'REASONING',
          reasoning: data.reasoning,
          createdAt: now,
        } as ReasoningPart
        break
      case 'FILE':
        part = {
          id,
          messageId,
          type: 'FILE',
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          fileMime: data.fileMime,
          createdAt: now,
        } as FilePart
        break
    }

    this.storage.parts.set(id, part)

    // Add to message index
    const partIds = this.storage.messageParts.get(messageId) ?? []
    partIds.push(id)
    this.storage.messageParts.set(messageId, partIds)

    return part
  }

  async updatePart(id: string, data: UpdatePartInput): Promise<MessagePart> {
    const part = this.storage.parts.get(id)
    if (!part) {
      throw new Error(`Part not found: ${id}`)
    }

    let updated: MessagePart

    if (part.type === 'TEXT' && data.text !== undefined) {
      updated = { ...part, text: data.text } as TextPart
    } else if (part.type === 'TOOL') {
      updated = {
        ...part,
        toolOutput: data.toolOutput ?? (part as ToolPart).toolOutput,
        toolStatus: data.toolStatus ?? (part as ToolPart).toolStatus,
        toolMeta: data.toolMeta ?? (part as ToolPart).toolMeta,
      } as ToolPart
    } else if (part.type === 'REASONING' && data.reasoning !== undefined) {
      updated = { ...part, reasoning: data.reasoning } as ReasoningPart
    } else {
      updated = part
    }

    this.storage.parts.set(id, updated)
    return updated
  }

  async appendPartText(id: string, delta: string): Promise<void> {
    const part = this.storage.parts.get(id)
    if (!part || part.type !== 'TEXT') {
      throw new Error(`Text part not found: ${id}`)
    }

    const updated: TextPart = {
      ...part,
      text: (part.text ?? '') + delta,
    }

    this.storage.parts.set(id, updated)
  }

  async appendPartReasoning(id: string, delta: string): Promise<void> {
    const part = this.storage.parts.get(id)
    if (!part || part.type !== 'REASONING') {
      throw new Error(`Reasoning part not found: ${id}`)
    }

    const updated: ReasoningPart = {
      ...part,
      reasoning: (part.reasoning ?? '') + delta,
    }

    this.storage.parts.set(id, updated)
  }

  // ---- Batch Operations ----

  async batchSaveMessage(input: BatchSaveMessageInput): Promise<MessageWithParts> {
    // Create message
    const message = await this.createMessage({
      sessionId: input.sessionId,
      parentId: input.parentId,
      role: input.role,
      agent: input.agent,
      providerId: input.providerId,
      modelId: input.modelId,
    })

    // Update with additional fields
    const updated = await this.updateMessage(message.id, {
      finish: input.finish,
      cost: input.cost,
      tokens: input.tokens,
      completedAt: input.completedAt,
    })

    // Create parts
    const parts: MessagePart[] = []
    for (const partInput of input.parts) {
      const part = await this.createPart(message.id, partInput)
      parts.push(part)
    }

    return { ...updated, parts }
  }

  async batchUpdateSession(input: { sessionId: string; totalCost: number; totalTokens: TokenUsage }): Promise<void> {
    await this.updateSession(input.sessionId, {
      totalCost: input.totalCost,
      totalTokens: input.totalTokens,
    })
  }

  // ---- Utility ----

  /**
   * 清空所有存储（用于测试）
   */
  clear(): void {
    this.storage = createStorage()
  }

  /**
   * 获取存储统计
   */
  stats(): { sessions: number; messages: number; parts: number } {
    return {
      sessions: this.storage.sessions.size,
      messages: this.storage.messages.size,
      parts: this.storage.parts.size,
    }
  }
}

/**
 * 创建内存存储实例
 */
export function createMemoryStore(): MemorySessionStore {
  return new MemorySessionStore()
}
