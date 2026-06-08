import { useState, useEffect, useCallback } from 'react'
import { getTransportadoras, crearTransportadora } from '../api/guiasApi'

export function useTransportadoras() {
  const [transportadoras, setTransportadoras] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTransportadoras()
      setTransportadoras(data)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Error al cargar transportadoras')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const agregar = useCallback(async (nombre) => {
    try {
      const nueva = await crearTransportadora(nombre)
      setTransportadoras((prev) => [...prev, nueva])
      return { success: true, data: nueva }
    } catch (e) {
      return { success: false, error: e?.response?.data?.detail || 'Error al crear transportadora' }
    }
  }, [])

  return { transportadoras, loading, error, cargar, agregar }
}