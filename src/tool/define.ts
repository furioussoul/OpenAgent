/**
 * OpenAgent Tool Definition
 * Tool 定义辅助函数
 */

import { z, type ZodError } from 'zod'
import { zodSchema, type Tool } from 'ai'
import type { ToolContext, ToolResult, ToolDefinition } from '../types'

/**
 * 定义一个 Tool
 */
export function defineTool<TParams extends z.ZodType>(config: {
  id: string
  description: string
  parameters: TParams
  execute: (args: z.infer<TParams>, ctx: ToolContext) => Promise<ToolResult>
}): ToolDefinition<TParams> {
  return {
    id: config.id,
    description: config.description,
    parameters: config.parameters,
    execute: async (args, ctx) => {
      // 参数验证
      try {
        config.parameters.parse(args)
      } catch (error) {
        if (error instanceof z.ZodError) {
          const zodError = error as ZodError
          const messages = zodError.issues?.map((e) => e.message).join(', ') ?? String(error)
          throw new Error(`Tool "${config.id}" received invalid arguments: ${messages}`)
        }
        throw error
      }
      
      // 执行
      return config.execute(args, ctx)
    },
  }
}

/**
 * 将 ToolDefinition 转换为 AI SDK Tool 格式
 */
export function toAITool<TParams extends z.ZodType>(
  toolDef: ToolDefinition<TParams>,
  ctx: Omit<ToolContext, 'callId'>
): Tool {
  // 使用 AI SDK 的 zodSchema 来转换 Zod schema
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inputSchema = zodSchema(toolDef.parameters as any)
  
  // 构建 AI SDK v6 格式的 Tool
  const tool: Tool = {
    description: toolDef.description,
    inputSchema,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute: async (args: any, options: any) => {
      const fullCtx: ToolContext = {
        ...ctx,
        callId: options?.toolCallId,
      }
      
      const result = await toolDef.execute(args, fullCtx)
      return result.output
    },
  }
  
  return tool
}

/**
 * 批量转换 Tools
 */
export function toAITools(
  tools: ToolDefinition[],
  ctx: Omit<ToolContext, 'callId'>
): Record<string, Tool> {
  const result: Record<string, Tool> = {}
  
  for (const tool of tools) {
    result[tool.id] = toAITool(tool, ctx)
  }
  
  return result
}
