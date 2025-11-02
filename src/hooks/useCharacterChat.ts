// src/hooks/useCharacterChat.ts
import { useState } from 'react'
import type { CharacterCard, FinalDecision } from '../core/chat/types'
import { callCharacterLLM as callCharacterChat } from '../services/chatClient'
import { getChatId, setChatId } from '../utils/roleSession'

export function useCharacterChat(character: CharacterCard) {
  const [replying, setReplying] = useState(false)

  const send = async (userText: string): Promise<FinalDecision> => {
    setReplying(true)
    try {
      const existingChatId = getChatId(character.roleId)
      const { decision, flowText, flowChatId } = await callCharacterChat({
        character,
        question: userText,
        chatId: existingChatId
      })

      if (flowChatId && flowChatId !== existingChatId) {
        setChatId(character.roleId, flowChatId)
      }

      if (!decision) {
        return { reply: (flowText || '').trim(), image_id: '' }
      }

      const validIds = new Set((character.image ?? []).map(i => i.id))
      if (decision.image_id && !validIds.has(decision.image_id)) {
        return { reply: decision.reply, image_id: '' }
      }

      return decision
    } finally {
      setReplying(false)
    }
  }

  return { replying, send }
}
