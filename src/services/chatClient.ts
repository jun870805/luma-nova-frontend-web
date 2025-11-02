// src/services/chatClient.ts
import { callFlowise, FlowiseEnv, type StartStateKV } from './flowiseClient'
import type { CharacterCard, FinalDecision, RoleImage } from '../core/chat/types'
import { getSelectedModel, type ModelKey } from '../utils/settingsStorage'

/** 依選定模型 key 取出對應 flowId */
function pickFlowIdByModelKey(key: ModelKey): string {
  switch (key) {
    case 'llama3_8b':
      return FlowiseEnv.FLOW_ID_LLAMA
    case 'gemini_flash':
    default:
      return FlowiseEnv.FLOW_ID_GEMINI
  }
}

/** 建立角色對應的 startState（只包含可被觸發圖片） */
function buildStartStateFromCharacter(card: CharacterCard): StartStateKV[] {
  const triggerableImages = (card.image ?? []).filter((it: RoleImage) => it.isCanTrigger)

  return [
    { key: 'roleId', value: card.roleId },
    { key: 'roleName', value: card.roleName },
    { key: 'bio', value: card.bio },
    { key: 'personality', value: card.personality },
    { key: 'speaking_style', value: card.speakingStyle },
    { key: 'worldview_rules', value: card.worldviewRules },
    {
      key: 'images',
      value: triggerableImages.map(it => ({
        id: it.id,
        name: it.name,
        description: it.description,
        fileName: it.fileName
      }))
    }
  ]
}

/** 呼叫角色聊天 Flowise，統一帶 flowId、token、startState */
export async function callCharacterLLM(params: {
  character: CharacterCard
  question: string
  chatId?: string
  extraState?: StartStateKV[]
}): Promise<{ decision?: FinalDecision; flowText: string; flowChatId?: string }> {
  // ✅ 從設定讀取當前模型 key
  const modelKey = getSelectedModel()
  const flowId = pickFlowIdByModelKey(modelKey)
  console.log('flowId', flowId)

  const startState = [
    ...buildStartStateFromCharacter(params.character),
    ...(params.extraState ?? [])
  ]

  const { flow, decisionJson } = await callFlowise({
    flowId,
    question: params.question,
    chatId: params.chatId,
    startState
  })

  const flowText = typeof flow.text === 'string' ? flow.text : ''
  const flowChatId = typeof flow.chatId === 'string' ? flow.chatId : undefined

  let decision: FinalDecision | undefined
  if (decisionJson && typeof decisionJson === 'object') {
    const obj = decisionJson as Record<string, unknown>
    const reply = typeof obj.reply === 'string' ? obj.reply : ''
    const image_id = typeof obj.image_id === 'string' ? obj.image_id : ''
    decision = { reply, image_id }
  }

  return { decision, flowText, flowChatId }
}
