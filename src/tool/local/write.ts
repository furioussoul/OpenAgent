/**
 * OpenAgent - Local Write Executor
 * 本地文件写入器
 */

import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve, isAbsolute, dirname } from 'path'
import type { ToolContext, ToolResult } from '../../types'

export interface WriteArgs {
  filePath: string
  content: string
}

/**
 * 本地文件写入器
 */
export async function localWriteExecutor(args: WriteArgs, ctx: ToolContext): Promise<ToolResult> {
  const { filePath, content } = args
  
  // Resolve path
  const absolutePath = isAbsolute(filePath) 
    ? filePath 
    : resolve(ctx.workingDirectory ?? process.cwd(), filePath)

  // Check if file exists (for metadata)
  const existed = existsSync(absolutePath)

  // Ensure directory exists
  const dir = dirname(absolutePath)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }

  // Write file
  await writeFile(absolutePath, content, 'utf-8')

  // Count lines
  const lines = content.split('\n').length

  return {
    title: existed ? `Updated ${filePath}` : `Created ${filePath}`,
    output: `Successfully ${existed ? 'updated' : 'created'} file: ${absolutePath}\n\nFile contains ${lines} lines.`,
    metadata: {
      path: absolutePath,
      lines,
      created: !existed,
    },
  }
}
