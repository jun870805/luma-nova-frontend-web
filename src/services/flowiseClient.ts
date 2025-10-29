// src/services/flowiseClient.ts

export interface FlowiseStartStateKV {
  key: string
  value: string
}

export interface FlowiseRequest {
  flowId: string
  baseUrl: string // 例如: https://luma-nova-flowise-server.onrender.com
  token?: string // 若後端有 Bearer 驗證就傳
  question: string // 使用者輸入
  chatId?: string // 第一次可省略；之後沿用；清空時清掉
  startState?: FlowiseStartStateKV[] // overrideConfig.startState 要帶的鍵值
}

// 這裡用交集型別，讓你能傳入擴充欄位（例如 emotion/image_id 等）
export type FlowiseResponse<T extends Record<string, unknown> = Record<string, unknown>> = T & {
  text?: string
  chatId?: string
}

export async function callFlowiseAgent<T extends Record<string, unknown> = Record<string, unknown>>(
  params: FlowiseRequest
): Promise<FlowiseResponse<T>> {
  const { flowId, baseUrl, token, question, chatId, startState = [] } = params

  const url = `${baseUrl.replace(/\/+$/, '')}/api/v1/prediction/${flowId}`

  const body: Record<string, unknown> = {
    question,
    overrideConfig: {
      startState
    }
  }
  if (chatId) body.chatId = chatId

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const msg = await safeText(res)
    throw new Error(`Flowise ${res.status}: ${msg || res.statusText}`)
  }

  const raw = await safeJson(res)
  // Flowise 可能回字串或物件
  if (typeof raw === 'string') {
    return safeParseJSON(raw) as FlowiseResponse<T>
  }
  return raw as FlowiseResponse<T>
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

async function safeJson(res: Response): Promise<unknown> {
  const txt = await safeText(res)
  try {
    return JSON.parse(txt) as unknown
  } catch {
    return txt
  }
}

function safeParseJSON(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s) as Record<string, unknown>
  } catch {
    return { text: s }
  }
}
