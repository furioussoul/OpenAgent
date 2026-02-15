/**
 * OpenAgent - Core Module
 */

// Session Store
export {
  setSessionStore,
  getSessionStore,
  hasSessionStore,
  type SessionStore,
  type CreatePartInput,
  type CreateMessageInput,
  type UpdateMessageInput,
  type UpdatePartInput,
  type BatchSaveMessageInput,
} from './session-store'

// Memory Store Implementation
export {
  MemorySessionStore,
  createMemoryStore,
} from './memory-store'

// Session Operations
export {
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
  appendPartText,
  appendPartReasoning,
  batchSaveMessage,
  batchUpdateSession,
} from './session'

// Agent Management
export {
  getAgent,
  getDefaultAgent,
  getDefaultAgentNames,
  getAllAgentNames,
  registerAgent,
  registerAgents,
  unregisterAgent,
  clearAgents,
} from './agent'

// LLM
export {
  stream as llmStream,
  toModelMessages,
  buildSystemPrompt,
  isContextOverflowError,
  type LLMStreamInput,
  type LLMStreamResult,
  type LLMUsage,
  type LLMStreamEvent,
} from './llm'
