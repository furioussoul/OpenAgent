/**
 * OpenAgent Built-in Tool: Edit
 * 文件编辑工具（带智能匹配）
 */

import { z } from 'zod'
import { defineTool } from '../define'
import { localEditExecutor } from '../local'

export const editTool = defineTool({
  id: 'edit',
  description: `Edit a file by replacing specific text.

Usage:
- You must read the file first before editing
- Provide the exact text to find (oldString) and the replacement text (newString)
- The edit uses smart matching to handle minor whitespace/indentation differences
- Use replaceAll to replace all occurrences of the text`,
  parameters: z.object({
    filePath: z.string().describe('The absolute path to the file to modify'),
    oldString: z.string().describe('The text to replace'),
    newString: z.string().describe('The text to replace it with'),
    replaceAll: z.boolean().optional().describe('Replace all occurrences (default false)'),
  }),
  execute: async (args, ctx) => {
    return localEditExecutor(args, ctx)
  },
})
