// 每個 room/角色的 UI 狀態（目前只存 imageId、emotion，未來可擴充）
export type RoomUiState = {
  imageId?: string
  emotion?: string
}

const KEY = 'chat_ui_state_v1'

function loadAll(): Record<string, RoomUiState> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Record<string, RoomUiState>) : {}
  } catch {
    return {}
  }
}

function saveAll(map: Record<string, RoomUiState>) {
  localStorage.setItem(KEY, JSON.stringify(map))
}

export function getRoomUi(roomId: string): RoomUiState {
  const map = loadAll()
  return map[roomId] ?? {}
}

export function setRoomUi(roomId: string, patch: Partial<RoomUiState>) {
  const map = loadAll()
  map[roomId] = { ...map[roomId], ...patch }
  saveAll(map)
}

export function clearRoomUi(roomId: string) {
  const map = loadAll()
  if (roomId in map) {
    delete map[roomId]
    saveAll(map)
  }
}
