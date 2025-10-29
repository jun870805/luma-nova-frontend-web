// src/utils/uid.ts
export function uid(): string {
  const g = globalThis as unknown as { crypto?: Crypto }
  if (g.crypto && typeof g.crypto.randomUUID === 'function') {
    return g.crypto.randomUUID()
  }
  const rand = () => Math.random().toString(36).slice(2, 10)
  return `id-${Date.now().toString(36)}-${rand()}`
}
