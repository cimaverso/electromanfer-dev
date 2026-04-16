import { useState, useCallback } from 'react'
import {
  buscarProductosInternos,
  crearProductoInterno,
  actualizarProductoInterno,
  eliminarProductoInterno,
} from '../api/productosInternosApi'

export function useProductosInternos() {
  const [resultados, setResultados] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingForm, setLoadingForm] = useState(false)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')

  const buscar = useCallback(async (q = '') => {
    setLoading(true)
    setError(null)
    try {
      const data = await buscarProductosInternos(q)
      setResultados(Array.isArray(data) ? data : [])
    } catch {
      setError('Error al buscar productos internos.')
      setResultados([])
    } finally {
      setLoading(false)
    }
  }, [])

  const crear = useCallback(async (payload) => {
    setLoadingForm(true)
    setError(null)
    try {
      const nuevo = await crearProductoInterno(payload)
      setResultados((prev) => [nuevo, ...prev])
      return { success: true, data: nuevo }
    } catch {
      return { success: false, error: 'Error al crear el producto.' }
    } finally {
      setLoadingForm(false)
    }
  }, [])

  const actualizar = useCallback(async (cod_ref, payload) => {
    setLoadingForm(true)
    try {
      const actualizado = await actualizarProductoInterno(cod_ref, payload)
      setResultados((prev) => prev.map((p) => (p.cod_ref === cod_ref ? actualizado : p)))
      return { success: true, data: actualizado }
    } catch {
      return { success: false, error: 'Error al actualizar el producto.' }
    } finally {
      setLoadingForm(false)
    }
  }, [])

  const eliminar = useCallback(async (cod_ref) => {
    try {
      await eliminarProductoInterno(cod_ref)
      setResultados((prev) => prev.filter((p) => p.cod_ref !== cod_ref))
      return { success: true }
    } catch {
      return { success: false, error: 'Error al eliminar el producto.' }
    }
  }, [])

  return {
    resultados,
    loading,
    loadingForm,
    error,
    query,
    setQuery,
    buscar,
    crear,
    actualizar,
    eliminar,
  }
}