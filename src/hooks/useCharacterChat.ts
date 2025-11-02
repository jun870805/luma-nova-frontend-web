// src/hooks/useCharacterChat.ts
import { useRef, useState } from 'react'
import type {
  CharacterCard,
  FinalDecision,
  MemoryItem,
  SessionContext,
  Turn,
  TurnRole
} from '../core/chat/types'
import { callFlowise } from '../services/flowiseClient'
import { markObtainedIfKnown } from '../utils/albumStorage'

export function useCharacterChat(character: CharacterCard, initialImageId: string) {
  const imageIds = character.imageIds ?? []
  const initialCooldowns: Record<string, number> = imageIds.reduce(
    (acc, id) => {
      acc[id] = 0
      return acc
    },
    {} as Record<string, number>
  )

  const safeInitialImage =
    initialImageId && initialImageId.trim().length > 0
      ? initialImageId
      : imageIds.includes('img')
        ? 'img'
        : imageIds[0] || ''

  const [session, setSession] = useState<SessionContext>({
    recent_turns: [],
    running_summary: '',
    last_image_id: safeInitialImage,
    image_cooldowns: initialCooldowns,
    turn_index: 0
  })

  const [replying, setReplying] = useState<boolean>(false)
  const [memories] = useState<MemoryItem[]>([])

  const chatIdKey = `flowise_chat_${character.roleId}`
  const [chatId, setChatId] = useState<string | undefined>(() => {
    const s = localStorage.getItem(chatIdKey)
    return s || undefined
  })

  const lastSwitchTurnGapRef = useRef<number>(3)

  const send = async (userText: string): Promise<FinalDecision> => {
    setReplying(true)
    try {
      // 僅傳 canTrigger 的圖片給 Flowise
      const triggerImages = (character.image || [])
        .filter(i => i.isCanTrigger)
        .map(i => ({
          id: i.id,
          name: i.name,
          description: i.description
        }))

      const startState = [
        { key: 'roleId', value: character.roleId },
        { key: 'roleName', value: character.roleName },
        { key: 'bio', value: character.bio },
        { key: 'personality', value: character.personality },
        { key: 'speakingStyle', value: character.speakingStyle },
        { key: 'worldviewRules', value: character.worldviewRules ?? [] },
        { key: 'images', value: triggerImages }
      ]

      const { flow, decisionJson } = await callFlowise({
        question: userText,
        chatId,
        startState
      })

      if (flow.chatId && flow.chatId !== chatId) {
        setChatId(flow.chatId)
        localStorage.setItem(chatIdKey, flow.chatId)
      }

      // ✅ 改為 const，解 ESLint prefer-const
      const decision: FinalDecision = { reply: '', image_id: '' }

      if (decisionJson && typeof decisionJson === 'object') {
        const obj = decisionJson as Record<string, unknown>
        decision.reply = typeof obj.reply === 'string' ? obj.reply : ''
        decision.image_id = typeof obj.image_id === 'string' ? obj.image_id : ''
      } else {
        decision.reply = (flow.text as string) || ''
      }

      // ✅ 若模型回傳合法 image_id，記錄為 obtained
      if (decision.image_id && imageIds.includes(decision.image_id)) {
        markObtainedIfKnown(character.roleId, decision.image_id, imageIds)
      }

      const nextTurns: Turn[] = [
        ...session.recent_turns,
        { role: 'char' as TurnRole, text: decision.reply }
      ].slice(-12)

      setSession(
        prev =>
          ({
            ...prev,
            recent_turns: nextTurns,
            running_summary: prev.running_summary,
            image_cooldowns: prev.image_cooldowns,
            last_image_id: prev.last_image_id,
            turn_index: prev.turn_index + 1
          }) satisfies SessionContext
      )

      lastSwitchTurnGapRef.current += 1
      return decision
    } finally {
      setReplying(false)
    }
  }

  return { session, replying, send, memories }
}
