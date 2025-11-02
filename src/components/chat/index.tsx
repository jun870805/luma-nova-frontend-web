// src/components/chat/index.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styles from './index.module.scss'
import sendIcon from '../../assets/icons/send.svg'
import backIcon from '../../assets/icons/back.svg'
import trashIcon from '../../assets/icons/trash.svg'
import albumIcon from '../../assets/icons/album.svg'
import { uid } from '../../utils/uid'
import { rooms as allRooms } from '../../data/rooms'
import type { Msg as StoreMsg } from '../../utils/chatStorage'
import { loadMessages, saveMessages, clearMessages } from '../../utils/chatStorage'

import { KabigonCard } from '../../core/roles/kabigon'
import { MuxingCard } from '../../core/roles/muxing'
import { SistersCard } from '../../core/roles/sisters'

import { useCharacterChat } from '../../hooks/useCharacterChat'
import { callLLM_FormMode } from '../../services/llmClient'
import { getRoleImageUrl } from '../../utils/roleImage'
import { getRoomUi, setRoomUi, clearRoomUi } from '../../utils/chatUiStorage'
import { clearChatId } from '../../utils/roleSession'

import AlbumModal from '../album'
import type { CharacterCard } from '../../core/chat/types'

type Msg = StoreMsg

const roleMap = {
  kabigon: KabigonCard,
  muxing: MuxingCard,
  sisters: SistersCard
} as const

const Chat = () => {
  const { id } = useParams<{ id: string }>()
  const roomId = id ?? 'kabigon'
  const roleCard = roleMap[roomId as keyof typeof roleMap] ?? KabigonCard
  const room = useMemo(() => allRooms.find(r => r.id === roomId), [roomId])
  const title = room?.name ?? roleCard.roleName

  const [resetKey, setResetKey] = useState(0)
  const [bgOverrideId, setBgOverrideId] = useState<string | null>(null)

  const savedUi = getRoomUi(roomId)
  const initialImageId = savedUi.imageId?.trim() ? savedUi.imageId! : 'img'

  const handleClearAll = () => {
    clearMessages(roomId)
    clearRoomUi(roomId)
    clearChatId(roleCard.roleId)
    setBgOverrideId('img')
    setResetKey(k => k + 1)
  }

  return (
    <ChatInner
      key={resetKey}
      roomId={roomId}
      title={title}
      roleCard={roleCard}
      initialImageId={initialImageId}
      bgOverrideId={bgOverrideId}
      onResetBgOverride={() => setBgOverrideId(null)}
      onClearAll={handleClearAll}
    />
  )
}

export default Chat

// ---------------- 子元件 ----------------

function ChatInner(props: {
  roomId: string
  title: string
  roleCard: CharacterCard
  initialImageId: string
  bgOverrideId: string | null
  onResetBgOverride: () => void
  onClearAll: () => void
}) {
  const { roomId, title, roleCard, initialImageId, bgOverrideId, onResetBgOverride, onClearAll } =
    props

  const navigate = useNavigate()
  const { currentImageId, replying, send, lockedBg, setLockedBg } = useCharacterChat(
    roleCard,
    initialImageId,
    ({ system, user }) => callLLM_FormMode({ system, user })
  )

  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const composingRef = useRef(false)
  const endRef = useRef<HTMLDivElement | null>(null)
  const [showAlbum, setShowAlbum] = useState(false)

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

  const effectiveBgId = bgOverrideId ?? lockedBg ?? currentImageId

  const bgUrl = useMemo(() => {
    const url = effectiveBgId ? getRoleImageUrl(roleCard.roleId, effectiveBgId) : undefined
    return url
  }, [roleCard.roleId, effectiveBgId])

  useEffect(() => {
    if (bgOverrideId === null) setRoomUi(roomId, { imageId: lockedBg ?? currentImageId })
    else onResetBgOverride()
  }, [roomId, currentImageId, lockedBg, bgOverrideId, onResetBgOverride])

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
    } catch {
      const aiMsg: Msg = {
        id: uid(),
        from: 'ai',
        text: '抱歉，我打瞌睡了，能再說一次嗎？',
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

  const handleClear = () => {
    clearMessages(roomId)
    setMessages([])
    setInput('')
    onClearAll()
  }

  const handleUseAsBg = (imgId: string) => {
    setLockedBg(imgId)
    setShowAlbum(false)
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
        <div className={styles.headerBtns}>
          <button className={styles.albumBtn} onClick={() => setShowAlbum(true)}>
            <img src={albumIcon} alt="album" />
          </button>
          <button className={styles.trashBtn} onClick={handleClear}>
            <img src={trashIcon} alt="trash" />
          </button>
        </div>
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
                <span></span>
                <span></span>
                <span></span>
                <span></span>
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
          onCompositionStart={() => (composingRef.current = true)}
          onCompositionEnd={() => (composingRef.current = false)}
        />
        <button className={styles.sendBtn} onClick={doSend}>
          <img className={styles.sendIcon} src={sendIcon} alt="send" />
        </button>
      </div>

      {showAlbum && (
        <AlbumModal
          roleId={roleCard.roleId}
          roleName={roleCard.roleName}
          imageIds={roleCard.imageIds}
          currentBgId={lockedBg ?? 'img'}
          onClose={() => setShowAlbum(false)}
          onUseAsBg={handleUseAsBg}
        />
      )}
    </div>
  )
}
