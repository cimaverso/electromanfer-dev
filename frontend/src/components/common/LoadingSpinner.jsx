import './LoadingSpinner.css'

/**
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {string} text - texto opcional debajo del spinner
 * @param {boolean} fullPage - centra en toda la pantalla
 */
export default function LoadingSpinner({ size = 'md', text = '', fullPage = false }) {
  return (
    <div className={`spinner-wrapper ${fullPage ? 'spinner-wrapper--fullpage' : ''}`}>
      <div className={`spinner spinner--${size}`} role="status" aria-label="Cargando" />
      {text && <p className="spinner-text">{text}</p>}
    </div>
  )
}