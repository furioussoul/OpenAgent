/**
 * OpenAgent Built-in Tool: Glob
 * 文件模式匹配工具
 */

import { z } from 'zod'
import { defineTool } from '../define'
import { localGlobExecutor } from '../local'

export const globTool = defineTool({
  id: 'glob',
  description: `Find files matching a glob pattern.

Usage:
- Supports glob patterns like "**/*.js" or "src/**/*.ts"
- Returns matching file paths sorted by modification time
- Use this to find files by name patterns`,
  parameters: z.object({
    pattern: z.string().describe('The glob pattern to match files against'),
    path: z.string().optional().describe('The directory to search in (defaults to working directory)'),
  }),
  execute: async (args, ctx) => {
    return localGlobExecutor(args, ctx)
  },
})
