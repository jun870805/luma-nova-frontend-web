import type { CharacterCard, Emotion } from '../chat/types'

export type RoleConfig = {
  roleId: string
  roleName: string
  bio: string
  personality: string[]
  speaking_style: string
  worldview_rules: string[]
  /** 角色可用圖片 IDs（對應 assets/role/{roleId}/{imageId}.png） */
  imageIds: string[]
  /** 可選：情緒 → 預設圖片 id 的映射 */
  imageByEmotion?: Partial<Record<Emotion, string>>
  /** 可選：圖片冷卻回合數（每張圖） */
  imageCooldowns?: Record<string, number>
}

const DEFAULT_COOLDOWN = 2

function guessByName(id: string, emo: Emotion): boolean {
  const n = id.toLowerCase()
  switch (emo) {
    case 'happy':
      return n.includes('happy')
    case 'sad':
      return n.includes('sad')
    case 'angry':
      return n.includes('angry')
    case 'shy':
      return n.includes('shy')
    case 'neutral':
      return n.includes('neutral') || n.includes('normal')
    default:
      return false
  }
}

function buildImageByEmotion(
  imageIds: string[],
  given?: Partial<Record<Emotion, string>>
): Partial<Record<Emotion, string>> {
  if (given) return given

  const pick = (emo: Emotion, fallbackIdx = 0): string | undefined => {
    const found = imageIds.find(id => guessByName(id, emo))
    return found ?? imageIds[fallbackIdx]
  }

  return {
    neutral: pick('neutral', 0),
    happy: pick('happy'),
    sad: pick('sad'),
    angry: pick('angry'),
    shy: pick('shy')
  }
}

function normalizeCooldowns(
  imageIds: string[],
  cooldowns?: Record<string, number>
): Record<string, number> | undefined {
  if (!cooldowns) return undefined
  const res: Record<string, number> = {}
  for (const id of imageIds) {
    const v = cooldowns[id]
    res[id] = Number.isFinite(v) ? Math.max(0, v as number) : DEFAULT_COOLDOWN
  }
  return res
}

export function roleToCharacterCard(cfg: RoleConfig): CharacterCard {
  const imageIds = Array.from(new Set(cfg.imageIds)).filter(Boolean)
  const imageByEmotion = buildImageByEmotion(imageIds, cfg.imageByEmotion)
  const imageCooldowns = normalizeCooldowns(imageIds, cfg.imageCooldowns)

  const card: CharacterCard = {
    roleId: String(cfg.roleId),
    roleName: cfg.roleName,
    bio: cfg.bio,
    personality: [...cfg.personality],
    speaking_style: cfg.speaking_style,
    worldview_rules: [...cfg.worldview_rules],
    imageIds,
    imageByEmotion,
    imageCooldowns
  }
  return card
}
