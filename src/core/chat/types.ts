export type TurnRole = 'user' | 'char'

export type Turn = {
  role: TurnRole
  text: string
}

export type MemoryItem = {
  id: string
  text: string
  ts: number
}

export type SessionContext = {
  recent_turns: Turn[]
  running_summary: string
  last_image_id: string
  image_cooldowns: Record<string, number>
  turn_index: number
}

export type FinalDecision = {
  reply: string
  image_id: string
}

export type LlmCaller = (input: {
  system: string
  user: string
}) => Promise<string | { text?: string }>

export type RoleImage = {
  id: string
  name: string
  fileName: string
  description: string
  isCanTrigger: boolean
}

export type CharacterCard = {
  roleId: string
  roleName: string
  bio: string
  personality: string[]
  speakingStyle: string
  worldviewRules?: string[]
  image: RoleImage[]
  imageIds?: string[]
  firstMessage?: string
  errorMessage?: string
}
