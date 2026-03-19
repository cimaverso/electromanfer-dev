import './EmptyState.css'

/**
 * @param {string} icon      - emoji o carácter SVG decorativo
 * @param {string} title     - título principal
 * @param {string} desc      - descripción secundaria
 * @param {node}   action    - botón u otro elemento de acción opcional
 */
export default function EmptyState({
  icon = '📭',
  title = 'Sin resultados',
  desc = '',
  action = null,
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon}</div>
      <h3 className="empty-state__title">{title}</h3>
      {desc && <p className="empty-state__desc">{desc}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  )
}