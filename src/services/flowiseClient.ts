// src/services/flowiseClient.ts

export interface FlowiseResponse {
  text?: string
  chatId?: string
  [k: string]: unknown
}

export type FlowiseStartStateKV = {
  key: string
  value: unknown
}

export type CallFlowiseParams = {
  question: string
  chatId?: string
  startState?: FlowiseStartStateKV[]
}

const BASE = import.meta.env.VITE_FLOWISE_BASE_URL as string
const FLOW_ID = import.meta.env.VITE_FLOWISE_FLOW_ID as string
const TOKEN = (import.meta.env.VITE_FLOWISE_TOKEN as string) || undefined

function assertEnvOk() {
  if (!BASE) throw new Error('VITE_FLOWISE_BASE_URL is missing')
  if (!FLOW_ID) throw new Error('VITE_FLOWISE_FLOW_ID is missing')
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

export async function callFlowise(
  params: CallFlowiseParams
): Promise<{ flow: FlowiseResponse; decisionJson?: unknown }> {
  assertEnvOk()

  const url = `${BASE.replace(/\/+$/, '')}/api/v1/prediction/${FLOW_ID}`
  const body = {
    question: params.question,
    ...(params.chatId ? { chatId: params.chatId } : {}),
    overrideConfig: {
      startState: params.startState ?? []
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`

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

  // 嘗試把 LLM 回傳中的 JSON 取出（容忍有 ```json ... ``` 包裝）
  let decisionJson: unknown
  if (rawText) {
    const stripped = stripCodeFence(rawText)
    try {
      decisionJson = JSON.parse(stripped)
    } catch {
      // 不是 JSON 就忽略，交給上層當純文字處理
    }
  }

  return { flow: json, decisionJson }
}
