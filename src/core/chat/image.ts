// src/core/chat/images.ts
import type { Emotion } from './types'

const DEFAULT_SWITCH_GAP = 2
const DEFAULT_COOLDOWN = 2

export function pickImage(
  modelEmotion: Emotion,
  proposedId: string,
  lastId: string,
  cooldowns: Record<string, number>,
  imageIds: string[],
  lastSwitchTurnGap: number,
  imageByEmotion?: Partial<Record<Emotion, string>>
) {
  // 若提案圖還在冷卻，就找替代
  if ((cooldowns[proposedId] ?? 0) > 0) {
    const pref = imageByEmotion?.[modelEmotion]
    if (pref && (cooldowns[pref] ?? 0) === 0) return pref
    const alt = imageIds.find(id => (cooldowns[id] ?? 0) === 0)
    return alt ?? lastId
  }

  // 若上一張圖與當前情緒一致，且間隔未達門檻，且未在冷卻 → 維持上一張，避免頻繁切圖
  const lastMatchesEmotion = imageByEmotion
    ? Object.entries(imageByEmotion).some(([emo, id]) => id === lastId && emo === modelEmotion)
    : guessByName(lastId, modelEmotion)

  if (
    lastMatchesEmotion &&
    lastSwitchTurnGap < DEFAULT_SWITCH_GAP &&
    (cooldowns[lastId] ?? 0) === 0
  ) {
    return lastId
  }

  return proposedId
}

export function tickCooldowns(cooldowns: Record<string, number>) {
  const next: Record<string, number> = {}
  for (const k of Object.keys(cooldowns)) next[k] = Math.max(0, (cooldowns[k] ?? 0) - 1)
  return next
}

export function applySwitchCooldown(
  chosenId: string,
  cooldowns: Record<string, number>,
  imageCooldowns?: Record<string, number>
) {
  const next = { ...cooldowns }
  const cd = imageCooldowns?.[chosenId] ?? DEFAULT_COOLDOWN
  next[chosenId] = cd
  return next
}

// 若沒有 imageByEmotion，可用檔名猜測（id 內含 happy/sad/angry/shy/normal/neutral）
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
