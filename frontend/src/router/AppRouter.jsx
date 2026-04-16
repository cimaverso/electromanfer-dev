import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import MainLayout from '../components/layout/MainLayout'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import ProductosPage from '../pages/ProductosPage'
import CotizacionesPage from '../pages/CotizacionesPage'
import NotFoundPage from '../pages/NotFoundPage'

function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0F1115',
        color: '#A9B2C3',
        fontSize: '14px',
      }}>
        Verificando sesión...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0F1115',
        color: '#A9B2C3',
        fontSize: '14px',
      }}>
        Cargando...
      </div>
    )
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
}

export default function AppRouter() {
  

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <MainLayout>
                <DashboardPage />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/productos"
          element={
            <PrivateRoute>
              <MainLayout>
                <ProductosPage />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/cotizaciones"
          element={
            <PrivateRoute>
              <MainLayout>
                <CotizacionesPage />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}