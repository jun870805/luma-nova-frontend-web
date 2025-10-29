// src/utils/roleImage.ts

const modules = import.meta.glob('../assets/**/*.{png,jpg,jpeg,webp}', {
  as: 'url',
  eager: true
}) as Record<string, string>

export function getRoleImageUrl(roleId: string, imageId: string): string | undefined {
  const regex = new RegExp(`${imageId}\\.(png|jpe?g|webp)$`, 'i')
  for (const [path, url] of Object.entries(modules)) {
    if (regex.test(path)) return url
  }
  return undefined
}
