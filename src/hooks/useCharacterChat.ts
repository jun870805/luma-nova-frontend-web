// src/hooks/useCharacterChat.ts
import { useRef, useState } from 'react'
import type { CharacterCard, MemoryItem, SessionContext } from '../core/chat/types'
import { runCharacterTurn } from '../core/chat/runtime'
import type { LlmCaller } from '../core/chat/runtime'

export function useCharacterChat(
  character: CharacterCard,
  initialImageId: string,
  llmCaller: LlmCaller
) {
  // 初始化冷卻時間
  const initialCooldowns: Record<string, number> = (character.imageIds ?? []).reduce(
    (acc, id) => {
      acc[id] = 0
      return acc
    },
    {} as Record<string, number>
  )

  // 預設圖片 (img.png)
  const firstImageId = character.imageIds?.includes('img') ? 'img' : (character.imageIds?.[0] ?? '')

  const safeInitialImage = (character.imageIds ?? []).includes(initialImageId)
    ? initialImageId
    : firstImageId

  const [session, setSession] = useState<SessionContext>({
    recent_turns: [],
    running_summary: '',
    last_emotion: 'neutral',
    last_image_id: safeInitialImage,
    image_cooldowns: initialCooldowns,
    turn_index: 0
  })

  // ✅ 狀態：目前對話自動切換圖片
  const [currentImageId, setCurrentImageId] = useState<string>(safeInitialImage)

  // ✅ 狀態：使用者手動鎖定的背景圖（圖冊選擇後）
  const [lockedBg, setLockedBg] = useState<string | null>(null)

  const [replying, setReplying] = useState<boolean>(false)
  const [memories, setMemories] = useState<MemoryItem[]>([])

  const lastSwitchTurnGapRef = useRef<number>(3)

  // ✅ 傳訊主流程
  const send = async (userText: string) => {
    setReplying(true)
    try {
      const { decision, nextSessionContext, memoryToPersist } = await runCharacterTurn({
        llm: llmCaller,
        character_card: character,
        session_context: session,
        long_term_memory: memories,
        user_input: userText,
        lastSwitchTurnGap: lastSwitchTurnGapRef.current,
        existingMemoriesForDedup: memories
      })

      setSession(nextSessionContext)

      // ⚙️ 若沒有手動鎖定背景才允許自動切換
      if (!lockedBg) {
        setCurrentImageId(decision.image_id)
      }

      // 更新距上次換圖的間隔
      if (decision.image_id === session.last_image_id) {
        lastSwitchTurnGapRef.current += 1
      } else {
        lastSwitchTurnGapRef.current = 0
      }

      if (memoryToPersist) {
        setMemories(prev => [...prev, memoryToPersist])
      }

      return decision
    } finally {
      setReplying(false)
    }
  }

  return {
    session,
    replying,
    send,
    memories,
    currentImageId,
    lockedBg,
    setLockedBg
  }
}
