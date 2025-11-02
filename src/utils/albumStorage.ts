export type AlbumStatus = 'none' | 'obtained' | 'unlocked'
export type AlbumData = {
  roleId: string
  images: Record<string, AlbumStatus> // key = imageId
  ts: number
}

const KEY = (roleId: string) => `album_v1_${roleId}`

export function getAlbum(roleId: string, imageIds: string[]): AlbumData {
  const raw = localStorage.getItem(KEY(roleId))
  const base: AlbumData = raw ? JSON.parse(raw) : { roleId, images: {}, ts: Date.now() }

  for (const id of imageIds) {
    if (base.images[id]) continue
    base.images[id] = id === 'img' ? 'unlocked' : 'none'
  }
  localStorage.setItem(KEY(roleId), JSON.stringify(base))
  return base
}

export function setAlbum(roleId: string, data: AlbumData) {
  localStorage.setItem(KEY(roleId), JSON.stringify(data))
}

export function unlockImage(roleId: string, imageId: string, imageIds: string[]) {
  const album = getAlbum(roleId, imageIds)
  if (!album.images[imageId]) album.images[imageId] = 'none'
  album.images[imageId] = 'unlocked'
  album.ts = Date.now()
  setAlbum(roleId, album)
}

export function markObtainedIfKnown(roleId: string, imageId: string, imageIds: string[]) {
  const album = getAlbum(roleId, imageIds)
  if (!(imageId in album.images)) return
  if (album.images[imageId] === 'none') {
    album.images[imageId] = 'obtained'
    album.ts = Date.now()
    setAlbum(roleId, album)
  }
}

export function isUnlocked(roleId: string, imageId: string, imageIds: string[]): boolean {
  const album = getAlbum(roleId, imageIds)
  return album.images[imageId] === 'unlocked'
}

export function clearAlbum(roleId: string) {
  localStorage.removeItem(KEY(roleId))
}
