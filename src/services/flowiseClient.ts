// src/services/flowiseClient.ts

export interface FlowiseResponse {
  text?: string
  chatId?: string
  [k: string]: unknown
}

export type StartStateKV = {
  key: string
  value: unknown
}

export type CallFlowiseParams = {
  /** 必帶：要打的 Flow ID（依你的模型設定帶入） */
  flowId: string
  /** 使用者訊息 */
  question: string
  /** Flowise 續聊 id（第一次不帶；清空後不要帶） */
  chatId?: string
  /** startState 給 Flowise 節點用 */
  startState?: StartStateKV[]
}

const BASE = import.meta.env.VITE_FLOWISE_BASE_URL as string
const TOKEN = import.meta.env.VITE_FLOWISE_TOKEN as string

function assertEnvOk() {
  if (!BASE) throw new Error('VITE_FLOWISE_BASE_URL is missing')
  if (!TOKEN) throw new Error('VITE_FLOWISE_TOKEN is missing')
}

function stripCodeFence(input: string | undefined): string {
  if (!input) return ''
  let s = input.trim()
  if (s.startsWith('```')) {
    s = s
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim()
  }
  if (/^json\s/i.test(s)) {
    s = s.replace(/^json\s*/i, '').trim()
  }
  return s
}

/** 統一呼叫：必帶 flowId，且永遠帶 Authorization: Bearer <TOKEN> */
export async function callFlowise(
  params: CallFlowiseParams
): Promise<{ flow: FlowiseResponse; decisionJson?: unknown }> {
  assertEnvOk()
  if (!params.flowId) throw new Error('callFlowise: flowId is required')
  if (!params.question) throw new Error('callFlowise: question is required')

  const url = `${BASE.replace(/\/+$/, '')}/api/v1/prediction/${params.flowId}`

  const body = {
    question: params.question,
    ...(params.chatId ? { chatId: params.chatId } : {}),
    overrideConfig: {
      startState: params.startState ?? []
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Flowise HTTP ${res.status}: ${t}`)
  }

  const json = (await res.json()) as FlowiseResponse
  const rawText = typeof json.text === 'string' ? json.text : ''

  let decisionJson: unknown
  if (rawText) {
    const stripped = stripCodeFence(rawText)
    try {
      decisionJson = JSON.parse(stripped)
    } catch {
      // 若不是 JSON，就交給上層當純文字
    }
  }

  return { flow: json, decisionJson }
}

/** 方便別處取得 env（例如依模型選 flowId） */
export const FlowiseEnv = {
  BASE,
  TOKEN,
  FLOW_ID_GEMINI: import.meta.env.VITE_FLOWISE_CHAT_GEMINI_FLOW_ID as string,
  FLOW_ID_LLAMA: import.meta.env.VITE_FLOWISE_CHAT_LLAMA_FLOW_ID as string
}
