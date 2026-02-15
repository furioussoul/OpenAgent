/**
 * OpenAgent - Local Glob Executor
 * 本地文件搜索器
 */

import { glob } from 'glob'
import { stat } from 'fs/promises'
import { resolve, isAbsolute } from 'path'
import type { ToolContext, ToolResult } from '../../types'

export interface GlobArgs {
  pattern: string
  path?: string
}

const MAX_RESULTS = 500

/**
 * 本地 Glob 搜索器
 */
export async function localGlobExecutor(args: GlobArgs, ctx: ToolContext): Promise<ToolResult> {
  const { pattern, path } = args
  
  // Resolve base path
  const basePath = path 
    ? (isAbsolute(path) ? path : resolve(ctx.workingDirectory ?? process.cwd(), path))
    : (ctx.workingDirectory ?? process.cwd())

  try {
    // Execute glob
    const files = await glob(pattern, {
      cwd: basePath,
      nodir: true,
      absolute: true,
      ignore: ['**/node_modules/**', '**/.git/**'],
    })

    if (files.length === 0) {
      return {
        title: `No files found matching: ${pattern}`,
        output: `No files found matching pattern "${pattern}" in ${basePath}`,
      }
    }

    // Get file stats for sorting by mtime
    const filesWithStats = await Promise.all(
      files.slice(0, MAX_RESULTS).map(async (file) => {
        try {
          const stats = await stat(file)
          return { file, mtime: stats.mtime }
        } catch {
          return { file, mtime: new Date(0) }
        }
      })
    )

    // Sort by modification time (newest first)
    filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

    const sortedFiles = filesWithStats.map(f => f.file)
    
    let output = sortedFiles.join('\n')
    
    if (files.length > MAX_RESULTS) {
      output += `\n\n(Showing ${MAX_RESULTS} of ${files.length} files)`
    }

    return {
      title: `Found ${files.length} files matching: ${pattern}`,
      output,
      metadata: {
        count: files.length,
        pattern,
        basePath,
        truncated: files.length > MAX_RESULTS,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      title: `Glob error: ${pattern}`,
      output: `Error searching for files: ${message}`,
    }
  }
}
