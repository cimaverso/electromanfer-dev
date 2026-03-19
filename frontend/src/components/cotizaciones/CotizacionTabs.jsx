import './CotizacionTabs.css'

/**
 * @param {Array}    tabs     - [{ id, label, badge? }]
 * @param {string}   active   - id del tab activo
 * @param {function} onChange - (id) => void
 */
export default function CotizacionTabs({ tabs = [], active, onChange }) {
  return (
    <div className="cot-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`cot-tabs__tab ${active === tab.id ? 'cot-tabs__tab--active' : ''}`}
          onClick={() => onChange(tab.id)}
          type="button"
        >
          <span className="cot-tabs__tab-label">{tab.label}</span>
          {tab.badge != null && tab.badge > 0 && (
            <span className="cot-tabs__badge">{tab.badge}</span>
          )}
        </button>
      ))}
    </div>
  )
}