// src/utils/roleImage.ts

const modules = import.meta.glob('../assets/roles/**/*.{png,jpg,jpeg,webp}', {
  eager: true,
  as: 'url'
}) as Record<string, string>

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
