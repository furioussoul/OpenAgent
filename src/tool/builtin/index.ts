/**
 * OpenAgent Built-in Tools
 * 内置工具导出
 */

// 基础文件工具
export { readTool } from './read'
export { writeTool } from './write'
export { editTool } from './edit'

// 搜索工具
export { globTool } from './glob'
export { grepTool } from './grep'

// 命令执行
export { bashTool } from './bash'

// 交互和辅助工具
export { webfetchTool } from './webfetch'
export { questionTool } from './question'

// Agent 和任务管理工具
export { taskTool } from './task'
export { todowriteTool, todoreadTool, getTodos, setTodos, clearTodos } from './todowrite'
export type { TodoItem, TodoStatus, TodoPriority } from './todowrite'
export { skillTool, registerSkill, getAvailableSkills } from './skill'
export type { SkillDefinition } from './skill'

// Imports for builtinTools array
import { readTool } from './read'
import { writeTool } from './write'
import { editTool } from './edit'
import { globTool } from './glob'
import { grepTool } from './grep'
import { bashTool } from './bash'
import { webfetchTool } from './webfetch'
import { questionTool } from './question'
import { taskTool } from './task'
import { todowriteTool, todoreadTool } from './todowrite'
import { skillTool } from './skill'

import type { ToolDefinition } from '../../types'

/**
 * 所有内置工具
 */
export const builtinTools: ToolDefinition[] = [
  // 文件操作工具
  readTool,
  writeTool,
  editTool,
  
  // 搜索工具
  globTool,
  grepTool,
  
  // 命令执行
  bashTool,
  
  // 交互和辅助工具
  webfetchTool,
  questionTool,
  
  // Agent 和任务管理工具
  taskTool,
  todowriteTool,
  todoreadTool,
  skillTool,
]

/**
 * 获取所有内置工具
 */
export function getBuiltinTools(): ToolDefinition[] {
  return builtinTools
}
