/**
 * ID Generator - 生成有序的 CUID
 */

// 简单的递增 ID 生成器，确保在同一毫秒内生成的 ID 也是有序的
let counter = 0
let lastTimestamp = 0

/**
 * 生成一个有序的唯一 ID
 * 格式: {timestamp}_{counter}_{random}
 */
export function generateId(prefix?: string): string {
  const timestamp = Date.now()
  
  if (timestamp === lastTimestamp) {
    counter++
  } else {
    counter = 0
    lastTimestamp = timestamp
  }
  
  const random = Math.random().toString(36).substring(2, 8)
  const id = `${timestamp.toString(36)}_${counter.toString(36)}_${random}`
  
  return prefix ? `${prefix}_${id}` : id
}

/**
 * 生成 Session ID
 */
export function sessionId(): string {
  return generateId('ses')
}

/**
 * 生成 Message ID
 */
export function messageId(): string {
  return generateId('msg')
}

/**
 * 生成 Part ID
 */
export function partId(): string {
  return generateId('part')
}

/**
 * 生成 Tool Call ID
 */
export function toolCallId(): string {
  return generateId('call')
}
