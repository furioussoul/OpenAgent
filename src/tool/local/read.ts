/**
 * OpenAgent - Local Read Executor
 * 本地文件读取器
 */

import { readFile, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve, isAbsolute } from 'path'
import type { ToolContext, ToolResult } from '../../types'

export interface ReadArgs {
  filePath: string
  offset?: number
  limit?: number
}

const DEFAULT_LIMIT = 2000
const MAX_LINE_LENGTH = 2000

/**
 * 本地文件读取器
 */
export async function localReadExecutor(args: ReadArgs, ctx: ToolContext): Promise<ToolResult> {
  const { filePath, offset = 0, limit = DEFAULT_LIMIT } = args
  
  // Resolve path
  const absolutePath = isAbsolute(filePath) 
    ? filePath 
    : resolve(ctx.workingDirectory ?? process.cwd(), filePath)

  // Check if file exists
  if (!existsSync(absolutePath)) {
    return {
      title: `File not found: ${filePath}`,
      output: `Error: File does not exist at path: ${absolutePath}`,
    }
  }

  // Check if it's a file (not directory)
  const stats = await stat(absolutePath)
  if (stats.isDirectory()) {
    return {
      title: `Path is a directory: ${filePath}`,
      output: `Error: Path is a directory, not a file: ${absolutePath}`,
    }
  }

  // Read file content
  const content = await readFile(absolutePath, 'utf-8')
  const lines = content.split('\n')
  const totalLines = lines.length

  // Apply offset and limit
  const startLine = offset
  const endLine = Math.min(startLine + limit, totalLines)
  const selectedLines = lines.slice(startLine, endLine)

  // Format with line numbers (cat -n style)
  const maxLineNum = endLine
  const lineNumWidth = String(maxLineNum).length

  const formattedLines = selectedLines.map((line, idx) => {
    const lineNum = startLine + idx + 1 // 1-based
    const paddedNum = String(lineNum).padStart(lineNumWidth, ' ')
    // Truncate long lines
    const truncatedLine = line.length > MAX_LINE_LENGTH 
      ? line.slice(0, MAX_LINE_LENGTH) + '... (truncated)'
      : line
    return `${paddedNum}\t${truncatedLine}`
  })

  let output = formattedLines.join('\n')

  // Add metadata about truncation
  if (startLine > 0 || endLine < totalLines) {
    output = `<file>\n${output}\n\n(Showing lines ${startLine + 1}-${endLine} of ${totalLines} total)\n</file>`
  } else {
    output = `<file>\n${output}\n\n(End of file - total ${totalLines} lines)\n</file>`
  }

  return {
    title: `Read ${filePath}`,
    output,
    metadata: {
      path: absolutePath,
      totalLines,
      startLine: startLine + 1,
      endLine,
    },
  }
}
