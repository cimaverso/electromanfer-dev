import { AuthProvider } from './context/AuthContext'
import { CotizacionDraftProvider } from './context/CotizacionDraftContext'
import AppRouter from './router/AppRouter'



export default function App() {
  return (
    <AuthProvider>
      <CotizacionDraftProvider>
        <AppRouter />
      </CotizacionDraftProvider>
    </AuthProvider>
  )
}