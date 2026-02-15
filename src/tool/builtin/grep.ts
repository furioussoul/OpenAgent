/**
 * OpenAgent Built-in Tool: Grep
 * 内容搜索工具
 */

import { z } from 'zod'
import { defineTool } from '../define'
import { localGrepExecutor } from '../local'

export const grepTool = defineTool({
  id: 'grep',
  description: `Search file contents using regular expressions.

Usage:
- Supports full regex syntax (e.g., "log.*Error", "function\\s+\\w+")
- Filter files by pattern with the include parameter
- Returns file paths and line numbers with matches`,
  parameters: z.object({
    pattern: z.string().describe('The regex pattern to search for in file contents'),
    path: z.string().optional().describe('The directory to search in (defaults to working directory)'),
    include: z.string().optional().describe('File pattern to include (e.g., "*.js", "*.{ts,tsx}")'),
  }),
  execute: async (args, ctx) => {
    return localGrepExecutor(args, ctx)
  },
})
