// src/utils/roleImage.ts

type ModuleVal = string | { default: string }

const rawModules = import.meta.glob('/src/assets/roles/**/*.{png,jpg,jpeg,webp}', {
  eager: true
  // 這裡即使加了 as:'url'，某些情況仍可能回 { default: string }
  // as: 'url',
}) as Record<string, ModuleVal>

// 🔧 統一攤平成 URL 字串
const modules: Record<string, string> = {}
for (const [k, v] of Object.entries(rawModules)) {
  modules[k] = typeof v === 'string' ? v : (v?.default as string)
}

type CacheKey = `${string}::${string}`
const cache = new Map<CacheKey, string | undefined>()

export function getRoleImageUrl(roleId: string, imageId: string): string | undefined {
  const key: CacheKey = `${roleId}::${imageId}`
  if (cache.has(key)) return cache.get(key)

  const regex = new RegExp(`assets\\/roles\\/${roleId}\\/${imageId}\\.(png|jpe?g|webp)$`, 'i')
  console.log('regex', `assets\\/roles\\/${roleId}\\/${imageId}\\.(png|jpe?g|webp)$`)

  let url: string | undefined
  console.log('modules', modules)
  for (const [path, resolvedUrl] of Object.entries(modules)) {
    if (regex.test(path)) {
      url = resolvedUrl
      break
    }
  }

  cache.set(key, url)
  return url
}
