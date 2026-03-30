import { useCotizacionDraft } from '../../hooks/useCotizacionDraft'
import './CotizacionForm.css'

export default function CotizacionForm() {
  const {
    clienteDraft,
    setClienteDraft,
    notas,
    setNotas,
    observacionesPdf,
    setObservacionesPdf,
  } = useCotizacionDraft()

  const cliente = clienteDraft || {}

  const handleCliente = (field, value) => {
    setClienteDraft({ ...cliente, [field]: value })
  }

  return (
    <div className="cot-form">
      <div className="cot-form__section">
        <h4 className="cot-form__section-title">Datos del cliente</h4>

        <div className="cot-form__grid">
          <div className="cot-form__field cot-form__field--full">
            <label className="cot-form__label">
              Razón social / Nombre <span className="cot-form__required">*</span>
            </label>
            <input
              type="text"
              className="cot-form__input"
              placeholder="Empresa o persona natural"
              value={cliente.nombre_razon_social || ''}
              onChange={(e) => handleCliente('nombre_razon_social', e.target.value)}
            />
          </div>

          <div className="cot-form__field">
            <label className="cot-form__label">NIT / Cédula</label>
            <input
              type="text"
              className="cot-form__input"
              placeholder="900123456-1"
              value={cliente.nit_cedula || ''}
              onChange={(e) => handleCliente('nit_cedula', e.target.value)}
            />
          </div>

          <div className="cot-form__field">
            <label className="cot-form__label">Nombre de contacto</label>
            <input
              type="text"
              className="cot-form__input"
              placeholder="Nombre del contacto"
              value={cliente.nombre_contacto || ''}
              onChange={(e) => handleCliente('nombre_contacto', e.target.value)}
            />
          </div>

          <div className="cot-form__field">
            <label className="cot-form__label">Correo electrónico</label>
            <input
              type="email"
              className="cot-form__input"
              placeholder="contacto@empresa.com"
              value={cliente.email || ''}
              onChange={(e) => handleCliente('email', e.target.value)}
            />
          </div>

          <div className="cot-form__field">
            <label className="cot-form__label">Teléfono</label>
            <input
              type="text"
              className="cot-form__input"
              placeholder="3001234567"
              value={cliente.telefono || ''}
              onChange={(e) => handleCliente('telefono', e.target.value)}
            />
          </div>

          <div className="cot-form__field">
            <label className="cot-form__label">Ciudad</label>
            <input
              type="text"
              className="cot-form__input"
              placeholder="Medellín"
              value={cliente.ciudad || ''}
              onChange={(e) => handleCliente('ciudad', e.target.value)}
            />
          </div>

          <div className="cot-form__field cot-form__field--full">
            <label className="cot-form__label">Dirección</label>
            <input
              type="text"
              className="cot-form__input"
              placeholder="Calle 10 # 20-30"
              value={cliente.direccion || ''}
              onChange={(e) => handleCliente('direccion', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="cot-form__section">
        <h4 className="cot-form__section-title">Información adicional</h4>

        <div className="cot-form__field">
          <label className="cot-form__label">Notas internas</label>
          <textarea
            className="cot-form__textarea"
            placeholder="Notas internas del asesor (no aparecen en el PDF)"
            rows={3}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </div>

        <div className="cot-form__field">
          <label className="cot-form__label">Observaciones para el PDF</label>
          <textarea
            className="cot-form__textarea"
            placeholder="Ej: Precios sujetos a cambio sin previo aviso"
            rows={3}
            value={observacionesPdf}
            onChange={(e) => setObservacionesPdf(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}