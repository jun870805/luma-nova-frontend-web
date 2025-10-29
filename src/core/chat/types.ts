// src/core/chat/types.ts
export type Emotion = 'neutral' | 'happy' | 'sad' | 'angry' | 'shy'

export type TurnRole = 'user' | 'char'

export type Turn = {
  role: TurnRole
  text: string
}

export type SessionContext = {
  recent_turns: Turn[]
  running_summary: string
  last_emotion: Emotion
  last_image_id: string
  image_cooldowns: Record<string, number>
  turn_index: number
}

export type MemoryItem = {
  id: string
  text: string
  ts: number
}

export type CharacterCard = {
  roleId: string
  roleName: string
  bio: string
  personality: string[]
  speaking_style: string
  worldview_rules: string[]
  /** 角色可用圖片 IDs（對應 assets/role/{roleId}/{imageId}.png） */
  imageIds: string[]
  /** 建議：emotion 對應到預設圖片 id（例如 happy→img_happy） */
  imageByEmotion?: Partial<Record<Emotion, string>>
  /** 可選：每張圖的冷卻回合數（沒有就走預設） */
  imageCooldowns?: Record<string, number>
}

export type ModelOutput = {
  reply: string
  emotion: Emotion
  image_id: string
  make_memory: boolean
  memory_text: string
}

export type FinalDecision = {
  reply: string
  emotion: Emotion
  image_id: string
  make_memory: boolean
  memory_text: string
}
