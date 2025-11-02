export type AlbumStatus = 'none' | 'obtained' | 'unlocked'

export interface AlbumData {
  roleId: string
  images: Record<string, AlbumStatus>
}

const STORAGE_KEY_PREFIX = 'album_v1_'
const storageKey = (roleId: string) => STORAGE_KEY_PREFIX + roleId

export function getAlbum(roleId: string, allImageIds: string[]): AlbumData {
  const raw = localStorage.getItem(storageKey(roleId))
  let parsed: AlbumData | null = null
  if (raw) {
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = null
    }
  }

  const result: AlbumData = { roleId, images: {} }
  for (const id of allImageIds) {
    result.images[id] = parsed?.images?.[id] ?? 'none'
  }
  result.images['img'] = 'unlocked' // 預設背景永遠解鎖
  return result
}

export function saveAlbum(roleId: string, data: AlbumData) {
  localStorage.setItem(storageKey(roleId), JSON.stringify(data))
}

export function ensureAlbumInitialized(roleId: string, allImageIds: string[]) {
  const existing = getAlbum(roleId, allImageIds)
  saveAlbum(roleId, existing)
}

export function markObtained(
  roleId: string,
  imageId: string,
  allImageIds: string[],
  forceUnlock = false
) {
  const record = getAlbum(roleId, allImageIds)
  if (!record.images[imageId]) record.images[imageId] = 'none'

  if (imageId === 'img' || forceUnlock) {
    record.images[imageId] = 'unlocked'
  } else if (record.images[imageId] === 'none') {
    record.images[imageId] = 'obtained'
  }

  saveAlbum(roleId, record)
}

export function unlockImage(roleId: string, imageId: string, allImageIds?: string[]) {
  let record: AlbumData
  if (allImageIds?.length) record = getAlbum(roleId, allImageIds)
  else {
    const raw = localStorage.getItem(storageKey(roleId))
    record = raw ? (JSON.parse(raw) as AlbumData) : { roleId, images: {} }
  }
  record.images[imageId] = 'unlocked'
  record.images['img'] = 'unlocked'
  saveAlbum(roleId, record)
}
