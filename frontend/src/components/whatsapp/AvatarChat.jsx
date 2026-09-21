import { sinNombreGuardado } from '../../utils/formatTelefono'

function iniciales(nombre = '') {
  return nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

// Iniciales si hay nombre guardado; silueta de persona (como WhatsApp) si no
export default function AvatarChat({ chat, className }) {
  return (
    <div className={className}>
      {sinNombreGuardado(chat.nombre) ? (
        <svg width="60%" height="60%" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2c-4 0-8 2-8 5v1.5h16V19c0-3-4-5-8-5z" />
        </svg>
      ) : iniciales(chat.nombre)}
    </div>
  )
}
