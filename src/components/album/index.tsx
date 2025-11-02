import { useCallback, useEffect, useMemo, useState } from 'react'
import styles from './index.module.scss'
import { getRoleImageUrl } from '../../utils/roleImage'
import { getAlbum, unlockImage, type AlbumData } from '../../utils/albumStorage'

type Props = {
  roleId: string
  roleName: string
  imageIds: string[]
  currentBgId: string
  onClose: () => void
  onUseAsBg: (imageId: string) => void
}

export default function AlbumModal({
  roleId,
  roleName,
  imageIds,
  currentBgId,
  onClose,
  onUseAsBg
}: Props) {
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

  const items = useMemo(() => Object.entries(album.images), [album])

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

  const openPreview = (imageId: string) => {
    const url = getRoleImageUrl(roleId, imageId)
    if (url) {
      setPreviewId(imageId)
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
            <button onClick={onClose}>✕</button>
          </div>
        </header>

        <div className={styles.grid}>
          {items.map(([imageId, status]) => {
            const isDefault = imageId === 'img'
            const isUnlocked = status === 'unlocked' || isDefault
            const isObtained = status === 'obtained'
            const isLocked = status === 'none'
            const isCurrent = isUnlocked && imageId === currentBgId
            const url = getRoleImageUrl(roleId, imageId)

            return (
              <div key={imageId} className={styles.item}>
                <div
                  className={[
                    styles.thumb,
                    isUnlocked ? styles.unlocked : isObtained ? styles.obtained : styles.locked
                  ].join(' ')}
                  style={isUnlocked ? { backgroundImage: `url(${url})` } : {}}
                  onClick={() => isUnlocked && openPreview(imageId)}
                />

                <div className={styles.actionRow}>
                  {isLocked ? (
                    <span className={styles.stateText}>未取得</span>
                  ) : isObtained ? (
                    <button className={styles.unlockBtn} onClick={() => handleUnlock(imageId)}>
                      解鎖
                    </button>
                  ) : isCurrent ? (
                    <span className={styles.stateText}>當前使用</span>
                  ) : (
                    <button className={styles.useBtn} onClick={() => onUseAsBg(imageId)}>
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
              ✕
            </button>
            <img className={styles.previewImg} src={previewUrl} alt={previewId ?? ''} />
            <div className={styles.previewActions}>
              <button
                className={styles.primaryBtn}
                onClick={() => {
                  if (previewId) onUseAsBg(previewId)
                  closePreview()
                }}
              >
                設為背景
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
