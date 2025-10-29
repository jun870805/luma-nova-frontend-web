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
  const imageList = character.imageIds ?? []
  const imageSet = new Set(imageList)

  const initialCooldowns: Record<string, number> = imageList.reduce(
    (acc, id) => {
      acc[id] = 0
      return acc
    },
    {} as Record<string, number>
  )

  const firstImageId = imageList[0] ?? ''
  const safeInitialImage = imageSet.has(initialImageId) ? initialImageId : firstImageId

  const [session, setSession] = useState<SessionContext>({
    recent_turns: [],
    running_summary: '',
    last_emotion: 'neutral',
    last_image_id: safeInitialImage,
    image_cooldowns: initialCooldowns,
    turn_index: 0
  })

  const [currentImageId, setCurrentImageId] = useState<string>(safeInitialImage)
  const [replying, setReplying] = useState<boolean>(false)
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const lastSwitchTurnGapRef = useRef<number>(3)

  // ✅ 如果回傳的 image_id 不在角色列表中，就不顯示背景
  const chooseImageId = (proposed: string, prev: string, fallback: string) => {
    if (proposed && imageSet.has(proposed)) return proposed
    // ❌ 不在列表中，代表不要顯示任何圖片
    if (proposed && !imageSet.has(proposed)) return ''
    // 若沒提供 proposed，則回退到之前的或預設
    if (prev && imageSet.has(prev)) return prev
    return imageSet.has(fallback) ? fallback : ''
  }

  const send = async (userText: string) => {
    setReplying(true)
    try {
      const prevLastImage = session.last_image_id

      const { decision, nextSessionContext, memoryToPersist } = await runCharacterTurn({
        llm: llmCaller,
        character_card: character,
        session_context: session,
        long_term_memory: memories,
        user_input: userText,
        lastSwitchTurnGap: lastSwitchTurnGapRef.current,
        existingMemoriesForDedup: memories
      })

      const chosenId = chooseImageId(decision.image_id, prevLastImage, safeInitialImage)

      setSession(nextSessionContext)
      setCurrentImageId(chosenId)

      if (chosenId === prevLastImage) {
        lastSwitchTurnGapRef.current += 1
      } else {
        lastSwitchTurnGapRef.current = 0
      }

      if (memoryToPersist) {
        setMemories(prev => [...prev, memoryToPersist])
      }

      return { ...decision, image_id: chosenId }
    } finally {
      setReplying(false)
    }
  }

  return { session, currentImageId, replying, send, memories }
}
