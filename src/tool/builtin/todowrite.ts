/**
 * OpenAgent Built-in Tool: TodoWrite
 * 任务管理工具
 * 
 * 允许 Agent 创建和管理任务列表，用于：
 * - 规划复杂任务
 * - 跟踪进度
 * - 向用户展示工作状态
 */

import { z } from 'zod'
import { defineTool } from '../define'
import type { ToolContext, ToolResult } from '../../types'

/**
 * Todo 项状态
 */
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

/**
 * Todo 项优先级
 */
export type TodoPriority = 'high' | 'medium' | 'low'

/**
 * Todo 项定义
 */
export interface TodoItem {
  id: string
  content: string
  status: TodoStatus
  priority: TodoPriority
  createdAt?: Date
  updatedAt?: Date
}

/**
 * 全局 Todo 存储（按 session 分组）
 */
const todoStore = new Map<string, TodoItem[]>()

/**
 * 获取 session 的 todo 列表
 */
export function getTodos(sessionId: string): TodoItem[] {
  return todoStore.get(sessionId) ?? []
}

/**
 * 设置 session 的 todo 列表
 */
export function setTodos(sessionId: string, todos: TodoItem[]): void {
  todoStore.set(sessionId, todos)
}

/**
 * 清除 session 的 todo 列表
 */
export function clearTodos(sessionId: string): void {
  todoStore.delete(sessionId)
}

/**
 * TodoWrite 工具参数
 */
const todoWriteParameters = z.object({
  todos: z.array(z.object({
    id: z.string().describe('Unique identifier for the todo item'),
    content: z.string().describe('Brief description of the task'),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled'])
      .describe('Current status of the task'),
    priority: z.enum(['high', 'medium', 'low'])
      .describe('Priority level of the task'),
  })).describe('The updated todo list'),
})

/**
 * 格式化 Todo 列表为字符串
 */
function formatTodos(todos: TodoItem[]): string {
  if (todos.length === 0) {
    return 'No todos.'
  }
  
  const statusIcons: Record<TodoStatus, string> = {
    pending: '○',
    in_progress: '◐',
    completed: '●',
    cancelled: '✕',
  }
  
  const priorityIcons: Record<TodoPriority, string> = {
    high: '!!!',
    medium: '!!',
    low: '!',
  }
  
  const lines = todos.map((todo, index) => {
    const statusIcon = statusIcons[todo.status]
    const priorityIcon = priorityIcons[todo.priority]
    return `${index + 1}. [${statusIcon}] ${todo.content} (${priorityIcon} ${todo.priority})`
  })
  
  // 统计
  const stats = {
    total: todos.length,
    pending: todos.filter(t => t.status === 'pending').length,
    in_progress: todos.filter(t => t.status === 'in_progress').length,
    completed: todos.filter(t => t.status === 'completed').length,
    cancelled: todos.filter(t => t.status === 'cancelled').length,
  }
  
  const summary = `\nProgress: ${stats.completed}/${stats.total} completed`
    + (stats.in_progress > 0 ? `, ${stats.in_progress} in progress` : '')
    + (stats.cancelled > 0 ? `, ${stats.cancelled} cancelled` : '')
  
  return lines.join('\n') + summary
}

/**
 * 执行 TodoWrite
 */
async function executeTodoWrite(
  args: z.infer<typeof todoWriteParameters>,
  ctx: ToolContext
): Promise<ToolResult> {
  const { todos } = args
  const now = new Date()
  
  // 获取现有 todos 以保留时间戳
  const existingTodos = getTodos(ctx.sessionId)
  const existingMap = new Map(existingTodos.map(t => [t.id, t]))
  
  // 更新 todos
  const updatedTodos: TodoItem[] = todos.map(todo => {
    const existing = existingMap.get(todo.id)
    return {
      ...todo,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
  })
  
  // 保存
  setTodos(ctx.sessionId, updatedTodos)
  
  // 计算变更
  const newCount = updatedTodos.filter(t => !existingMap.has(t.id)).length
  const completedCount = updatedTodos.filter(t => {
    const existing = existingMap.get(t.id)
    return existing && existing.status !== 'completed' && t.status === 'completed'
  }).length
  
  let changesSummary = ''
  if (newCount > 0) changesSummary += `Added ${newCount} new task(s). `
  if (completedCount > 0) changesSummary += `Completed ${completedCount} task(s). `
  if (!changesSummary) changesSummary = 'Updated todo list. '
  
  return {
    title: 'Todo list updated',
    output: changesSummary + '\n\n' + formatTodos(updatedTodos),
    metadata: {
      total: updatedTodos.length,
      pending: updatedTodos.filter(t => t.status === 'pending').length,
      in_progress: updatedTodos.filter(t => t.status === 'in_progress').length,
      completed: updatedTodos.filter(t => t.status === 'completed').length,
      cancelled: updatedTodos.filter(t => t.status === 'cancelled').length,
    },
  }
}

/**
 * TodoWrite 工具定义
 */
export const todowriteTool = defineTool({
  id: 'todowrite',
  description: `Create and manage a structured task list for tracking progress on complex tasks.

When to use:
- Complex multi-step tasks (3+ steps)
- User provides multiple tasks
- Need to plan before executing
- Want to show progress to user

When NOT to use:
- Single, simple tasks
- Trivial operations
- Purely conversational queries

Task states:
- pending: Not started
- in_progress: Currently working (only ONE at a time)
- completed: Finished successfully
- cancelled: No longer needed

Best practices:
1. Mark tasks complete IMMEDIATELY after finishing
2. Only have ONE task in_progress at a time
3. Use clear, actionable descriptions
4. Update status in real-time

Example:
{
  "todos": [
    {"id": "1", "content": "Read existing code", "status": "completed", "priority": "high"},
    {"id": "2", "content": "Implement feature", "status": "in_progress", "priority": "high"},
    {"id": "3", "content": "Write tests", "status": "pending", "priority": "medium"},
    {"id": "4", "content": "Update docs", "status": "pending", "priority": "low"}
  ]
}`,
  parameters: todoWriteParameters,
  execute: executeTodoWrite,
})

/**
 * TodoRead 工具定义（只读版本，用于 plan 模式）
 */
export const todoreadTool = defineTool({
  id: 'todoread',
  description: 'Read the current todo list without making changes.',
  parameters: z.object({}),
  execute: async (_, ctx) => {
    const todos = getTodos(ctx.sessionId)
    return {
      title: 'Current todos',
      output: formatTodos(todos),
      metadata: {
        total: todos.length,
        pending: todos.filter(t => t.status === 'pending').length,
        in_progress: todos.filter(t => t.status === 'in_progress').length,
        completed: todos.filter(t => t.status === 'completed').length,
      },
    }
  },
})
