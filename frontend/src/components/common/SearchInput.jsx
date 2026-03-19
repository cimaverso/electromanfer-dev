import { useRef } from 'react'
import './SearchInput.css'

/**
 * @param {string}   value
 * @param {function} onChange     - (value: string) => void
 * @param {function} onSearch     - () => void  — dispara búsqueda
 * @param {boolean}  loading      - muestra spinner en el input
 * @param {string}   placeholder
 * @param {boolean}  disabled
 */
export default function SearchInput({
  value,
  onChange,
  onSearch,
  loading = false,
  placeholder = 'Buscar productos...',
  disabled = false,
}) {
  const inputRef = useRef(null)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && onSearch) {
      onSearch()
    }
  }

  const handleClear = () => {
    onChange('')
    inputRef.current?.focus()
  }

  return (
    <div className={`search-input ${disabled ? 'search-input--disabled' : ''}`}>
      {/* Ícono lupa */}
      <span className="search-input__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>

      <input
        ref={inputRef}
        type="text"
        className="search-input__field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || loading}
        autoComplete="off"
      />

      {/* Spinner de carga */}
      {loading && (
        <span className="search-input__spinner" aria-label="Buscando" />
      )}

      {/* Botón limpiar */}
      {!loading && value && (
        <button
          type="button"
          className="search-input__clear"
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
          tabIndex={-1}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      {/* Botón buscar */}
      <button
        type="button"
        className="search-input__btn"
        onClick={onSearch}
        disabled={disabled || loading || !value.trim()}
        aria-label="Buscar"
      >
        Buscar
      </button>
    </div>
  )
}