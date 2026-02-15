/**
 * OpenAgent Provider Registry
 * AI Provider 注册与管理
 * 
 * 支持自定义 baseURL、headers 和 apiKey
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'
import type { ModelInfo, ProviderInfo } from '../types'
import { ModelNotFoundError } from '../utils/error'
import { createLogger } from '../utils/log'

const log = createLogger('provider')

// ============================================================================
// Types
// ============================================================================

export interface ProviderOptions {
  baseURL?: string
  apiKey?: string
  headers?: Record<string, string>
}

export interface ProviderConfig {
  id: string
  name: string
  /** 
   * Provider 类型，决定使用哪个 SDK 创建模型
   * - anthropic: 使用 @ai-sdk/anthropic
   * - openai: 使用 @ai-sdk/openai (兼容 OpenAI API 的服务)
   * - google: 使用 @ai-sdk/google
   * - zhipu: 使用 @ai-sdk/openai (智谱 GLM，OpenAI 兼容)
   * - kimi: 使用 @ai-sdk/openai-compatible (Moonshot Kimi)
   */
  type: 'anthropic' | 'openai' | 'google' | 'zhipu' | 'kimi'
  options: ProviderOptions
  models: ModelInfo[]
}

// ============================================================================
// Runtime State
// ============================================================================

/** 运行时 Provider 配置 */
let providers: Record<string, ProviderConfig> = { }

/** 缓存的 Provider 实例 */
const providerInstances: Map<string, ReturnType<typeof createAnthropic> | ReturnType<typeof createOpenAI> | ReturnType<typeof createGoogleGenerativeAI> | ReturnType<typeof createOpenAICompatible>> = new Map()

// ============================================================================
// Configuration
// ============================================================================

/**
 * 配置 Provider
 */
export function configureProvider(config: ProviderConfig): void {
  log.info('Configuring provider', { id: config.id, type: config.type })
  providers[config.id] = config
  // 清除缓存实例以便重新创建
  providerInstances.delete(config.id)
}

/**
 * 批量配置 Providers
 */
export function configureProviders(configs: ProviderConfig[]): void {
  for (const config of configs) {
    configureProvider(config)
  }
}

/**
 * 从 opencode.json 格式配置 Providers
 */
export function configureFromOpenCodeConfig(config: {
  provider: Record<string, {
    options: {
      baseURL?: string
      apiKey?: string
      headers?: Record<string, string>
    }
    models: Record<string, {
      id: string
      name: string
      limit?: { context?: number; output?: number }
      attachment?: boolean
      tool_call?: boolean
      reasoning?: boolean
    }>
  }>
}): void {
  for (const [providerId, providerConfig] of Object.entries(config.provider)) {
    // 确定 provider 类型
    let type: 'anthropic' | 'openai' | 'google' | 'zhipu' | 'kimi' = 'openai'
    if (providerId === 'anthropic' || providerId.includes('anthropic')) {
      type = 'anthropic'
    } else if (providerId === 'google' || providerId.includes('google') || providerId.includes('gemini')) {
      type = 'google'
    } else if (providerId === 'zhipu' || providerId === 'zhipuai' || providerId.includes('glm')) {
      type = 'zhipu'
    } else if (providerId === 'kimi' || providerId === 'moonshot' || providerId.includes('kimi')) {
      type = 'kimi'
    }
    // 其他使用 OpenAI 兼容 API
    
    const models: ModelInfo[] = Object.entries(providerConfig.models).map(([modelId, model]) => ({
      id: model.id || modelId,
      name: model.name || modelId,
      contextWindow: model.limit?.context || 128000,
      maxOutput: model.limit?.output || 8192,
      supportsFunctions: model.tool_call ?? true,
      supportsVision: model.attachment ?? false,
      supportsStreaming: true,
    }))
    
    configureProvider({
      id: providerId,
      name: providerId.charAt(0).toUpperCase() + providerId.slice(1),
      type,
      options: {
        baseURL: providerConfig.options.baseURL,
        apiKey: providerConfig.options.apiKey,
        headers: providerConfig.options.headers,
      },
      models,
    })
  }
}

/**
 * 重置为空配置
 */
export function resetProviders(): void {
  providers = {}
  providerInstances.clear()
}

// ============================================================================
// Provider Instance Creation
// ============================================================================

/**
 * 获取或创建 Provider 实例
 */
function getOrCreateProviderInstance(providerId: string) {
  const cached = providerInstances.get(providerId)
  if (cached) return cached

  const config = providers[providerId]
  if (!config) {
    throw new ModelNotFoundError(providerId, 'unknown')
  }

  log.debug('Creating provider instance', { 
    providerId, 
    type: config.type,
    hasBaseURL: !!config.options.baseURL,
    hasApiKey: !!config.options.apiKey,
  })

  let instance
  
  switch (config.type) {
    case 'anthropic': {
      const options: Parameters<typeof createAnthropic>[0] = {}
      if (config.options.baseURL) {
        options.baseURL = config.options.baseURL
      }
      if (config.options.apiKey) {
        options.apiKey = config.options.apiKey
      }
      if (config.options.headers) {
        options.headers = config.options.headers
      }
      instance = createAnthropic(options)
      break
    }
    
    case 'openai': {
      const options: Parameters<typeof createOpenAI>[0] = {}
      if (config.options.baseURL) {
        options.baseURL = config.options.baseURL
      }
      if (config.options.apiKey) {
        options.apiKey = config.options.apiKey
      }
      if (config.options.headers) {
        options.headers = config.options.headers
      }
      instance = createOpenAI(options)
      break
    }
    
    case 'google': {
      const options: Parameters<typeof createGoogleGenerativeAI>[0] = {}
      if (config.options.baseURL) {
        options.baseURL = config.options.baseURL
      }
      if (config.options.apiKey) {
        options.apiKey = config.options.apiKey
      }
      if (config.options.headers) {
        options.headers = config.options.headers
      }
      instance = createGoogleGenerativeAI(options)
      break
    }
    
    case 'zhipu': {
      // Zhipu/GLM 使用 OpenAI 兼容 API
      const options: Parameters<typeof createOpenAI>[0] = {
        baseURL: config.options.baseURL || 'https://open.bigmodel.cn/api/paas/v4',
      }
      if (config.options.apiKey) {
        options.apiKey = config.options.apiKey
      }
      if (config.options.headers) {
        options.headers = config.options.headers
      }
      instance = createOpenAI(options)
      break
    }
    
    case 'kimi': {
      // Kimi 使用 @ai-sdk/openai-compatible
      instance = createOpenAICompatible({
        name: 'kimi',
        baseURL: config.options.baseURL || 'https://opencode.ai/zen/v1',
        apiKey: config.options.apiKey,
        headers: config.options.headers,
      })
      break
    }
    
    default:
      throw new Error(`Unknown provider type: ${config.type}`)
  }

  providerInstances.set(providerId, instance)
  return instance
}

// ============================================================================
// Public API - 兼容现有代码
// ============================================================================

/** 导出 PROVIDERS 以保持兼容性 */
export const PROVIDERS: Record<string, ProviderInfo> = new Proxy({} as Record<string, ProviderInfo>, {
  get(_, key: string) {
    const config = providers[key]
    if (!config) return undefined
    return {
      id: config.id,
      name: config.name,
      models: config.models,
    }
  },
  ownKeys() {
    return Object.keys(providers)
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true }
  },
})

/**
 * 获取所有 Provider 信息
 */
export function getProviders(): ProviderInfo[] {
  return Object.values(providers).map(config => ({
    id: config.id,
    name: config.name,
    models: config.models,
  }))
}

/**
 * 获取单个 Provider 信息
 */
export function getProvider(providerId: string): ProviderInfo | undefined {
  const config = providers[providerId]
  if (!config) return undefined
  return {
    id: config.id,
    name: config.name,
    models: config.models,
  }
}

/**
 * 获取 Model 信息
 */
export function getModelInfo(providerId: string, modelId: string): ModelInfo | undefined {
  const config = providers[providerId]
  if (!config) return undefined
  return config.models.find((m) => m.id === modelId)
}

/**
 * 获取 Language Model 实例（用于 AI SDK）
 */
export function getLanguageModel(providerId: string, modelId: string): LanguageModel {
  const config = providers[providerId]
  if (!config) {
    throw new ModelNotFoundError(providerId, modelId)
  }
  
  // 检查模型是否存在（可选，允许使用未定义的模型）
  const modelInfo = config.models.find(m => m.id === modelId)
  if (!modelInfo) {
    log.warn('Model not in registry, creating anyway', { providerId, modelId })
  }

  log.debug('Creating language model', { providerId, modelId, type: config.type })
  
  const instance = getOrCreateProviderInstance(providerId)
  
  // zhipu 不支持 OpenAI 新的 Responses API，需要使用 .chat()
  if (config.type === 'zhipu') {
    return (instance as ReturnType<typeof createOpenAI>).chat(modelId)
  }
  
  // kimi 使用 openai-compatible，直接调用 chatModel
  if (config.type === 'kimi') {
    return (instance as ReturnType<typeof createOpenAICompatible>).chatModel(modelId)
  }
  
  // 其他 provider 直接调用
  return (instance as (modelId: string) => LanguageModel)(modelId)
}

/**
 * 获取默认 Model
 */
export function getDefaultModel(): { providerId: string; modelId: string } {
  // 优先使用环境变量配置
  const defaultProvider = process.env.DEFAULT_AI_PROVIDER || 'anthropic'
  const defaultModel = process.env.DEFAULT_AI_MODEL || 'claude-3-5-haiku'
  
  return {
    providerId: defaultProvider,
    modelId: defaultModel,
  }
}

/**
 * 计算 Token 费用
 */
export function calculateCost(
  providerId: string,
  modelId: string,
  tokens: { input: number; output: number; cache?: { read: number; write: number } }
): number {
  const modelInfo = getModelInfo(providerId, modelId)
  if (!modelInfo?.pricing) return 0

  const { pricing } = modelInfo
  let cost = 0

  // 基础 input/output 费用
  cost += (tokens.input / 1_000_000) * pricing.input
  cost += (tokens.output / 1_000_000) * pricing.output

  // Cache 费用
  if (tokens.cache && pricing.cache) {
    cost += (tokens.cache.read / 1_000_000) * pricing.cache.read
    cost += (tokens.cache.write / 1_000_000) * pricing.cache.write
  }

  return cost
}
