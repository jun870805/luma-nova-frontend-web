// src/core/chat/runtime.ts
import type {
  CharacterCard,
  FinalDecision,
  LlmCaller,
  MemoryItem,
  SessionContext,
  Turn
} from './types'

/** 內部：移除 ``` / ```json 圍欄並嘗試解析 JSON */
function parseFencedJson(input: string | undefined): Record<string, unknown> | undefined {
  if (!input) return
  let s = input.trim()
  if (s.startsWith('```')) {
    s = s
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim()
  }
  if (s.toLowerCase().startsWith('json')) {
    s = s.slice(4).trim()
  }
  try {
    return JSON.parse(s)
  } catch {
    return
  }
}

/** 將 Turn 陣列裁切為最近 n 筆 */
function tail<T>(arr: T[], n: number): T[] {
  return arr.slice(Math.max(0, arr.length - n))
}

export type RunCharacterTurnParams = {
  llm: LlmCaller
  character_card: CharacterCard
  session_context: SessionContext
  user_input: string

  // 兼容參數（目前不使用，但保留讓既有呼叫端不會型別出錯）
  long_term_memory?: MemoryItem[]
  existingMemoriesForDedup?: MemoryItem[]
  lastSwitchTurnGap?: number
}

/**
 * 新版核心回合：
 * - 僅把「可觸發」圖片（isCanTrigger=true）提供給 LLM
 * - 由 LLM 回傳 { reply, image_id }；image_id 若不在此角色圖片清單，則忽略（置空）
 * - 不在此處變更背景；背景由圖冊「設為背景」決定
 */
export async function runCharacterTurn(params: RunCharacterTurnParams): Promise<{
  decision: FinalDecision
  nextSessionContext: SessionContext
  memoryToPersist?: MemoryItem
}> {
  const { character_card: card, session_context: session, user_input } = params

  // 只給 LLM 可觸發的圖片清單（避免預設圖 img 被選到）
  const triggerImages = (card.image || [])
    .filter(i => i.isCanTrigger)
    .map(i => ({ id: i.id, name: i.name, description: i.description }))

  // 建立 system prompt（中文）
  const system = [
    '你是一位「角色扮演 AI」，必須以角色身份回覆，不得跳脫世界觀、不得自稱 AI。',
    `角色 ID：${card.roleId}`,
    `角色名稱：${card.roleName}`,
    `人物簡介：${card.bio}`,
    `個性特質：${(card.personality || []).join('、')}`,
    `說話風格：${card.speaking_style}`,
    `世界觀規則：${(card.worldview_rules || []).join('、')}`,
    '',
    '— 可被觸發的圖片清單（JSON 陣列） —',
    JSON.stringify(triggerImages, null, 2),
    '',
    '任務：根據使用者輸入，輸出 **唯一** JSON 物件：',
    '{ "reply": string, "image_id": string }',
    '若沒有合適圖片請將 image_id 設為空字串。'
  ].join('\n')

  // 呼叫 LLM
  const llmOut = await params.llm({ system, user: user_input })
  const rawText = typeof llmOut === 'string' ? llmOut : (llmOut?.text ?? '')

  // 解析 LLM 回傳
  const decision: FinalDecision = { reply: '', image_id: '' }
  const parsed = parseFencedJson(rawText)
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>
    decision.reply = typeof obj.reply === 'string' ? obj.reply : ''
    decision.image_id = typeof obj.image_id === 'string' ? obj.image_id : ''
  } else {
    // 當作純文字
    decision.reply = rawText || ''
  }

  // 驗證 image_id 是否屬於此角色，否則忽略（置空）
  const validIds = new Set((card.image || []).map(i => i.id))
  if (!validIds.has(decision.image_id)) {
    decision.image_id = ''
  }

  // 更新對話（僅累積）
  const nextTurns: Turn[] = tail(
    [
      ...session.recent_turns,
      { role: 'user', text: user_input },
      { role: 'char', text: decision.reply }
    ],
    12
  )

  const nextSessionContext: SessionContext = {
    ...session,
    recent_turns: nextTurns,
    // 背景不在 runtime 內更新；維持原值
    last_image_id: session.last_image_id,
    image_cooldowns: session.image_cooldowns,
    turn_index: session.turn_index + 1
  }

  // 此版本暫無自動產生長期記憶
  return { decision, nextSessionContext }
}
