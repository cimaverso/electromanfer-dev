import { useContext } from 'react'
import { CotizacionDraftContext } from '../context/CotizacionDraftContext'

export function useCotizacionDraft() {
  const context = useContext(CotizacionDraftContext)

  if (!context) {
    throw new Error('useCotizacionDraft debe usarse dentro de CotizacionDraftProvider')
  }

  return context
}