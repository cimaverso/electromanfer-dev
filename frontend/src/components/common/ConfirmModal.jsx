import { useEffect } from 'react'
import PrimaryButton from './PrimaryButton'
import './ConfirmModal.css'

/**
 * Confirmación propia de la app (reemplaza window.confirm).
 * @param {boolean}  open
 * @param {string}   title
 * @param {node}     children      - texto o contenido del mensaje
 * @param {string}   confirmText
 * @param {string}   cancelText
 * @param {string}   variant       - 'primary' | 'danger'
 * @param {boolean}  loading
 * @param {function} onConfirm
 * @param {function} onCancel
 */
export default function ConfirmModal({
  open,
  title,
  children,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape' && !loading) onCancel?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, loading, onCancel])

  if (!open) return null

  return (
    <div
      className="confirm-modal__overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !loading) onCancel?.() }}
    >
      <div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        <h3 id="confirm-modal-title" className="confirm-modal__title">{title}</h3>
        <div className="confirm-modal__body">{children}</div>
        <div className="confirm-modal__actions">
          <PrimaryButton variant="ghost" onClick={onCancel} disabled={loading}>{cancelText}</PrimaryButton>
          <PrimaryButton variant={variant} onClick={onConfirm} loading={loading}>{confirmText}</PrimaryButton>
        </div>
      </div>
    </div>
  )
}
