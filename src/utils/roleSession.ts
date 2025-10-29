// src/utils/roleSession.ts
const KEY = 'role_chat_ids'

function loadAll(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function saveAll(map: Record<string, string>) {
  localStorage.setItem(KEY, JSON.stringify(map))
}

export function getChatId(roleId: string): string | undefined {
  const map = loadAll()
  return map[roleId]
}

export function setChatId(roleId: string, chatId: string) {
  const map = loadAll()
  map[roleId] = chatId
  saveAll(map)
}

export function clearChatId(roleId: string) {
  const map = loadAll()
  if (roleId in map) {
    delete map[roleId]
    saveAll(map)
  }
}

export function clearAllChatIds() {
  localStorage.removeItem(KEY)
}
