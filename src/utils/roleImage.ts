// 依角色與圖片 id 回傳實際 URL（僅當檔案存在）
// 支援 png/jpg/jpeg/webp

const modules = import.meta.glob('../assets/roles/**/*.{png,jpg,jpeg,webp}', {
  eager: true,
  as: 'url'
}) as Record<string, string>

type CacheKey = `${string}::${string}`
const cache = new Map<CacheKey, string | undefined>()

export function getRoleImageUrl(roleId: string, imageId: string): string | undefined {
  const key: CacheKey = `${roleId}::${imageId}`
  if (cache.has(key)) return cache.get(key)

  // 目標檔案可能是多種副檔名，依序嘗試
  const candidates = [
    `/src/assets/roles/${roleId}/${imageId}.png`,
    `/src/assets/roles/${roleId}/${imageId}.jpg`,
    `/src/assets/roles/${roleId}/${imageId}.jpeg`,
    `/src/assets/roles/${roleId}/${imageId}.webp`
  ]

  // Vite 的 glob 會用相對於呼叫端的路徑鍵值（通常是以 ../ 開頭）
  // 因此也檢查 ../assets/... 的 key
  const altCandidates = candidates.map(
    p => `../assets/roles/${roleId}/${imageId}${p.slice(p.lastIndexOf('.'))}`
  )

  let url: string | undefined

  for (const p of [...candidates, ...altCandidates]) {
    if (p in modules) {
      url = modules[p]
      break
    }
  }

  cache.set(key, url)
  return url
}
