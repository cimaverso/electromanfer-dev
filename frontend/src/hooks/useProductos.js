import { useState, useCallback, useRef } from 'react'
import { buscarProductos, getProductoDetalle } from '../api/productosApi'

export function useProductos() {
  const [resultados, setResultados] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)

  // Ref para cancelar búsquedas anteriores si el usuario escribe rápido
  const abortRef = useRef(null)

  const buscar = useCallback(async (texto) => {
    const q = texto?.trim()
    if (!q) {
      setResultados([])
      setError(null)
      return
    }

    // Cancela request anterior si todavía está en vuelo
    if (abortRef.current) {
      abortRef.current.abort()
    }
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const data = await buscarProductos(q)
      setResultados(Array.isArray(data) ? data : [])
    } catch (err) {
      // Ignora el error si fue una cancelación intencional
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return

      if (err.response?.status === 502) {
        setError('El servicio de productos no está disponible en este momento.')
      } else if (err.response?.status === 400) {
        setError('La búsqueda contiene caracteres inválidos.')
      } else {
        setError('Error al buscar productos. Intenta de nuevo.')
      }
      setResultados([])
    } finally {
      setLoading(false)
    }
  }, [])

  const verDetalle = useCallback(async (codRef) => {
    setLoadingDetalle(true)
    try {
      const data = await getProductoDetalle(codRef)
      setProductoSeleccionado(data)
    } catch {
      // Si falla el detalle no bloqueamos la pantalla, solo no mostramos el panel
      setProductoSeleccionado(null)
    } finally {
      setLoadingDetalle(false)
    }
  }, [])

  const cerrarDetalle = useCallback(() => {
    setProductoSeleccionado(null)
  }, [])

  const limpiar = useCallback(() => {
    setResultados([])
    setQuery('')
    setError(null)
    setProductoSeleccionado(null)
  }, [])

  return {
    resultados,
    loading,
    error,
    query,
    setQuery,
    buscar,
    productoSeleccionado,
    loadingDetalle,
    verDetalle,
    cerrarDetalle,
    limpiar,
  }
}