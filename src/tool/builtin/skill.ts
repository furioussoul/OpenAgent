/**
 * OpenAgent Built-in Tool: Skill
 * 技能加载工具
 * 
 * 允许 Agent 动态加载专业技能，提供特定领域的指令和工作流。
 * 技能可以是：
 * - 内置技能（预定义的专业知识）
 * - 文件技能（从 Markdown 文件加载）
 * - 远程技能（从 URL 加载）
 */

import { z } from 'zod'
import { defineTool } from '../define'
import type { ToolContext, ToolResult } from '../../types'
import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * 技能定义
 */
export interface SkillDefinition {
  name: string
  description: string
  content: string
  location?: string
}

/**
 * 内置技能
 */
const BUILTIN_SKILLS: Record<string, SkillDefinition> = {
  'git-expert': {
    name: 'git-expert',
    description: 'Expert knowledge for Git operations, branching strategies, and conflict resolution.',
    content: `# Git Expert Skill

You are now a Git expert. Follow these guidelines:

## Commit Messages
- Use conventional commits: feat:, fix:, docs:, refactor:, test:, chore:
- Keep subject line under 72 characters
- Use imperative mood ("add" not "added")

## Branching
- main/master: Production-ready code
- develop: Integration branch
- feature/*: New features
- fix/*: Bug fixes
- release/*: Release preparation

## Best Practices
1. Commit often, push regularly
2. Never force push to shared branches
3. Always pull before pushing
4. Review diffs before committing
5. Write meaningful commit messages

## Common Commands
- git status: Check working tree
- git diff: See unstaged changes
- git diff --staged: See staged changes
- git log --oneline -10: Recent history
- git stash: Temporarily save changes
- git cherry-pick <hash>: Apply specific commit
`,
  },
  
  'code-review': {
    name: 'code-review',
    description: 'Guidelines for conducting thorough code reviews.',
    content: `# Code Review Skill

You are now a code reviewer. Follow these guidelines:

## Review Checklist
1. **Correctness**: Does the code do what it's supposed to?
2. **Security**: Are there any vulnerabilities?
3. **Performance**: Any obvious inefficiencies?
4. **Readability**: Is the code clear and well-documented?
5. **Testing**: Are there adequate tests?
6. **Edge Cases**: Are boundary conditions handled?

## Feedback Style
- Be constructive, not critical
- Explain WHY, not just WHAT
- Suggest improvements, don't demand
- Acknowledge good work
- Prioritize issues (blocking vs nice-to-have)

## Common Issues to Check
- Error handling
- Input validation
- Resource cleanup
- Thread safety
- Magic numbers/strings
- Code duplication
- Overly complex logic
`,
  },
  
  'typescript-expert': {
    name: 'typescript-expert',
    description: 'TypeScript best practices and patterns.',
    content: `# TypeScript Expert Skill

You are now a TypeScript expert. Follow these guidelines:

## Type Safety
- Prefer \`unknown\` over \`any\`
- Use strict mode (\`strict: true\`)
- Avoid type assertions when possible
- Use discriminated unions for state

## Best Practices
1. Use interfaces for object shapes
2. Use type aliases for unions/intersections
3. Prefer readonly when mutation not needed
4. Use generics for reusable types
5. Export types alongside implementations

## Common Patterns
\`\`\`typescript
// Discriminated Union
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: Error }

// Type Guard
function isString(value: unknown): value is string {
  return typeof value === 'string'
}

// Utility Types
type Partial<T> = { [P in keyof T]?: T[P] }
type Required<T> = { [P in keyof T]-?: T[P] }
type Pick<T, K extends keyof T> = { [P in K]: T[P] }
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
\`\`\`

## Error Handling
- Use Result types for expected failures
- Throw for unexpected errors
- Type your errors when possible
`,
  },
  
  'testing': {
    name: 'testing',
    description: 'Testing strategies and patterns.',
    content: `# Testing Skill

You are now a testing expert. Follow these guidelines:

## Test Structure (AAA)
1. **Arrange**: Set up test data and conditions
2. **Act**: Execute the code under test
3. **Assert**: Verify the results

## Test Types
- **Unit Tests**: Single function/module
- **Integration Tests**: Multiple components
- **E2E Tests**: Full user flows

## Best Practices
1. One assertion per test (when reasonable)
2. Test behavior, not implementation
3. Use descriptive test names
4. Keep tests independent
5. Mock external dependencies
6. Test edge cases and errors

## Common Patterns
\`\`\`typescript
describe('functionName', () => {
  it('should do X when Y', () => {
    // Arrange
    const input = ...
    
    // Act
    const result = functionName(input)
    
    // Assert
    expect(result).toBe(expected)
  })
  
  it('should throw when invalid input', () => {
    expect(() => functionName(null)).toThrow()
  })
})
\`\`\`

## Coverage Goals
- Aim for 80%+ coverage on critical paths
- Don't chase 100% blindly
- Focus on meaningful tests
`,
  },
}

/**
 * 技能注册表（运行时扩展）
 */
const skillRegistry = new Map<string, SkillDefinition>(
  Object.entries(BUILTIN_SKILLS)
)

/**
 * 注册技能
 */
export function registerSkill(skill: SkillDefinition): void {
  skillRegistry.set(skill.name, skill)
}

/**
 * 获取所有可用技能
 */
export function getAvailableSkills(): SkillDefinition[] {
  return Array.from(skillRegistry.values())
}

/**
 * Skill 工具参数
 */
const skillParameters = z.object({
  name: z.string().describe('The name of the skill to load'),
})

/**
 * 从文件加载技能
 */
async function loadSkillFromFile(filePath: string): Promise<SkillDefinition | undefined> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const name = path.basename(filePath, path.extname(filePath))
    
    // 尝试从文件内容提取描述（第一行注释或 front matter）
    let description = `Skill loaded from ${filePath}`
    const firstLine = content.split('\n')[0]
    if (firstLine.startsWith('# ')) {
      description = firstLine.slice(2).trim()
    }
    
    return {
      name,
      description,
      content,
      location: filePath,
    }
  } catch {
    return undefined
  }
}

/**
 * 从 URL 加载技能
 */
async function loadSkillFromUrl(url: string): Promise<SkillDefinition | undefined> {
  try {
    const response = await fetch(url)
    if (!response.ok) return undefined
    
    const content = await response.text()
    const urlObj = new URL(url)
    const name = path.basename(urlObj.pathname, path.extname(urlObj.pathname))
    
    return {
      name,
      description: `Skill loaded from ${url}`,
      content,
      location: url,
    }
  } catch {
    return undefined
  }
}

/**
 * 执行 Skill 加载
 */
async function executeSkillLoad(
  args: z.infer<typeof skillParameters>,
  ctx: ToolContext
): Promise<ToolResult> {
  const { name } = args
  
  // 1. 先检查注册表
  let skill = skillRegistry.get(name)
  
  // 2. 如果是文件路径，尝试加载
  if (!skill && (name.startsWith('/') || name.startsWith('.') || name.includes('/'))) {
    const resolvedPath = path.isAbsolute(name) 
      ? name 
      : path.resolve(ctx.workingDirectory ?? process.cwd(), name)
    skill = await loadSkillFromFile(resolvedPath)
    
    if (skill) {
      // 缓存到注册表
      registerSkill(skill)
    }
  }
  
  // 3. 如果是 URL，尝试加载
  if (!skill && (name.startsWith('http://') || name.startsWith('https://'))) {
    skill = await loadSkillFromUrl(name)
    
    if (skill) {
      registerSkill(skill)
    }
  }
  
  // 4. 如果找不到技能
  if (!skill) {
    const available = getAvailableSkills().map(s => `- ${s.name}: ${s.description}`).join('\n')
    return {
      title: `Skill not found: ${name}`,
      output: `Error: Skill "${name}" is not available.\n\nAvailable skills:\n${available}`,
    }
  }
  
  // 5. 返回技能内容
  return {
    title: `Loaded skill: ${skill.name}`,
    output: `<skill_content name="${skill.name}">\n${skill.content}\n</skill_content>`,
    metadata: {
      skillName: skill.name,
      skillDescription: skill.description,
      location: skill.location,
    },
  }
}

/**
 * Skill 工具定义
 */
export const skillTool = defineTool({
  id: 'skill',
  description: `Load a specialized skill that provides domain-specific instructions and workflows.

Available built-in skills:
- git-expert: Git operations, branching, conflict resolution
- code-review: Code review guidelines and checklist
- typescript-expert: TypeScript best practices and patterns
- testing: Testing strategies and patterns

You can also load skills from:
- File path: "./skills/my-skill.md" or "/absolute/path/skill.md"
- URL: "https://example.com/skill.md"

The skill content will be injected into the conversation context.

Example:
{
  "name": "git-expert"
}

Or load from file:
{
  "name": "./my-custom-skill.md"
}`,
  parameters: skillParameters,
  execute: executeSkillLoad,
})
