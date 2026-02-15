/**
 * OpenAgent Built-in Tool: Read
 * 文件读取工具
 */

import { z } from 'zod'
import { defineTool } from '../define'
import { localReadExecutor } from '../local'

export const readTool = defineTool({
  id: 'read',
  description: `Read a file from the filesystem.

Usage:
- The filePath parameter must be an absolute path, not a relative path
- By default, it reads up to 2000 lines starting from the beginning
- You can optionally specify a line offset and limit for long files
- Results are returned with line numbers (cat -n format)`,
  parameters: z.object({
    filePath: z.string().describe('The absolute path to the file to read'),
    offset: z.number().optional().describe('The line number to start reading from (0-based)'),
    limit: z.number().optional().describe('The number of lines to read (defaults to 2000)'),
  }),
  execute: async (args, ctx) => {
    return localReadExecutor(args, ctx)
  },
})
