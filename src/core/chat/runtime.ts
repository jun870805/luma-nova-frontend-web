// src/core/chat/runtime.ts
import type {
  CharacterCard,
  FinalDecision,
  MemoryItem,
  ModelOutput,
  SessionContext,
  Turn
} from './types'

export type LlmCaller = (params: { system: string; user: string }) => Promise<string>

// 將 character + session 組成 system（你原本怎麼組就保留；這裡提供穩定版本）
function buildSystemPayload(card: CharacterCard, session: SessionContext) {
  return JSON.stringify({
    roleId: card.roleId,
    roleName: card.roleName,
    bio: card.bio,
    personality: card.personality,
    speaking_style: card.speaking_style,
    worldview_rules: card.worldview_rules,
    imageIds: card.imageIds,
    running_summary: session.running_summary,
    recent_turns: session.recent_turns,
    last_emotion: session.last_emotion,
    last_image_id: session.last_image_id,
    lastSwitchTurnGap: session.turn_index,
    long_term_memory: '' // 若你有長期記憶摘要可帶
  })
}

// ✅ 安全解析：處理 ```json ... ```、"json\n{...}"、雙層字串等情況
function safeParseModelOutput(raw: string, session: SessionContext): ModelOutput {
  const fallback: ModelOutput = {
    reply: raw,
    emotion: session.last_emotion ?? 'neutral',
    image_id: session.last_image_id,
    make_memory: false,
    memory_text: ''
  }
  if (!raw) return fallback

  let cleaned = raw.trim()

  // 去掉 Markdown code fence
  if (cleaned.startsWith('```')) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```$/, '')
      .trim()
  }

  // 去掉開頭殘留的 'json' 或 'json\n'
  if (/^json\b/i.test(cleaned)) {
    cleaned = cleaned.replace(/^json\b\s*/i, '').trim()
  }

  // 若還是被引號包著的字串，嘗試再解一層
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    try {
      cleaned = JSON.parse(cleaned)
    } catch {
      return fallback
    }
  }

  try {
    const obj = JSON.parse(cleaned)
    const out: ModelOutput = {
      reply: typeof obj.reply === 'string' ? obj.reply : fallback.reply,
      emotion: typeof obj.emotion === 'string' ? obj.emotion : fallback.emotion,
      image_id: typeof obj.image_id === 'string' ? obj.image_id : fallback.image_id,
      make_memory: !!obj.make_memory,
      memory_text: typeof obj.memory_text === 'string' ? obj.memory_text : ''
    }
    return out
  } catch {
    return fallback
  }
}

// 產生下一個 SessionContext（更新 turns、摘要、情緒、圖片、冷卻等邏輯）
function nextSession(prev: SessionContext, parsed: ModelOutput): SessionContext {
  const nextTurns: Turn[] = [
    ...prev.recent_turns,
    { role: 'char' as const, text: parsed.reply }
  ].slice(-12)

  return {
    ...prev,
    recent_turns: nextTurns,
    running_summary: prev.running_summary, // 如果你有摘要更新器可在這裡換
    last_emotion: parsed.emotion,
    last_image_id: parsed.image_id,
    // 你的 cooldown 若有邏輯可在此更新，這裡先原樣帶出
    image_cooldowns: prev.image_cooldowns,
    turn_index: prev.turn_index + 1
  }
}

export async function runCharacterTurn(params: {
  llm: LlmCaller
  character_card: CharacterCard
  session_context: SessionContext
  long_term_memory: MemoryItem[]
  user_input: string
  lastSwitchTurnGap: number
  existingMemoriesForDedup?: MemoryItem[]
}): Promise<{
  decision: FinalDecision
  nextSessionContext: SessionContext
  memoryToPersist?: MemoryItem
}> {
  // 1) call LLM
  const system = buildSystemPayload(params.character_card, params.session_context)
  const raw = await params.llm({ system, user: params.user_input })

  // 2) 解析（這步會把 ```json ... ``` 清掉，正確取出 image_id）
  const parsed = safeParseModelOutput(raw, params.session_context)

  // 3) 拼回合（把 user 的話補進去）
  const nextTurnsWithUser: Turn[] = [
    ...params.session_context.recent_turns,
    { role: 'user' as const, text: params.user_input }
  ].slice(-12)

  const sessionAfterUser: SessionContext = {
    ...params.session_context,
    recent_turns: nextTurnsWithUser
  }

  // 4) 更新 session（把角色回覆也加進去，並更新 last_image_id / last_emotion）
  const nextCtx = nextSession(sessionAfterUser, parsed)

  // 5) 記憶（若需要）
  let memoryToPersist: MemoryItem | undefined
  if (parsed.make_memory && parsed.memory_text?.trim()) {
    memoryToPersist = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text: parsed.memory_text.trim(),
      ts: Date.now()
    }
  }

  // 6) 回傳給 hook/元件
  const decision: FinalDecision = {
    reply: parsed.reply,
    emotion: parsed.emotion,
    image_id: parsed.image_id,
    make_memory: parsed.make_memory,
    memory_text: parsed.memory_text
  }

  return {
    decision,
    nextSessionContext: nextCtx,
    memoryToPersist
  }
}
