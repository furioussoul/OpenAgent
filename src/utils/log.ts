/**
 * OpenAgent Logger
 * 简单的日志工具
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

function formatMessage(level: LogLevel, service: string, message: string, data?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString()
  const dataStr = data ? ` ${JSON.stringify(data)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] [${service}] ${message}${dataStr}`
}

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void
  info(message: string, data?: Record<string, unknown>): void
  warn(message: string, data?: Record<string, unknown>): void
  error(message: string, data?: Record<string, unknown>): void
}

/**
 * 创建 Logger 实例
 */
export function createLogger(service: string): Logger {
  return {
    debug(message: string, data?: Record<string, unknown>) {
      if (shouldLog('debug')) {
        console.debug(formatMessage('debug', service, message, data))
      }
    },
    info(message: string, data?: Record<string, unknown>) {
      if (shouldLog('info')) {
        console.info(formatMessage('info', service, message, data))
      }
    },
    warn(message: string, data?: Record<string, unknown>) {
      if (shouldLog('warn')) {
        console.warn(formatMessage('warn', service, message, data))
      }
    },
    error(message: string, data?: Record<string, unknown>) {
      if (shouldLog('error')) {
        console.error(formatMessage('error', service, message, data))
      }
    },
  }
}
