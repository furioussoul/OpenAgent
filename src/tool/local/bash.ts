/**
 * OpenAgent - Local Bash Executor
 * 本地命令执行器
 */

import { spawn } from 'child_process'
import type { ToolContext, ToolResult } from '../../types'

export interface BashArgs {
  command: string
  workdir?: string
  timeout?: number
  description?: string
}

const DEFAULT_TIMEOUT = 120000 // 2 minutes

/**
 * 本地 Bash 执行器
 */
export async function localBashExecutor(args: BashArgs, ctx: ToolContext): Promise<ToolResult> {
  const { command, workdir, timeout = DEFAULT_TIMEOUT } = args
  const cwd = workdir ?? ctx.workingDirectory ?? process.cwd()

  return new Promise((resolve, reject) => {
    const child = spawn('bash', ['-c', command], {
      cwd,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let killed = false

    // Handle timeout
    const timeoutId = setTimeout(() => {
      killed = true
      child.kill('SIGTERM')
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL')
        }
      }, 5000)
    }, timeout)

    // Handle abort signal
    const abortHandler = () => {
      killed = true
      child.kill('SIGTERM')
      clearTimeout(timeoutId)
    }
    ctx.abort.addEventListener('abort', abortHandler)

    child.stdout?.on('data', (data) => {
      stdout += data.toString()
    })

    child.stderr?.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      clearTimeout(timeoutId)
      ctx.abort.removeEventListener('abort', abortHandler)

      if (killed && ctx.abort.aborted) {
        reject(new Error('Command aborted'))
        return
      }

      if (killed) {
        resolve({
          title: `Command timed out after ${timeout}ms`,
          output: `TIMEOUT: Command exceeded ${timeout}ms limit.\n\nPartial stdout:\n${stdout}\n\nPartial stderr:\n${stderr}`,
        })
        return
      }

      // Combine output
      let output = ''
      if (stdout) {
        output += stdout
      }
      if (stderr) {
        output += (output ? '\n\n' : '') + `stderr:\n${stderr}`
      }
      if (!output) {
        output = '(no output)'
      }

      // Include exit code in output if non-zero
      if (code !== 0) {
        output += `\n\n(exit code: ${code})`
      }

      resolve({
        title: args.description ?? `bash: ${command.slice(0, 50)}${command.length > 50 ? '...' : ''}`,
        output,
        metadata: {
          exitCode: code,
          cwd,
        },
      })
    })

    child.on('error', (err) => {
      clearTimeout(timeoutId)
      ctx.abort.removeEventListener('abort', abortHandler)
      reject(err)
    })
  })
}
