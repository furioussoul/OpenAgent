/**
 * OpenAgent Built-in Tool: Task
 * 子 Agent 任务执行工具
 * 
 * 允许主 Agent 启动子 Agent 来执行复杂的多步骤任务。
 * 子 Agent 会继承父 Agent 的配置（Provider、工具等），
 * 但拥有独立的会话和上下文。
 */

import { z } from 'zod'
import { defineTool } from '../define'
import type { ToolContext, ToolResult } from '../../types'

/**
 * 子 Agent 类型定义
 */
const SUBAGENT_TYPES = {
  general: {
    name: 'general',
    description: 'General-purpose agent for researching complex questions and executing multi-step tasks.',
    systemPrompt: `You are a sub-agent tasked with completing a specific task autonomously.

Your goal is to complete the task thoroughly and report back with a concise summary.

Guidelines:
1. Break down the task into steps
2. Execute each step carefully
3. Verify your work when possible
4. Return a clear summary of what was accomplished

You have access to all the same tools as the main agent.`,
  },
  explore: {
    name: 'explore',
    description: 'Fast agent specialized for exploring codebases. Use for finding files, searching code, or answering questions about the codebase.',
    systemPrompt: `You are a fast exploration agent specialized in codebase analysis.

Your job is to quickly:
- Find files by patterns
- Search code for keywords
- Answer questions about code structure

Be efficient and thorough. Return relevant file paths and code snippets.

Focus on speed - use glob and grep tools effectively.`,
  },
} as const

export type SubagentType = keyof typeof SUBAGENT_TYPES

/**
 * Task 工具参数
 */
const taskParameters = z.object({
  prompt: z.string().describe('The task description for the sub-agent to perform'),
  description: z.string().describe('A short (3-5 words) description of the task'),
  subagent_type: z.enum(['general', 'explore']).describe('The type of specialized agent to use'),
  task_id: z.string().optional().describe('Resume a previous task session (optional)'),
})

/**
 * 执行子 Agent 任务
 */
async function executeSubagentTask(
  args: z.infer<typeof taskParameters>,
  ctx: ToolContext
): Promise<ToolResult> {
  const { prompt, description, subagent_type, task_id } = args
  
  // 获取子 Agent 配置
  const subagentConfig = SUBAGENT_TYPES[subagent_type]
  if (!subagentConfig) {
    return {
      title: `Unknown subagent type: ${subagent_type}`,
      output: `Error: Subagent type "${subagent_type}" is not supported. Use "general" or "explore".`,
    }
  }
  
  // 动态导入 OpenAgent 以避免循环依赖
  const { OpenAgent } = await import('../../agent')
  
  try {
    // 创建子 Agent
    const subagent = new OpenAgent({
      provider: ctx.model?.providerId as 'anthropic' | 'openai' | 'google' | undefined,
      model: ctx.model?.modelId,
      workingDirectory: ctx.workingDirectory,
      mode: 'build',
      maxSteps: 15, // 子 Agent 允许更多步骤
      agent: {
        name: `subagent-${subagent_type}`,
        systemPrompt: subagentConfig.systemPrompt,
      },
    })
    
    // 如果有 task_id，继续已有会话
    if (task_id) {
      subagent.continueSession(task_id)
    }
    
    // 执行任务
    const result = await subagent.chat(prompt)
    
    return {
      title: description,
      output: result.text,
      metadata: {
        task_id: result.sessionId,
        subagent_type,
        toolCalls: result.toolCalls.length,
        usage: result.usage,
        cost: result.cost,
      },
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      title: `Task failed: ${description}`,
      output: `Error executing sub-agent task: ${message}`,
    }
  }
}

/**
 * Task 工具定义
 */
export const taskTool = defineTool({
  id: 'task',
  description: `Launch a sub-agent to handle complex, multi-step tasks autonomously.

Available agent types:
- general: General-purpose agent for research and multi-step tasks
- explore: Fast agent for codebase exploration (finding files, searching code)

Usage guidelines:
- Use "general" for complex tasks that require multiple steps
- Use "explore" for quickly finding files or understanding code structure
- Provide a clear, detailed prompt describing the task
- Include what information the agent should return

The sub-agent has access to all tools and will work autonomously.
Results are returned as a summary - the sub-agent's work is not visible to the user directly.

Example:
{
  "prompt": "Find all React components that use useState and list their file paths",
  "description": "Find useState components",
  "subagent_type": "explore"
}`,
  parameters: taskParameters,
  execute: executeSubagentTask,
})
