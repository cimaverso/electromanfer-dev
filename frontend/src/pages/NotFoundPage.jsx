import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import './NotFoundPage.css'

export default function NotFoundPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  return (
    <div className="not-found">
      <div className="not-found__content">
        <div className="not-found__code">404</div>
        <div className="not-found__divider" />
        <div className="not-found__body">
          <h1 className="not-found__title">Página no encontrada</h1>
          <p className="not-found__desc">
            La ruta que intentas acceder no existe o fue movida.
          </p>
          <button
            className="not-found__btn"
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login', { replace: true })}
          >
            {isAuthenticated ? '← Volver al dashboard' : '← Ir al login'}
          </button>
        </div>
      </div>
    </div>
  )
}