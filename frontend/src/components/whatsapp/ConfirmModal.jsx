import './ConfirmModal.css'

export default function ConfirmModal({
  titulo = 'Confirmar acción',
  mensaje,
  textoAceptar = 'Aceptar',
  textoCancelar = 'Cancelar',
  peligroso = false,
  onAceptar,
  onCancelar,
}) {
  return (
    <div className="confirm-modal-overlay" onClick={onCancelar}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="confirm-modal__titulo">{titulo}</h3>
        <p className="confirm-modal__mensaje">{mensaje}</p>
        <div className="confirm-modal__acciones">
          <button className="wap-btn" onClick={onCancelar} type="button">
            {textoCancelar}
          </button>
          <button
            className={`wap-btn ${peligroso ? 'wap-btn--danger' : 'wap-btn--primary'}`}
            onClick={onAceptar}
            type="button"
          >
            {textoAceptar}
          </button>
        </div>
      </div>
    </div>
  )
}
