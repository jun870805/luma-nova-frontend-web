// src/utils/settingsStorage.ts
export type ModelKey = 'gemini_flash' | 'llama3_8b'

export const MODEL_OPTIONS = [
  {
    key: 'gemini_flash' as const,
    label: 'Gemini-2.5-flash',
    envVar: 'VITE_FLOWISE_CHAT_GEMINI_FLOW_ID'
  },
  {
    key: 'llama3_8b' as const,
    label: 'llama-3.1-8b-instant',
    envVar: 'VITE_FLOWISE_CHAT_LLAMA_FLOW_ID'
  }
]

const LS_KEY = 'settings_v1_model'

export function getSelectedModel(): ModelKey {
  const raw = localStorage.getItem(LS_KEY)
  if (raw === 'llama3_8b') return 'llama3_8b'
  return 'gemini_flash'
}

export function setSelectedModel(key: ModelKey) {
  localStorage.setItem(LS_KEY, key)
}
