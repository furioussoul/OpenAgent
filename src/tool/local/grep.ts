/**
 * OpenAgent - Local Grep Executor
 * 本地内容搜索器
 */

import { readFile, stat } from 'fs/promises'
import { glob } from 'glob'
import { resolve, isAbsolute } from 'path'
import type { ToolContext, ToolResult } from '../../types'

export interface GrepArgs {
  pattern: string
  path?: string
  include?: string
}

const MAX_FILES = 100
const MAX_MATCHES_PER_FILE = 10
const MAX_TOTAL_MATCHES = 200

interface GrepMatch {
  file: string
  line: number
  content: string
  mtime: Date
}

/**
 * 本地 Grep 搜索器
 */
export async function localGrepExecutor(args: GrepArgs, ctx: ToolContext): Promise<ToolResult> {
  const { pattern, path, include } = args
  
  // Resolve base path
  const basePath = path 
    ? (isAbsolute(path) ? path : resolve(ctx.workingDirectory ?? process.cwd(), path))
    : (ctx.workingDirectory ?? process.cwd())

  try {
    // Create regex
    const regex = new RegExp(pattern, 'g')

    // Find files to search
    const filePattern = include ?? '**/*'
    const files = await glob(filePattern, {
      cwd: basePath,
      nodir: true,
      absolute: true,
      ignore: ['**/node_modules/**', '**/.git/**', '**/*.lock', '**/*.min.js', '**/*.min.css'],
    })

    const matches: GrepMatch[] = []
    let filesSearched = 0
    let totalMatches = 0

    // Search files
    for (const file of files.slice(0, MAX_FILES)) {
      if (totalMatches >= MAX_TOTAL_MATCHES) break

      try {
        const stats = await stat(file)
        
        // Skip binary/large files
        if (stats.size > 1024 * 1024) continue // > 1MB

        const content = await readFile(file, 'utf-8')
        const lines = content.split('\n')
        let fileMatches = 0

        for (let i = 0; i < lines.length; i++) {
          if (fileMatches >= MAX_MATCHES_PER_FILE) break
          if (totalMatches >= MAX_TOTAL_MATCHES) break

          const line = lines[i]
          if (regex.test(line)) {
            matches.push({
              file,
              line: i + 1,
              content: line.slice(0, 200) + (line.length > 200 ? '...' : ''),
              mtime: stats.mtime,
            })
            fileMatches++
            totalMatches++
          }
          regex.lastIndex = 0 // Reset regex for next test
        }

        filesSearched++
      } catch {
        // Skip files that can't be read (binary, etc.)
      }
    }

    if (matches.length === 0) {
      return {
        title: `No matches found for: ${pattern}`,
        output: `No matches found for pattern "${pattern}" in ${basePath}\n\nSearched ${filesSearched} files.`,
      }
    }

    // Sort by modification time (newest first)
    matches.sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

    // Format output
    const output = matches
      .map(m => `${m.file}:${m.line}: ${m.content}`)
      .join('\n')

    return {
      title: `Found ${matches.length} matches for: ${pattern}`,
      output: output + (totalMatches >= MAX_TOTAL_MATCHES ? `\n\n(Showing first ${MAX_TOTAL_MATCHES} matches)` : ''),
      metadata: {
        matches: matches.length,
        filesSearched,
        pattern,
        basePath,
        truncated: totalMatches >= MAX_TOTAL_MATCHES,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      title: `Grep error: ${pattern}`,
      output: `Error searching files: ${message}`,
    }
  }
}
