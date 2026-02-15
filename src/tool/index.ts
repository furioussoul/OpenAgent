/**
 * OpenAgent - Tool System
 */

export {
  defineTool,
  toAITool,
  toAITools,
} from './define'

export {
  registerTool,
  registerTools,
  getTool,
  getAllTools,
  unregisterTool,
  clearTools,
  getToolsForAgent,
  getAIToolsForAgent,
  getToolsForMode,
  getToolDescriptions,
} from './registry'

// Built-in Tools
export {
  readTool,
  writeTool,
  editTool,
  globTool,
  grepTool,
  bashTool,
  webfetchTool,
  questionTool,
  taskTool,
  todowriteTool,
  todoreadTool,
  skillTool,
  builtinTools,
  getBuiltinTools,
  
  // Todo management
  getTodos,
  setTodos,
  clearTodos,
  type TodoItem,
  type TodoStatus,
  type TodoPriority,
  
  // Skill management
  registerSkill,
  getAvailableSkills,
  type SkillDefinition,
} from './builtin'

// Local Executors
export {
  localBashExecutor,
  localReadExecutor,
  localWriteExecutor,
  localEditExecutor,
  localGlobExecutor,
  localGrepExecutor,
  smartReplace,
  type BashArgs,
  type ReadArgs,
  type WriteArgs,
  type EditArgs,
  type GlobArgs,
  type GrepArgs,
} from './local'
