// src/components/chatList/index.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './index.module.scss'
import { rooms as baseRooms } from '../../data/rooms'
import { getLast } from '../../utils/chatStorage'
import { formatLastTime } from '../../utils/time'
import settingsIcon from '../../assets/icons/settings.svg'
import SettingsModal from '../settings'

type ListRoom = { id: string; name: string; last: string; ts: number | null }

const ChatList = () => {
  const nav = useNavigate()
  const base = useMemo(() => baseRooms, [])
  const [rooms, setRooms] = useState<ListRoom[]>([])
  const [showSettings, setShowSettings] = useState(false)

  const refresh = () => {
    const next: ListRoom[] = base.map(r => {
      const { text, ts } = getLast(r.id)
      return { id: r.id, name: r.name, last: text || '', ts }
    })
    next.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
    setRooms(next)
  }

  useEffect(() => {
    refresh()
    const onVis = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.title}>Luma Nova</div>
        <button className={styles.settingsBtn} onClick={() => setShowSettings(true)}>
          <img src={settingsIcon} alt="settings" />
        </button>
      </header>

      <main className={styles.listArea}>
        {rooms.map(r => (
          <button key={r.id} className={styles.item} onClick={() => nav(`/chat/${r.id}`)}>
            <div className={styles.itemTop}>
              <div className={styles.itemTitle}>{r.name}</div>
              <div className={styles.itemTime}>{formatLastTime(r.ts)}</div>
            </div>
            {r.last?.trim() && <div className={styles.itemSub}>{r.last}</div>}
          </button>
        ))}
      </main>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}

export default ChatList
