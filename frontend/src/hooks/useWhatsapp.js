import { useState, useCallback, useEffect, useRef } from 'react'
import {
  listarChats,
  getChat,
  buscarOCrearChatPorTelefono,
  enviarMensaje,
  enviarConAdjunto as enviarConAdjuntoApi,
  marcarLeido,
  poll,
  actualizarFlagsChat,
  vaciarChat,
  eliminarChat,
} from '../api/whatsappApi'

const POLL_INTERVAL_MS = 6000

export function useWhatsapp() {
  const [chats, setChats] = useState([])
  const [chatActivo, setChatActivo] = useState(null)
  const [loadingChats, setLoadingChats] = useState(false)
  const [loadingChat, setLoadingChat] = useState(false)
  const [loadingEnvio, setLoadingEnvio] = useState(false)
  const [error, setError] = useState(null)

  const pollTimerRef = useRef(null)
  const ultimoTimestampRef = useRef(null)

  // ─── Cargar lista de chats ──────────────────────────────────────────────
  const cargarChats = useCallback(async (filtros = {}) => {
    setLoadingChats(true)
    setError(null)
    try {
      const { chats: lista } = await listarChats(filtros)
      setChats(lista)
      if (lista.length > 0) ultimoTimestampRef.current = lista[0].fecha
    } catch {
      setError('Error al cargar los chats.')
      setChats([])
    } finally {
      setLoadingChats(false)
    }
  }, [])

  // ─── Abrir chat ──────────────────────────────────────────────────────────
  const abrirChat = useCallback(async (chatId) => {
    setLoadingChat(true)
    setError(null)
    try {
      const data = await getChat(chatId)
      setChatActivo(data)
      marcarLeido(chatId).catch(() => {})
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, no_leidos: 0 } : c)))
      return data
    } catch {
      setError('No se pudo cargar el chat.')
      return null
    } finally {
      setLoadingChat(false)
    }
  }, [])

  // ─── Buscar/crear chat por teléfono (para modal desde cotización/guía) ──
  const abrirOCrearPorTelefono = useCallback(async (telefono, nombreSugerido) => {
    setLoadingChat(true)
    setError(null)
    try {
      const data = await buscarOCrearChatPorTelefono(telefono, nombreSugerido)
      setChatActivo(data)
      return data
    } catch {
      setError('No se pudo abrir el chat.')
      return null
    } finally {
      setLoadingChat(false)
    }
  }, [])

  // ─── Enviar texto ────────────────────────────────────────────────────────
  const enviar = useCallback(async (chatId, texto) => {
    setLoadingEnvio(true)
    setError(null)
    try {
      const data = await enviarMensaje(chatId, { texto })
      if (data?.mensaje) {
        setChatActivo((prev) =>
          prev ? { ...prev, mensajes: [...(prev.mensajes || []), data.mensaje] } : prev
        )
      }
      return { success: true, data }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al enviar el mensaje.'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoadingEnvio(false)
    }
  }, [])

  // ─── Enviar con adjunto (PDF/imagen) ─────────────────────────────────────
  const enviarConAdjunto = useCallback(async (chatId, formData) => {
    setLoadingEnvio(true)
    setError(null)
    try {
      const data = await enviarConAdjuntoApi(chatId, formData)
      if (data?.mensaje) {
        setChatActivo((prev) =>
          prev ? { ...prev, mensajes: [...(prev.mensajes || []), data.mensaje] } : prev
        )
      }
      return { success: true, data }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al enviar el adjunto.'
      setError(msg)
      return { success: false, error: msg }
    } finally {
      setLoadingEnvio(false)
    }
  }, [])

  // ─── Fijar / desfijar ───────────────────────────────────────────────────
  const togglePin = useCallback(async (chatId) => {
    const actual = chats.find((c) => c.id === chatId)
    const nuevoValor = !actual?.is_pinned
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, is_pinned: nuevoValor } : c)))
    try {
      await actualizarFlagsChat(chatId, { is_pinned: nuevoValor })
    } catch {
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, is_pinned: !nuevoValor } : c)))
      setError('No se pudo actualizar el chat.')
    }
  }, [chats])

  // ─── Silenciar / activar sonido ─────────────────────────────────────────
  const toggleMute = useCallback(async (chatId) => {
    const actual = chats.find((c) => c.id === chatId)
    const nuevoValor = !actual?.is_muted
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, is_muted: nuevoValor } : c)))
    try {
      await actualizarFlagsChat(chatId, { is_muted: nuevoValor })
    } catch {
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, is_muted: !nuevoValor } : c)))
      setError('No se pudo actualizar el chat.')
    }
  }, [chats])

  // ─── Vaciar conversación (borra mensajes, conserva el chat) ─────────────
  const vaciarConversacion = useCallback(async (chatId) => {
    try {
      await vaciarChat(chatId)
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, ultimo_mensaje: '' } : c)))
      setChatActivo((prev) => (prev?.id === chatId ? { ...prev, mensajes: [] } : prev))
      return { success: true }
    } catch {
      setError('No se pudo vaciar la conversación.')
      return { success: false }
    }
  }, [])

  // ─── Eliminar chat ────────────────────────────────────────────────────────
  const eliminarConversacion = useCallback(async (chatId) => {
    try {
      await eliminarChat(chatId)
      setChats((prev) => prev.filter((c) => c.id !== chatId))
      setChatActivo((prev) => (prev?.id === chatId ? null : prev))
      return { success: true }
    } catch {
      setError('No se pudo eliminar el chat.')
      return { success: false }
    }
  }, [])

  const cerrarChat = useCallback(() => {
    setChatActivo(null)
    setError(null)
  }, [])

  const limpiarError = useCallback(() => {
    setError(null)
  }, [])

  // ─── Polling — simula el webhook mientras no esté conectado el real ─────
  useEffect(() => {
    pollTimerRef.current = setInterval(async () => {
      try {
        const { hayNuevos, chats: lista } = await poll(ultimoTimestampRef.current)
        if (hayNuevos) {
          setChats(lista)
          if (lista.length > 0) ultimoTimestampRef.current = lista[0].fecha
        }
      } catch { /* silencioso — no interrumpir la UI por un poll fallido */ }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(pollTimerRef.current)
  }, [])

  const sinLeer = chats.reduce((acc, c) => acc + (c.no_leidos || 0), 0)

  return {
    chats,
    chatActivo,
    sinLeer,
    loadingChats,
    loadingChat,
    loadingEnvio,
    error,
    cargarChats,
    abrirChat,
    abrirOCrearPorTelefono,
    enviar,
    enviarConAdjunto,
    cerrarChat,
    limpiarError,
    togglePin,
    toggleMute,
    vaciarConversacion,
    eliminarConversacion,
  }
}