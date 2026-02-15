/**
 * OpenAgent Built-in Tool: WebFetch
 * HTTP 请求工具
 */

import { z } from 'zod'
import { defineTool } from '../define'

export const webfetchTool = defineTool({
  id: 'webfetch',
  description: 'Fetch content from a URL. Returns the content in the specified format.',
  parameters: z.object({
    url: z.string().describe('The URL to fetch'),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional().describe('HTTP method (default: GET)'),
    headers: z.record(z.string(), z.string()).optional().describe('Request headers'),
    body: z.string().optional().describe('Request body (for POST/PUT)'),
    format: z.enum(['text', 'json', 'markdown']).optional().describe('Response format (default: text)'),
    timeout: z.number().optional().describe('Timeout in milliseconds (default: 30000)'),
  }),
  execute: async (args, ctx) => {
    const { url, method, headers, body, format, timeout } = args
    const actualMethod = method ?? 'GET'
    const actualFormat = format ?? 'text'
    const actualTimeout = timeout ?? 30000

    // 更新状态
    await ctx.metadata({ title: `Fetching ${url}` })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), actualTimeout)

    try {
      const response = await fetch(url, {
        method: actualMethod,
        headers: {
          'User-Agent': 'OpenAgent/1.0',
          ...headers,
        },
        body: actualMethod !== 'GET' ? body : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return {
          title: `HTTP ${response.status}`,
          output: `HTTP Error: ${response.status} ${response.statusText}`,
          metadata: {
            status: response.status,
            statusText: response.statusText,
          },
        }
      }

      let content: string
      const contentType = response.headers.get('content-type') || ''

      if (actualFormat === 'json' || contentType.includes('application/json')) {
        const json = await response.json()
        content = JSON.stringify(json, null, 2)
      } else {
        content = await response.text()
      }

      // 截断过长的内容
      const maxLength = 50000
      if (content.length > maxLength) {
        content = content.substring(0, maxLength) + '\n\n... (truncated)'
      }

      return {
        title: `Fetched ${url}`,
        output: content,
        metadata: {
          status: response.status,
          contentType,
          contentLength: content.length,
        },
      }
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          title: 'Request timeout',
          output: `Request to ${url} timed out after ${actualTimeout}ms`,
          metadata: { error: 'timeout' },
        }
      }

      const message = error instanceof Error ? error.message : String(error)
      return {
        title: 'Fetch failed',
        output: `Failed to fetch ${url}: ${message}`,
        metadata: { error: message },
      }
    }
  },
})
