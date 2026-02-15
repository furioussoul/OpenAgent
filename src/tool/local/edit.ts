/**
 * OpenAgent - Local Edit Executor
 * 本地文件编辑器（带智能匹配）
 */

import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve, isAbsolute } from 'path'
import type { ToolContext, ToolResult } from '../../types'
import { smartReplace } from './edit-replacers'

export interface EditArgs {
  filePath: string
  oldString: string
  newString: string
  replaceAll?: boolean
}

/**
 * 本地文件编辑器
 */
export async function localEditExecutor(args: EditArgs, ctx: ToolContext): Promise<ToolResult> {
  const { filePath, oldString, newString, replaceAll = false } = args
  
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

  // Read current content
  const content = await readFile(absolutePath, 'utf-8')

  // Perform replacement using smart replace
  try {
    const { newContent, matchedString } = smartReplace(content, oldString, newString, replaceAll)

    // Write back
    await writeFile(absolutePath, newContent, 'utf-8')

    // Count changes
    const oldLines = content.split('\n').length
    const newLines = newContent.split('\n').length
    const lineDiff = newLines - oldLines

    let output = `Successfully edited ${absolutePath}`
    if (matchedString !== oldString) {
      output += `\n\nNote: Used fuzzy matching to find the text.`
    }
    output += `\n\nLines: ${oldLines} -> ${newLines} (${lineDiff >= 0 ? '+' : ''}${lineDiff})`

    return {
      title: `Edited ${filePath}`,
      output,
      metadata: {
        path: absolutePath,
        oldLines,
        newLines,
        lineDiff,
        fuzzyMatch: matchedString !== oldString,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      title: `Edit failed: ${filePath}`,
      output: `Error: ${message}`,
    }
  }
}
