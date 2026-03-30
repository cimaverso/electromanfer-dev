import { useState, useEffect } from 'react'
import { getRecursos } from '../../api/recursosApi'
import './FichasPanel.css'

const IconPdf = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
)

const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export default function FichasPanel({ items = [] }) {
  // recursos[cod_ref] = { imagenes: [], pdfs: [], loading: bool }
  const [recursos, setRecursos] = useState({})

  // Carga recursos de todos los productos al montar
  useEffect(() => {
    if (!items.length) return

    items.forEach(async (item) => {
      if (recursos[item.cod_ref]) return // ya cargado

      setRecursos((prev) => ({
        ...prev,
        [item.cod_ref]: { imagenes: [], pdfs: [], loading: true },
      }))

      try {
        const data = await getRecursos(item.cod_ref)
        setRecursos((prev) => ({
          ...prev,
          [item.cod_ref]: {
            imagenes: data.filter((r) => r.tipo === 'imagen'),
            pdfs:     data.filter((r) => r.tipo === 'pdf'),
            loading:  false,
          },
        }))
      } catch {
        setRecursos((prev) => ({
          ...prev,
          [item.cod_ref]: { imagenes: [], pdfs: [], loading: false },
        }))
      }
    })
  }, [items])

  if (!items.length) {
    return (
      <div className="fichas-panel__empty">
        <span className="fichas-panel__empty-icon"><IconPdf /></span>
        <p>No hay productos en esta cotización.</p>
        <p className="fichas-panel__empty-hint">
          Agrega productos desde el módulo de Productos y genera una cotización.
        </p>
      </div>
    )
  }

  return (
    <div className="fichas-panel">
      <p className="fichas-panel__desc">
        Fichas técnicas PDF asociadas a cada producto. Puedes verlas o descargarlas individualmente.
        Para agregar fichas, usa el ícono de recursos en el módulo de Productos.
      </p>

      <div className="fichas-panel__list">
        {items.map((item) => {
          const rec = recursos[item.cod_ref]
          const pdfs = rec?.pdfs || []
          const loading = rec?.loading ?? true

          return (
            <div key={item.cod_ref} className="fichas-panel__item">
              {/* Info producto */}
              <div className="fichas-panel__item-header">
                <span className="fichas-panel__cod">{item.cod_ref}</span>
                <span className="fichas-panel__nom">{item.nom_ref || item.cod_ref}</span>
                {loading && <span className="fichas-panel__loading-dot" />}
              </div>

              {/* Fichas PDF */}
              {!loading && pdfs.length === 0 && (
                <p className="fichas-panel__no-fichas">
                  Sin fichas técnicas — agrégalas desde Productos → Recursos
                </p>
              )}

              {!loading && pdfs.length > 0 && (
                <div className="fichas-panel__pdfs">
                  {pdfs.map((pdf) => (
                    <div key={pdf.id} className="fichas-panel__pdf-item">
                      <span className="fichas-panel__pdf-icon"><IconPdf /></span>
                      <span className="fichas-panel__pdf-nombre" title={pdf.nombre}>
                        {pdf.nombre}
                      </span>
                      <div className="fichas-panel__pdf-actions">
                        <a
                          href={pdf.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="fichas-panel__pdf-btn"
                          title="Ver PDF"
                        >
                          <IconEye />
                        </a>
                        <a
                          href={pdf.url}
                          download={pdf.nombre}
                          className="fichas-panel__pdf-btn fichas-panel__pdf-btn--download"
                          title="Descargar PDF"
                        >
                          <IconDownload />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}