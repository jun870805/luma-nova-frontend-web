import type { MemoryItem, ModelMemoryWrite } from './types'

export function decideMemoryWrite(mw: ModelMemoryWrite, existing: MemoryItem[]): MemoryItem | null {
  if (!mw?.should_write) return null
  const salience = mw.salience ?? 0
  const confidence = mw.entry?.confidence ?? 0
  const text = (mw.entry?.text || '').trim()
  const type = mw.entry?.type
  if (!text || !type) return null
  const baseScore = 0.5 * salience + 0.3 * confidence
  const isDuplicate = existing.some(e => e.type === type && normalize(e.text) === normalize(text))
  if (isDuplicate) return null
  if (baseScore < 0.45) return null
  return {
    type,
    text,
    confidence: Math.max(0, Math.min(1, confidence)),
    time_hint: mw.entry?.time_hint
  }
}

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}
