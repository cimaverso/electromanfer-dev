import { useEffect } from 'react'
import './Toast.css'

/**
 * @param {string}   message
 * @param {string}   type      - 'success' | 'error' | 'warning' | 'info'
 * @param {boolean}  visible
 * @param {function} onClose
 * @param {number}   duration  - ms antes de auto-cerrar (default 3000)
 */
export default function Toast({
  message,
  type = 'success',
  visible,
  onClose,
  duration = 3000,
}) {
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => onClose(), duration)
    return () => clearTimeout(timer)
  }, [visible, duration, onClose])

  if (!visible) return null

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  }

  return (
    <div className={`toast toast--${type}`} role="alert">
      <span className="toast__icon">{icons[type]}</span>
      <span className="toast__message">{message}</span>
      <button
        type="button"
        className="toast__close"
        onClick={onClose}
        aria-label="Cerrar"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}