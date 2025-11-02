// src/services/llmClient.ts
import { callFlowise, type FlowiseStartStateKV, type FlowiseResponse } from './flowiseClient'

export type LlmFormInput = {
  system?: string // Flowise 這裡不使用，但保留簽章相容
  user: string
  chatId?: string
  startState?: FlowiseStartStateKV[]
}

/**
 * 舊程式若呼叫 ({ system, user }) => callLLM_FormMode({ system, user })
 * 這裡做為薄封裝，實際改用 callFlowise。
 */
export async function callLLM_FormMode(
  input: LlmFormInput
): Promise<{ text: string; flow: FlowiseResponse; decisionJson?: unknown }> {
  const { user, chatId, startState } = input
  const { flow, decisionJson } = await callFlowise({
    question: user,
    chatId,
    startState
  })
  return { text: typeof flow.text === 'string' ? flow.text : '', flow, decisionJson }
}

// 也可直接 re-export 型別供其他檔案使用
export type { FlowiseStartStateKV } from './flowiseClient'
