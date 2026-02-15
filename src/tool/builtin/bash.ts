/**
 * OpenAgent Built-in Tool: Bash
 * 命令执行工具
 */

import { z } from 'zod'
import { defineTool } from '../define'
import { localBashExecutor } from '../local'

export const bashTool = defineTool({
  id: 'bash',
  description: `Execute a bash command and return the output. Use this for system operations.

IMPORTANT: 
- Commands will timeout after 2 minutes (120000ms) by default.
- For long-running commands (servers, watch processes), add '&' at the end to run in background.

Examples:
- Normal command: npm install
- Background command: npm run dev &`,
  parameters: z.object({
    command: z.string().describe('The bash command to execute'),
    workdir: z.string().optional().describe('The working directory to run the command in'),
    timeout: z.number().optional().describe('Timeout in milliseconds. Default is 120000 (2 minutes).'),
    description: z.string().optional().describe('A short description of what this command does'),
  }),
  execute: async (args, ctx) => {
    return localBashExecutor(args, ctx)
  },
})
