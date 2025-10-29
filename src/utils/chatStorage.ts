// src/utils/chatStorage.ts
export type Msg = {
  id: string
  from: 'user' | 'ai'
  text: string
  ts: number
}

const key = (roomId: string) => `chat_messages_${roomId}`

export function loadMessages(roomId: string): Msg[] {
  try {
    const raw = localStorage.getItem(key(roomId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as Msg[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveMessages(roomId: string, messages: Msg[]) {
  try {
    localStorage.setItem(key(roomId), JSON.stringify(messages))
  } catch {
    // ignore write error
  }
}

export function clearMessages(roomId: string) {
  try {
    localStorage.removeItem(key(roomId))
  } catch {
    // ignore clear error
  }
}

export function getLast(roomId: string): { text: string; ts: number | null } {
  const msgs = loadMessages(roomId)
  if (!msgs.length) return { text: '', ts: null }
  const m = msgs[msgs.length - 1]
  return { text: m.text ?? '', ts: m.ts ?? null }
}
