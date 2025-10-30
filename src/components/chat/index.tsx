// src/components/chat/index.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styles from './index.module.scss'
import sendIcon from '../../assets/icons/send.svg'
import backIcon from '../../assets/icons/back.svg'
import trashIcon from '../../assets/icons/trash.svg'
import { uid } from '../../utils/uid'
import { rooms as allRooms } from '../../data/rooms'
import type { Msg as StoreMsg } from '../../utils/chatStorage'
import { loadMessages, saveMessages, clearMessages } from '../../utils/chatStorage'

import { KabigonCard } from '../../core/roles/kabigon'
import { useCharacterChat } from '../../hooks/useCharacterChat'
import { callLLM_FormMode } from '../../services/llmClient'
import { getRoleImageUrl } from '../../utils/roleImage'
import { getRoomUi, setRoomUi, clearRoomUi } from '../../utils/chatUiStorage'
import { clearChatId } from '../../utils/roleSession'

type Msg = StoreMsg

const Chat = () => {
  const { id } = useParams<{ id: string }>()
  const roomId = id ?? 'kabigon'
  const room = useMemo(() => allRooms.find(r => r.id === roomId), [roomId])
  const title = room?.name ?? 'Kabigon'

  // 用來強制重新掛載子元件，讓 hook 重新初始化
  const [resetKey, setResetKey] = useState(0)
  // 立即覆蓋畫面上的背景（只影響 UI，不寫回 storage）
  const [bgOverrideId, setBgOverrideId] = useState<string | null>(null)

  // 讀取保存過的 UI 狀態（若沒有 imageId，稍後子元件會回到預設圖）
  const savedUi = getRoomUi(roomId)
  const initialImageId = savedUi.imageId?.trim() ? savedUi.imageId! : 'img_normal'

  // 直接在父層包一層，清空時先讓畫面背景立刻變成預設
  const handleClearAll = () => {
    clearMessages(roomId)
    clearRoomUi(roomId) // 清掉聊天室 UI 狀態
    clearChatId(KabigonCard.roleId) // ✅ 清掉該角色在 Flowise 的 chatId
    setBgOverrideId('img_normal') // 畫面立即回預設圖（不寫回 storage）
    setResetKey(k => k + 1) // 重新掛載，之後不會再帶 chatId
  }

  return (
    <ChatInner
      key={resetKey}
      roomId={roomId}
      title={title}
      initialImageId={initialImageId}
      bgOverrideId={bgOverrideId}
      onResetBgOverride={() => setBgOverrideId(null)}
      onClearAll={handleClearAll}
    />
  )
}

export default Chat

// ---------------- 子元件：實際包含 hook 與 UI ----------------

function ChatInner(props: {
  roomId: string
  title: string
  initialImageId: string
  bgOverrideId: string | null
  onResetBgOverride: () => void
  onClearAll: () => void
}) {
  const { roomId, title, initialImageId, bgOverrideId, onResetBgOverride, onClearAll } = props
  const navigate = useNavigate()

  const { currentImageId, replying, send } = useCharacterChat(
    KabigonCard,
    initialImageId,
    ({ system, user }) => callLLM_FormMode({ system, user })
  )

  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const composingRef = useRef(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const cached = loadMessages(roomId)
    setMessages(cached)
  }, [roomId])

  useEffect(() => {
    if (messages.length) saveMessages(roomId, messages)
  }, [messages, roomId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, replying])

  // 實際顯示的 imageId：若父層要求覆蓋就用覆蓋值，否則用 hook 狀態
  const effectiveImageId = bgOverrideId !== null ? bgOverrideId : currentImageId

  // 由 imageId 解析出實際 URL（找不到就不顯示背景）
  const bgUrl = useMemo(() => {
    const url = effectiveImageId ? getRoleImageUrl(KabigonCard.roleId, effectiveImageId) : undefined
    return url
  }, [effectiveImageId])

  // 每次 hook 的 imageId 變化，才寫回 storage（父層 bgOverride 不會寫回）
  useEffect(() => {
    if (bgOverrideId === null) {
      setRoomUi(roomId, { imageId: currentImageId })
    } else {
      // 一旦子元件掛載完成且 hook 也準備好了，就可以把覆蓋狀態清掉
      // 確保只用於「清空後的那一幀」立即切回預設，之後回到正常由 hook 控制
      onResetBgOverride()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, currentImageId])

  const doSend = async () => {
    const text = input.trim()
    if (!text || replying) return

    const userMsg: Msg = { id: uid(), from: 'user', text, ts: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    try {
      const decision = await send(text)
      const aiMsg: Msg = { id: uid(), from: 'ai', text: decision.reply, ts: Date.now() }
      setMessages(prev => [...prev, aiMsg])
      // 模型若回了新圖，hook 已處理 currentImageId；此處僅同步情緒/圖到 storage（已在上面的 effect 寫回）
    } catch {
      const aiMsg: Msg = {
        id: uid(),
        from: 'ai',
        text: '抱歉，我剛剛打瞌睡了，再說一次可以嗎？',
        ts: Date.now()
      }
      setMessages(prev => [...prev, aiMsg])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !composingRef.current) {
      e.preventDefault()
      doSend()
    }
  }
  const handleCompositionStart = () => {
    composingRef.current = true
  }
  const handleCompositionEnd = () => {
    composingRef.current = false
  }

  const handleClear = () => {
    // 子元件只處理訊息清除與輸入欄重置；storage 與背景重置交給父元件
    clearMessages(roomId)
    setMessages([])
    setInput('')
    onClearAll()
  }

  return (
    <div className={styles.container}>
      {bgUrl && (
        <div className={styles.bg} aria-hidden style={{ backgroundImage: `url(${bgUrl})` }} />
      )}
      <div className={styles.bgOverlay} />

      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          <img src={backIcon} alt="back" />
        </button>
        <div className={styles.title}>{title}</div>
        <button className={styles.trashBtn} onClick={handleClear}>
          <img src={trashIcon} alt="trash" />
        </button>
      </header>

      <main className={styles.chatArea}>
        {messages.map(m => (
          <div key={m.id} className={m.from === 'user' ? styles.rowUser : styles.rowAi}>
            <div className={m.from === 'user' ? styles.bubbleUser : styles.bubbleAi}>{m.text}</div>
          </div>
        ))}
        {replying && (
          <div className={styles.rowAi}>
            <div className={styles.bubbleAi}>
              <div className={styles.dotLoading}>
                <span></span><span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </main>

      <div className={styles.inputBar}>
        <input
          className={styles.input}
          type="text"
          placeholder="輸入訊息"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          disabled={false}
          autoComplete="off"
          spellCheck={false}
          data-gramm="false"
          data-enable-grammarly="false"
          data-ms-editor="false"
          data-1p-ignore="true"
          data-bwignore="true"
          name="chat-message"
        />
        <button className={styles.sendBtn} onClick={doSend} aria-label="send">
          <img className={styles.sendIcon} src={sendIcon} alt="send" />
        </button>
      </div>
    </div>
  )
}
