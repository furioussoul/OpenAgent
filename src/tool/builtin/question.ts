/**
 * OpenAgent Built-in Tool: Question
 * 用户交互工具 - 询问用户问题
 */

import { z } from 'zod'
import { defineTool } from '../define'

export const questionTool = defineTool({
  id: 'question',
  description: 'Ask the user a question and wait for their response. Use this when you need clarification or user input.',
  parameters: z.object({
    question: z.string().describe('The question to ask the user'),
    options: z.array(z.object({
      label: z.string().describe('Short label for the option'),
      description: z.string().optional().describe('Description of the option'),
    })).optional().describe('Predefined options for the user to choose from'),
    multiple: z.boolean().optional().describe('Whether the user can select multiple options'),
  }),
  execute: async (args, ctx) => {
    const { question, options, multiple } = args

    await ctx.metadata({
      title: 'Waiting for user input',
      metadata: { question, options, multiple },
    })

    // 注意：实际实现中，这里需要一个机制来等待用户响应
    // 目前返回一个占位响应，实际应用中需要：
    // 1. 暂停 Agent 执行
    // 2. 通知 UI 显示问题
    // 3. 等待用户输入
    // 4. 恢复 Agent 执行
    
    // 这里我们返回一个消息，告诉 Agent 等待用户响应
    return {
      title: 'Question asked',
      output: `[WAITING_FOR_USER_INPUT]\nQuestion: ${question}\n${options ? `Options: ${options.map(o => o.label).join(', ')}` : 'Free-form input expected'}`,
      metadata: {
        question,
        options,
        multiple,
        waitingForInput: true,
      },
    }
  },
})
