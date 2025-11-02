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

import { availableRoles, getImageById } from '../../core/roles/roleAdapter'
import type { CharacterCard } from '../../core/chat/types'
import { useCharacterChat } from '../../hooks/useCharacterChat'
import { getRoleImageUrl } from '../../utils/roleImage'
import { getRoomUi, setRoomUi, clearRoomUi } from '../../utils/chatUiStorage'
import { clearChatId } from '../../utils/roleSession'
import AlbumModal from '../album'
import { clearAlbum, markObtainedIfKnown } from '../../utils/albumStorage'

type Msg = StoreMsg

const roleMap: Record<string, CharacterCard> = Object.fromEntries(
  availableRoles.map(r => [r.roleId, r])
)

const Chat = () => {
  const { id } = useParams<{ id: string }>()
  const roomId = id ?? availableRoles[0].roleId
  const roleCard = roleMap[roomId] ?? availableRoles[0]

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

function ChatInner(props: {
  roomId: string
  title: string
  roleCard: CharacterCard
  initialImageId: string
  bgOverrideId: string | null
  onResetBgOverride: () => void
  onClearAll: () => void
}) {
  const { roomId, title, roleCard, bgOverrideId, onResetBgOverride, onClearAll } = props

  const navigate = useNavigate()

  const { replying, send } = useCharacterChat(roleCard)

  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const composingRef = useRef(false)
  const endRef = useRef<HTMLDivElement | null>(null)
  const [showAlbum, setShowAlbum] = useState(false)

  useEffect(() => {
    const cached = loadMessages(roomId)
    setMessages(cached)

    if (cached.length === 0 && roleCard.firstMessage) {
      const aiMsg: Msg = {
        id: uid(),
        from: 'ai',
        text: roleCard.firstMessage,
        ts: Date.now()
      }
      setMessages([aiMsg])
      saveMessages(roomId, [aiMsg])
    }
  }, [roomId, roleCard])

  useEffect(() => {
    if (messages.length) saveMessages(roomId, messages)
  }, [messages, roomId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, replying])

  // 圖冊鎖定背景
  const locked = getRoomUi(roomId)?.imageId || 'img'
  const lockedFile = getImageById(roleCard, locked)?.fileName
  const overrideFile = bgOverrideId ? getImageById(roleCard, bgOverrideId)?.fileName : undefined

  const bgUrl = useMemo(() => {
    const file = overrideFile ?? lockedFile ?? getImageById(roleCard, 'img')?.fileName
    return getRoleImageUrl(roleCard.roleId, file)
  }, [roleCard, overrideFile, lockedFile])

  useEffect(() => {
    if (bgOverrideId === null) {
      setRoomUi(roomId, { imageId: locked || 'img' })
    } else {
      onResetBgOverride()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, locked])

  const doSend = async () => {
    const text = input.trim()
    if (!text || replying) return

    const userMsg: Msg = { id: uid(), from: 'user', text, ts: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')

    try {
      const decision = await (async () => {
        // 直接呼叫 hook 封裝的 flowise
        const res = await send(text)
        return res
      })()

      if (decision?.image_id) {
        const imgId = decision.image_id
        const isDefault = imgId === 'img'
        if (!isDefault) {
          const allIds = roleCard.image.map(i => i.id)
          markObtainedIfKnown(roleCard.roleId, imgId, allIds)
        }
      }

      const aiMsg: Msg = { id: uid(), from: 'ai', text: decision.reply, ts: Date.now() }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      const fallbackText = roleCard.errorMessage || '發生錯誤，請稍後再試。'

      const aiMsg: Msg = {
        id: uid(),
        from: 'ai',
        text: fallbackText,
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
    clearAlbum(roleCard.roleId)
    setMessages([])
    setInput('')
    onClearAll()
  }

  const handleUseAsBg = (imgId: string) => {
    setRoomUi(roomId, { imageId: imgId })
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
          images={roleCard.image}
          currentBgId={locked || 'img'}
          onClose={() => setShowAlbum(false)}
          onUseAsBg={handleUseAsBg}
        />
      )}
    </div>
  )
}
