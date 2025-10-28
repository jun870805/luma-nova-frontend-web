// src/components/chat/index.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styles from './index.module.scss'
import sendIcon from '../../assets/send.svg'
import backIcon from '../../assets/back.svg'
import trashIcon from '../../assets/trash.svg'
import { uid } from '../../utils/uid'
import { rooms as allRooms } from '../../data/rooms'
import type { Msg as StoreMsg } from '../../utils/chatStorage'
import { loadMessages, saveMessages, clearMessages } from '../../utils/chatStorage'

type Msg = StoreMsg

const Chat = () => {
  const { id } = useParams<{ id: string }>()
  const roomId = id ?? 'default'
  const navigate = useNavigate()
  const room = useMemo(() => allRooms.find(r => r.id === roomId), [roomId])
  const title = room?.name ?? 'Luma Nova'

  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [isWaiting, setIsWaiting] = useState(false)
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
  }, [messages])

  const send = () => {
    const text = input.trim()
    if (!text || isWaiting) return
    const userMsg: Msg = { id: uid(), from: 'user', text, ts: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsWaiting(true)
    setTimeout(() => {
      const aiMsg: Msg = { id: uid(), from: 'ai', text: `收到：「${text}」`, ts: Date.now() }
      setMessages(prev => [...prev, aiMsg])
      setIsWaiting(false)
    }, 900)
  }

  const handleClear = () => {
    clearMessages(roomId)
    setMessages([])
  }

  return (
    <div className={styles.container}>
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
        {isWaiting && (
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
          onKeyDown={e => { if (e.key === 'Enter') send() }}
          disabled={isWaiting}
        />
        <button
          className={`${styles.sendBtn} ${isWaiting ? styles.disabled : ''}`}
          onClick={send}
          aria-label="send"
          disabled={isWaiting}
        >
          <img className={styles.sendIcon} src={sendIcon} alt="send" />
        </button>
      </div>
    </div>
  )
}

export default Chat