import { useState, useCallback } from 'react'
import {
  getRecursos,
  subirRecurso,
  eliminarRecurso,
  toggleSeleccion,
} from '../api/recursosApi'

const MAX_SELECCION = 3

export function useRecursos(codRef) {
  const [recursos, setRecursos] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  // ── Carga inicial al abrir el modal ──────────────────────────────────────
  const cargar = useCallback(async () => {
    if (!codRef) return
    setLoading(true)
    setError(null)
    try {
      const data = await getRecursos(codRef)
      setRecursos(data)
    } catch (e) {
      setError('No se pudieron cargar los recursos.')
    } finally {
      setLoading(false)
    }
  }, [codRef])

  // ── Subir archivo ────────────────────────────────────────────────────────
  const subir = useCallback(async (archivo, tipo) => {
    if (!codRef || !archivo) return
    setUploading(true)
    setError(null)
    try {
      const nuevo = await subirRecurso(codRef, archivo, tipo)
      setRecursos((prev) => [...prev, nuevo])
    } catch (e) {
      setError('Error al subir el archivo.')
    } finally {
      setUploading(false)
    }
  }, [codRef])

  // ── Eliminar recurso ─────────────────────────────────────────────────────
  const eliminar = useCallback(async (id) => {
    if (!codRef) return
    // Optimistic update
    setRecursos((prev) => prev.filter((r) => r.id !== id))
    try {
      await eliminarRecurso(codRef, id)
    } catch (e) {
      // Si falla, recarga
      cargar()
      setError('Error al eliminar el recurso.')
    }
  }, [codRef, cargar])

  // ── Toggle selección para cotización ─────────────────────────────────────
  const toggleSel = useCallback(async (id, tipo) => {
    const recurso = recursos.find((r) => r.id === id)
    if (!recurso) return

    const seleccionadasTipo = recursos.filter(
      (r) => r.tipo === tipo && r.seleccionada
    ).length

    // Si intenta seleccionar y ya hay 3 del mismo tipo, bloquea
    if (!recurso.seleccionada && seleccionadasTipo >= MAX_SELECCION) {
      setError(`Máximo ${MAX_SELECCION} ${tipo === 'imagen' ? 'imágenes' : 'PDFs'} seleccionados para la cotización.`)
      return
    }

    const nuevaSeleccion = !recurso.seleccionada

    // Optimistic update
    setRecursos((prev) =>
      prev.map((r) => (r.id === id ? { ...r, seleccionada: nuevaSeleccion } : r))
    )

    try {
      await toggleSeleccion(codRef, id, nuevaSeleccion)
      setError(null)
    } catch (e) {
      cargar()
      setError('Error al actualizar selección.')
    }
  }, [codRef, recursos, cargar])

  // ── Selectores derivados ─────────────────────────────────────────────────
  const imagenes = recursos.filter((r) => r.tipo === 'imagen')
  const pdfs = recursos.filter((r) => r.tipo === 'pdf')
  const imagenesSeleccionadas = imagenes.filter((r) => r.seleccionada)
  const pdfsSeleccionados = pdfs.filter((r) => r.seleccionada)

  return {
    recursos,
    imagenes,
    pdfs,
    imagenesSeleccionadas,
    pdfsSeleccionados,
    loading,
    uploading,
    error,
    setError,
    cargar,
    subir,
    eliminar,
    toggleSel,
    MAX_SELECCION,
  }
}