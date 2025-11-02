type ModuleVal = string | { default: string }

const rawModules = import.meta.glob('/src/assets/roles/**/*.{png,jpg,jpeg,webp}', {
  eager: true
}) as Record<string, ModuleVal>

// 統一攤平成 URL 字串
const modules: Record<string, string> = {}
for (const [k, v] of Object.entries(rawModules)) {
  modules[k] = typeof v === 'string' ? v : (v?.default as string)
}

/** 依角色與「檔名」回傳實際 URL，例如 getRoleImageUrl('kabigon', 'img_happy.png') */
export function getRoleImageUrl(roleId: string, fileName?: string | null): string | undefined {
  if (!fileName) return
  const key = `/src/assets/roles/${roleId}/${fileName}`
  return modules[key]
}
