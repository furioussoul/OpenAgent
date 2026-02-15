/**
 * OpenAgent - Utils
 */

export {
  generateId,
  sessionId,
  messageId,
  partId,
  toolCallId,
} from './id'

export {
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
} from './error'

export {
  createLogger,
  type Logger,
  type LogLevel,
} from './log'

export {
  estimateTokens,
  estimateJsonTokens,
  estimateMessageTokens,
  estimateMessagesTokens,
  estimateSystemTokens,
  isApproachingLimit,
  getRemainingTokens,
  getSuggestedMaxOutput,
  type TokenLimitConfig,
} from './token'

export {
  truncateSimple,
  truncateToolOutput,
  truncateForAI,
  DEFAULT_TRUNCATION_CONFIG,
  DEFAULT_SMART_TRUNCATION_CONFIG,
  type TruncationConfig,
  type SmartTruncationConfig,
  type SmartTruncateResult,
} from './truncation'
