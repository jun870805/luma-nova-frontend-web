import type { CharacterCard, RoleImage } from '../chat/types'

export type RoleConfig = Omit<CharacterCard, 'imageIds'> & {
  image: RoleImage[]
}

export function roleToCharacterCard(config: RoleConfig): CharacterCard {
  const imageIds = config.image.map(i => i.id)
  return {
    ...config,
    imageIds
  }
}

export function getImageById(
  card: CharacterCard,
  imageId: string | null | undefined
): RoleImage | undefined {
  if (!imageId) return
  return (card.image || []).find(i => i.id === imageId)
}

// ---- 可顯示角色集中登錄 ----
import { KabigonCard } from './kabigon'
import { MuxingCard } from './muxing'
import { SistersCard } from './sisters'
import { ZhouCard } from './zhou'

export const availableRoles: CharacterCard[] = [KabigonCard, MuxingCard, SistersCard, ZhouCard]
