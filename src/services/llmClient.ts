// src/services/llmClient.ts

import { callFlowiseAgent, type FlowiseStartStateKV } from './flowiseClient'
import { getChatId, setChatId } from '../utils/roleSession'

const FLOWISE_BASE = import.meta.env.VITE_FLOWISE_BASE_URL as string
const FLOWISE_FLOW_ID = import.meta.env.VITE_FLOWISE_FLOW_ID as string
const FLOWISE_TOKEN = (import.meta.env.VITE_FLOWISE_TOKEN as string) || undefined

// system 由 runtime 組成的 JSON 字串；這裡解析後做成 startState
type SystemPayload = {
  roleId: string
  roleName: string
  bio: string
  personality: string[] | string
  speaking_style: string
  worldview_rules: string[] | string
  imageIds: string[] | string

  running_summary: string
  recent_turns: Array<{ role: 'user' | 'char'; text: string }> | string
  last_emotion: string
  last_image_id: string
  lastSwitchTurnGap: number | string
  long_term_memory?: string
}

function toStr(v: unknown): string {
  if (v == null) return ''
  if (Array.isArray(v)) return v.join(', ')
  return typeof v === 'string' ? v : JSON.stringify(v)
}

function toRecentTurnsLine(v: unknown): string {
  if (typeof v === 'string') return v
  if (Array.isArray(v)) {
    const arr = v as Array<{ role?: unknown; text?: unknown }>
    return arr
      .map(it => {
        const role = it?.role === 'user' ? 'User' : it?.role === 'char' ? 'Char' : 'Unknown'
        const text = typeof it?.text === 'string' ? it.text : ''
        return `${role}: ${text}`
      })
      .join(' | ')
  }
  return ''
}

function systemToStartState(
  system: string,
  userInput: string
): {
  roleId: string
  startState: FlowiseStartStateKV[]
} {
  let obj: SystemPayload
  try {
    obj = JSON.parse(system) as SystemPayload
  } catch {
    // 如果 system 不是 JSON，至少把原文與 user_input 放進去，避免整條鏈卡住
    return {
      roleId: '',
      startState: [
        { key: 'system_raw', value: system },
        { key: 'user_input', value: userInput }
      ]
    }
  }

  const roleId = String((obj as Record<string, unknown>).roleId ?? '')
  const startState: FlowiseStartStateKV[] = [
    { key: 'roleId', value: roleId },
    { key: 'roleName', value: toStr(obj.roleName) },
    { key: 'bio', value: toStr(obj.bio) },
    { key: 'personality', value: toStr(obj.personality) },
    { key: 'speaking_style', value: toStr(obj.speaking_style) },
    { key: 'worldview_rules', value: toStr(obj.worldview_rules) },
    { key: 'imageIds', value: toStr(obj.imageIds) },

    { key: 'running_summary', value: toStr(obj.running_summary) },
    { key: 'recent_turns', value: toRecentTurnsLine(obj.recent_turns) },
    { key: 'long_term_memory', value: toStr(obj.long_term_memory) },

    { key: 'last_emotion', value: toStr(obj.last_emotion) },
    { key: 'last_image_id', value: toStr(obj.last_image_id) },
    { key: 'lastSwitchTurnGap', value: String(obj.lastSwitchTurnGap ?? 0) },

    // 你在 Flowise LLM Node 仍會用 {{question}}，但這裡也帶 user_input 供其他節點使用
    { key: 'user_input', value: userInput }
  ]

  return { roleId, startState }
}

/**
 * 提供給 useCharacterChat/runtime 的 LLM 呼叫器。
 * 參數：{ system, user }（system 是 JSON 字串；user 是使用者輸入）
 * 回傳：只回覆文字（使用 Flowise 回傳的 text）
 */
export async function callLLM_FormMode(params: { system: string; user: string }): Promise<string> {
  const { system, user } = params

  // 轉成 Flowise 需要的 startState，並取得 roleId 以保存 chatId
  const { roleId, startState } = systemToStartState(system, user)
  const existingChatId = roleId ? getChatId(roleId) : undefined

  const res = await callFlowiseAgent({
    baseUrl: FLOWISE_BASE,
    flowId: FLOWISE_FLOW_ID,
    token: FLOWISE_TOKEN,
    question: user, // Flowise 的 question = 使用者訊息
    chatId: existingChatId, // 第一次不帶，之後沿用；清空聊天室時要清除對應 roleId 的 chatId
    startState // 全部角色/上下文參數都帶進去
  })

  // 若 Flowise 回覆新的 chatId，寫入本地映射（roleId -> chatId）
  if (roleId && res.chatId && res.chatId !== existingChatId) {
    setChatId(roleId, res.chatId)
  }

  // 回傳文字做為本次 AI 回覆
  return typeof res.text === 'string' ? res.text : ''
}
