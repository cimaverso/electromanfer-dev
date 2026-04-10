import { useState, useEffect } from 'react'
import './ProductoInternoForm.css'

const EMPTY = {
  cod_ref: '',
  nom_ref: '',
  tipo: '',
  saldo: '',
  valor_web: '',
}

export default function ProductoInternoForm({ producto, loading, onGuardar, onCerrar }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const esEdicion = Boolean(producto)

  useEffect(() => {
    if (producto) {
      setForm({
        cod_ref:   producto.cod_ref   || '',
        nom_ref:   producto.nom_ref   || '',
        tipo:      producto.tipo      || '',
        saldo:     producto.saldo     ?? '',
        valor_web: producto.valor_web ?? '',
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [producto])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }))
  }

  const validar = () => {
    const e = {}
    if (!form.cod_ref.trim()) e.cod_ref = 'El código es obligatorio'
    if (!form.nom_ref.trim()) e.nom_ref = 'El nombre es obligatorio'
    if (form.valor_web === '' || isNaN(Number(form.valor_web))) e.valor_web = 'Precio inválido'
    if (Number(form.valor_web) < 0) e.valor_web = 'El precio no puede ser negativo'
    return e
  }

  const handleSubmit = () => {
    const e = validar()
    if (Object.keys(e).length > 0) {
      setErrors(e)
      return
    }
    onGuardar({
      cod_ref:   form.cod_ref.trim().toUpperCase(),
      nom_ref:   form.nom_ref.trim().toUpperCase(),
      tipo:      form.tipo.trim().toUpperCase() || 'GENERAL',
      saldo:     Number(form.saldo)     || 0,
      valor_web: Number(form.valor_web) || 0,
    })
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onCerrar()
  }

  return (
    <div className="pi-form-overlay" onClick={handleOverlayClick}>
      <div className="pi-form">
        <div className="pi-form__header">
          <h3 className="pi-form__title">
            {esEdicion ? 'Editar producto interno' : 'Nuevo producto interno'}
          </h3>
          <button className="pi-form__close" onClick={onCerrar} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="pi-form__body">
          <div className="pi-form__row pi-form__row--2">
            <div className="pi-form__field">
              <label className="pi-form__label">
                Código <span className="pi-form__required">*</span>
              </label>
              <input
                type="text"
                className={`pi-form__input ${errors.cod_ref ? 'pi-form__input--error' : ''}`}
                placeholder="Ej: INT-001"
                value={form.cod_ref}
                onChange={(e) => handleChange('cod_ref', e.target.value)}
                disabled={esEdicion}
              />
              {errors.cod_ref && (
                <span className="pi-form__error-msg">{errors.cod_ref}</span>
              )}
            </div>

            <div className="pi-form__field">
              <label className="pi-form__label">Tipo</label>
              <input
                type="text"
                className="pi-form__input"
                placeholder="Ej: ESPECIAL"
                value={form.tipo}
                onChange={(e) => handleChange('tipo', e.target.value)}
              />
            </div>
          </div>

          <div className="pi-form__field">
            <label className="pi-form__label">
              Nombre / Descripción <span className="pi-form__required">*</span>
            </label>
            <input
              type="text"
              className={`pi-form__input ${errors.nom_ref ? 'pi-form__input--error' : ''}`}
              placeholder="Descripción del producto"
              value={form.nom_ref}
              onChange={(e) => handleChange('nom_ref', e.target.value)}
            />
            {errors.nom_ref && (
              <span className="pi-form__error-msg">{errors.nom_ref}</span>
            )}
          </div>

          <div className="pi-form__row pi-form__row--2">
            <div className="pi-form__field">
              <label className="pi-form__label">Saldo / Stock</label>
              <input
                type="number"
                className="pi-form__input"
                placeholder="0"
                min="0"
                value={form.saldo}
                onChange={(e) => handleChange('saldo', e.target.value)}
              />
            </div>

            <div className="pi-form__field">
              <label className="pi-form__label">
                Precio <span className="pi-form__required">*</span>
              </label>
              <input
                type="number"
                className={`pi-form__input ${errors.valor_web ? 'pi-form__input--error' : ''}`}
                placeholder="0"
                min="0"
                value={form.valor_web}
                onChange={(e) => handleChange('valor_web', e.target.value)}
              />
              {errors.valor_web && (
                <span className="pi-form__error-msg">{errors.valor_web}</span>
              )}
            </div>
          </div>
        </div>

        <div className="pi-form__footer">
          <button className="pi-form__btn pi-form__btn--cancel" onClick={onCerrar}>
            Cancelar
          </button>
          <button
            className="pi-form__btn pi-form__btn--save"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  )
}