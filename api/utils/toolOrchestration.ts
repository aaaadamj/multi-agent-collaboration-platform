/**
 * 工具并发编排 — 来自 Claude Code 源码设计
 *
 * 核心思路：自动分区 → 读写分离 → 同批次并发
 * - 并发安全工具（读操作/纯计算）合并到同一批次，Promise.all 并行执行
 * - 非安全工具（写操作/有副作用）各自独立批次，串行执行
 * - isConcurrencySafe 抛异常时保守降级为串行
 */

import type { ToolCallItem, ToolExecutionResult } from '../services/skillService.js'
import { executeToolCall } from '../services/skillService.js'

// ─── 并发安全声明 ─────────────────────────────────────────────
// 标明哪些工具天然并发安全（无副作用 / 纯读操作）
const CONCURRENCY_SAFE_TOOLS = new Set([
  'file_read',       // 只读
  'code_generate',   // 纯计算
  'doc_create',       // 纯计算
  'data_analyze',    // 纯计算
  'web_search',      // 只读
  'task_plan',       // 纯计算
])

/**
 * 判断工具调用是否并发安全
 * 安全：纯读操作、无副作用的计算
 */
export function isConcurrencySafe(toolId: string): boolean {
  try {
    return CONCURRENCY_SAFE_TOOLS.has(toolId)
  } catch {
    return false // 保守降级
  }
}

// ─── 批次数据结构 ──────────────────────────────────────────────

interface ToolBatch {
  /** 该批次是否可并发执行 */
  isConcurrencySafe: boolean
  /** 批次内的工具调用列表 */
  blocks: ToolCallItem[]
}

// ─── 分区算法 ──────────────────────────────────────────────────

/**
 * 将工具调用列表分区为多个批次
 *
 * 算法：
 *   遍历工具调用，连续的安全工具合并到同一批次；
 *   遇到非安全工具，闭合当前批次并开启新批次（该工具独占一个批次）。
 *
 * 来源：Claude Code `toolOrchestration.ts` → `partitionToolCalls`
 */
export function partitionToolCalls(toolCalls: ToolCallItem[]): ToolBatch[] {
  return toolCalls.reduce((acc: ToolBatch[], tc) => {
    const safe = isConcurrencySafe(tc.toolId)

    // 连续的安全工具合并到最后一个批次
    if (safe && acc.length > 0 && acc[acc.length - 1]!.isConcurrencySafe) {
      acc[acc.length - 1]!.blocks.push(tc)
    } else {
      acc.push({ isConcurrencySafe: safe, blocks: [tc] })
    }
    return acc
  }, [])
}

// ─── 执行引擎 ──────────────────────────────────────────────────

/**
 * 按批次执行工具调用
 *
 * - 安全批次：Promise.all 并行，保持入参顺序不变
 * - 非安全批次：for-of 串行，每个工具必须等上一个完成
 *
 * 来源：Claude Code `toolOrchestration.ts` → `runTools` 执行部分
 */
export async function executeBatches(
  batches: ToolBatch[],
  projectId?: number
): Promise<ToolExecutionResult[]> {
  const results: ToolExecutionResult[] = []

  for (const batch of batches) {
    if (batch.isConcurrencySafe) {
      // 并发批次
      const batchResults = await Promise.all(
        batch.blocks.map(tc =>
          executeToolCall(tc.toolId, tc.params, projectId)
        )
      )
      results.push(...batchResults)
    } else {
      // 串行批次
      for (const tc of batch.blocks) {
        const result = await executeToolCall(tc.toolId, tc.params, projectId)
        results.push(result)
      }
    }
  }

  return results
}

// ─── 一站式入口 ──────────────────────────────────────────────────

/**
 * 一站式工具编排：分区 + 执行
 * 替代原有的串行 for 循环
 */
export async function orchestrateToolCalls(
  toolCalls: ToolCallItem[],
  projectId?: number
): Promise<ToolExecutionResult[]> {
  if (toolCalls.length === 0) return []
  const batches = partitionToolCalls(toolCalls)
  return executeBatches(batches, projectId)
}
