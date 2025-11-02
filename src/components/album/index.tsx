import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from './index.module.scss'
import { getRoleImageUrl } from '../../utils/roleImage'
import { getAlbum, unlockImage, type AlbumData } from '../../utils/albumStorage'
import type { RoleImage } from '../../core/chat/types'
import closeIcon from '../../assets/icons/close.svg'

type Props = {
  roleId: string
  roleName: string
  images: RoleImage[]
  currentBgId: string
  onClose: () => void
  onUseAsBg: (imageId: string) => void
}

export default function AlbumModal({
  roleId,
  roleName,
  images,
  currentBgId,
  onClose,
  onUseAsBg
}: Props) {
  const imageIds = useMemo(() => images.map(i => i.id), [images])

  const [album, setAlbum] = useState<AlbumData>(() => getAlbum(roleId, imageIds))
  const [loading, setLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setAlbum(getAlbum(roleId, imageIds))
  }, [roleId, imageIds])

  useEffect(() => {
    refresh()
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('album_v1_') && e.key.endsWith(roleId)) refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [refresh, roleId])

  const items = useMemo(() => images, [images])

  const handleUnlock = async (imageId: string) => {
    if (!confirm('使用寶石解鎖？（暫無寶石系統，按下確定即解鎖）')) return
    setLoading(true)
    try {
      unlockImage(roleId, imageId, imageIds)
      refresh()
      alert('已成功解鎖！')
    } finally {
      setLoading(false)
    }
  }

  const openPreview = (img: RoleImage) => {
    const url = getRoleImageUrl(roleId, img.fileName)
    if (url) {
      setPreviewId(img.id)
      setPreviewUrl(url)
    }
  }

  const closePreview = () => {
    setPreviewUrl(null)
    setPreviewId(null)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <div className={styles.title}>{roleName} 的圖冊</div>
          <div className={styles.tools}>
            <button onClick={refresh} disabled={loading}>
              重新整理
            </button>
            <button onClick={onClose}>
              <img src={closeIcon} alt="closeAlbum" />
            </button>
          </div>
        </header>

        <div className={styles.grid}>
          {items.map(img => {
            const status = album.images[img.id] // 'none' | 'obtained' | 'unlocked'
            const isDefault = img.id === 'img'
            const isUnlocked = status === 'unlocked' || isDefault
            const isObtained = status === 'obtained'
            const isLocked = status === 'none'
            const isCurrent = isUnlocked && img.id === currentBgId
            const url = getRoleImageUrl(roleId, img.fileName)

            return (
              <div key={img.id} className={styles.item}>
                <div
                  className={[
                    styles.thumb,
                    isUnlocked ? styles.unlocked : isObtained ? styles.obtained : styles.locked
                  ].join(' ')}
                  style={
                    url && (isUnlocked || isObtained)
                      ? ({ '--thumb-bg': `url(${url})` } as React.CSSProperties)
                      : undefined
                  }
                  onClick={() => isUnlocked && url && openPreview(img)}
                />
                <div className={styles.meta}>
                  <div className={styles.metaName}>{img.name}</div>
                  <div className={styles.metaDesc}>{img.description}</div>
                </div>

                <div className={styles.actionRow}>
                  {isLocked ? (
                    <span className={styles.stateText}>未取得</span>
                  ) : isObtained ? (
                    <button className={styles.unlockBtn} onClick={() => handleUnlock(img.id)}>
                      解鎖
                    </button>
                  ) : isCurrent ? (
                    <span className={styles.stateTextActive}>當前使用</span>
                  ) : (
                    <button className={styles.useBtn} onClick={() => onUseAsBg(img.id)}>
                      設為背景
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {previewUrl && (
        <div className={styles.previewOverlay} onClick={closePreview}>
          <div className={styles.previewBody} onClick={e => e.stopPropagation()}>
            <button className={styles.closePreviewBtn} onClick={closePreview}>
              <img src={closeIcon} alt="closePreviewImg" />
            </button>
            <img className={styles.previewImg} src={previewUrl} alt={previewId ?? ''} />
          </div>
        </div>
      )}
    </div>
  )
}
