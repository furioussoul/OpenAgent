/**
 * OpenAgent Built-in Tool: Write
 * 文件写入工具
 */

import { z } from 'zod'
import { defineTool } from '../define'
import { localWriteExecutor } from '../local'

export const writeTool = defineTool({
  id: 'write',
  description: `Write content to a file. Creates the file if it doesn't exist, or overwrites if it does.

Usage:
- ALWAYS prefer editing existing files with the 'edit' tool
- Only use this for creating new files or complete rewrites
- The directory will be created if it doesn't exist`,
  parameters: z.object({
    filePath: z.string().describe('The absolute path to the file to write'),
    content: z.string().describe('The content to write to the file'),
  }),
  execute: async (args, ctx) => {
    return localWriteExecutor(args, ctx)
  },
})
