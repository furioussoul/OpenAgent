/**
 * OpenAgent Error Classes
 * 错误类定义
 */

export class OpenAgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public data?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'OpenAgentError'
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      data: this.data,
    }
  }
}

/**
 * Session 不存在
 */
export class SessionNotFoundError extends OpenAgentError {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`, 'SESSION_NOT_FOUND', { sessionId })
    this.name = 'SessionNotFoundError'
  }
}

/**
 * Session 正忙
 */
export class SessionBusyError extends OpenAgentError {
  constructor(sessionId: string) {
    super(`Session is busy: ${sessionId}`, 'SESSION_BUSY', { sessionId })
    this.name = 'SessionBusyError'
  }
}

/**
 * Agent 不存在
 */
export class AgentNotFoundError extends OpenAgentError {
  constructor(agentName: string) {
    super(`Agent not found: ${agentName}`, 'AGENT_NOT_FOUND', { agentName })
    this.name = 'AgentNotFoundError'
  }
}

/**
 * Model 不存在
 */
export class ModelNotFoundError extends OpenAgentError {
  constructor(providerId: string, modelId: string) {
    super(
      `Model not found: ${providerId}/${modelId}`,
      'MODEL_NOT_FOUND',
      { providerId, modelId }
    )
    this.name = 'ModelNotFoundError'
  }
}

/**
 * Tool 执行错误
 */
export class ToolExecutionError extends OpenAgentError {
  constructor(toolName: string, message: string, cause?: Error) {
    super(`Tool execution failed: ${toolName} - ${message}`, 'TOOL_EXECUTION_ERROR', {
      toolName,
      cause: cause?.message,
    })
    this.name = 'ToolExecutionError'
    if (cause) {
      this.cause = cause
    }
  }
}

/**
 * 权限被拒绝
 */
export class PermissionDeniedError extends OpenAgentError {
  constructor(permission: string, pattern: string) {
    super(
      `Permission denied: ${permission} for ${pattern}`,
      'PERMISSION_DENIED',
      { permission, pattern }
    )
    this.name = 'PermissionDeniedError'
  }
}

/**
 * MCP 连接错误
 */
export class McpConnectionError extends OpenAgentError {
  constructor(serverName: string, message: string) {
    super(
      `MCP connection failed: ${serverName} - ${message}`,
      'MCP_CONNECTION_ERROR',
      { serverName }
    )
    this.name = 'McpConnectionError'
  }
}

/**
 * Provider API 错误（LLM provider 返回的错误）
 */
export class ProviderApiError extends OpenAgentError {
  constructor(
    message: string,
    public statusCode: number,
    public provider?: string
  ) {
    super(message, 'PROVIDER_API_ERROR', { statusCode, provider })
    this.name = 'ProviderApiError'
  }
}

/**
 * 上下文溢出
 */
export class ContextOverflowError extends OpenAgentError {
  constructor(maxTokens: number, currentTokens: number) {
    super(
      `Context overflow: ${currentTokens} tokens exceeds limit of ${maxTokens}`,
      'CONTEXT_OVERFLOW',
      { maxTokens, currentTokens }
    )
    this.name = 'ContextOverflowError'
  }
}

/**
 * 从 Error 对象创建 MessageError
 */
export function toMessageError(error: unknown): { name: string; message: string; code?: string } {
  if (error instanceof OpenAgentError) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
    }
  }
  
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    }
  }
  
  return {
    name: 'Error',
    message: String(error),
  }
}

/**
 * 从未知错误提取信息
 */
export function extractErrorInfo(error: unknown): {
  type: string
  message: string
  details?: Record<string, unknown>
} {
  if (error instanceof OpenAgentError) {
    return {
      type: error.name,
      message: error.message,
      details: { code: error.code, ...error.data },
    }
  }
  
  if (error instanceof Error) {
    return {
      type: error.name,
      message: error.message,
      details: error.cause ? { cause: String(error.cause) } : undefined,
    }
  }
  
  return {
    type: 'UnknownError',
    message: String(error),
  }
}
