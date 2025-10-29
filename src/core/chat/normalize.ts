import type { Turn, TurnRole } from './types'

function toTurnRole(r: unknown): TurnRole | null {
  return r === 'user' || r === 'char' ? r : null
}

/** 把任意 turns 陣列正規化成 Turn[]，自動過濾掉不合法資料 */
export function normalizeTurns(input: Array<{ role: unknown; text: unknown }> | unknown): Turn[] {
  if (!Array.isArray(input)) return []
  const out: Turn[] = []
  for (const it of input) {
    if (typeof it !== 'object' || it == null) continue
    const role = toTurnRole(it.role)
    const text = it.text
    if (role && typeof text === 'string') {
      out.push({ role, text })
    }
  }
  return out
}
