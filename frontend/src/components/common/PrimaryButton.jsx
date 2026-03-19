import './PrimaryButton.css'

/**
 * @param {string}   variant   - 'primary' | 'secondary' | 'danger' | 'ghost'
 * @param {string}   size      - 'sm' | 'md' | 'lg'
 * @param {boolean}  loading   - muestra spinner interno
 * @param {boolean}  disabled
 * @param {string}   type      - 'button' | 'submit'
 * @param {function} onClick
 * @param {node}     icon      - ícono opcional a la izquierda
 * @param {node}     children
 */
export default function PrimaryButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  type = 'button',
  onClick,
  icon = null,
  children,
}) {
  return (
    <button
      type={type}
      className={`pbtn pbtn--${variant} pbtn--${size} ${loading ? 'pbtn--loading' : ''}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <>
          <span className="pbtn__spinner" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {icon && <span className="pbtn__icon">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  )
}