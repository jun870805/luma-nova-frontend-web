// src/components/settings/index.tsx
import { useState } from 'react'
import styles from './index.module.scss'
import {
  MODEL_OPTIONS,
  getSelectedModel,
  setSelectedModel,
  type ModelKey
} from '../../utils/settingsStorage'
import closeIcon from '../../assets/icons/close.svg'
import rightIcon from '../../assets/icons/right.svg'

type Props = { onClose: () => void }

export default function SettingsModal({ onClose }: Props) {
  const [page, setPage] = useState<'home' | 'model'>('home')
  const [sel, setSel] = useState<ModelKey>(() => getSelectedModel())

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <div className={styles.title}>設定</div>
          <button className={styles.iconBtn} onClick={onClose}>
            <img src={closeIcon} alt="close" />
          </button>
        </header>

        {page === 'home' && (
          <div className={styles.list}>
            <button className={styles.item} onClick={() => setPage('model')}>
              <div className={styles.itemMain}>
                <div className={styles.itemTitle}>語言模型</div>
                <div className={styles.itemSub}>
                  {MODEL_OPTIONS.find(o => o.key === sel)?.label}
                </div>
              </div>
              <img src={rightIcon} alt="go" className={styles.rightIcon} />
            </button>
          </div>
        )}

        {page === 'model' && (
          <div className={styles.list}>
            {MODEL_OPTIONS.map(opt => (
              <label key={opt.key} className={styles.radioRow}>
                <input
                  type="radio"
                  name="model"
                  value={opt.key}
                  checked={sel === opt.key}
                  onChange={() => setSel(opt.key)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
            <div className={styles.actions}>
              <button className={styles.secondary} onClick={() => setPage('home')}>
                返回
              </button>
              <button
                className={styles.primary}
                onClick={() => {
                  setSelectedModel(sel)
                  onClose()
                }}
              >
                儲存
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
