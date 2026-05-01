import axiosClient from './axiosClient'

// ─── HILOS ────────────────────────────────────────────────────────────────────

/**
 * Lista hilos de la bandeja indicada.
 * @param {'inbox'|'sent'} bandeja
 * @param {object} filtros - { q, page, per_page }
 */
export async function listarHilos(bandeja = 'inbox', filtros = {}) {
  const response = await axiosClient.get('/buzon/hilos', {
    params: { bandeja, ...filtros },
  })
  return response.data
}

/**
 * Detalle de un hilo con todos sus mensajes.
 * @param {string} hiloId
 */
export async function getHilo(hiloId) {
  const response = await axiosClient.get(`/buzon/hilos/${hiloId}`)
  return response.data
}

/**
 * Marca un hilo como leído.
 * @param {string} hiloId
 */
export async function marcarLeido(hiloId) {
  const response = await axiosClient.patch(`/buzon/hilos/${hiloId}/leido`)
  return response.data
}

// ─── MENSAJES ─────────────────────────────────────────────────────────────────

/**
 * Responde dentro de un hilo existente.
 * @param {string} hiloId
 * @param {{ cuerpo: string, adjuntos?: string[] }} payload
 *   adjuntos: array de IDs de cotización a adjuntar como PDF
 */
export async function responderHilo(hiloId, payload) {
  const response = await axiosClient.post(
    `/buzon/hilos/${hiloId}/responder`,
    payload,
    { timeout: 60000 }
  )
  return response.data
}

/**
 * Redacta un correo nuevo (fuera de un hilo existente).
 * @param {{ destinatario: string, asunto: string, cuerpo: string, adjuntos?: string[] }} payload
 */
export async function redactarCorreo(payload) {
  const response = await axiosClient.post('/buzon/enviar', payload, {
    timeout: 60000,
  })
  return response.data
}

// ─── SINCRONIZACIÓN ───────────────────────────────────────────────────────────

/**
 * Solicita al backend sincronizar con Gmail (pull forzado).
 * El backend debería hacer esto automáticamente via polling/webhook,
 * pero este endpoint permite forzarlo desde la UI.
 */
export async function sincronizarBuzon() {
  const response = await axiosClient.post('/buzon/sincronizar')
  return response.data
}

// ─── MOCK — Eliminar cuando el backend esté listo ─────────────────────────────
// El backend debe implementar Gmail API OAuth2 con cuenta compartida
// ventas@electromanfer.com. Ver documentación: BUZON_API.md
//
// Arquitectura escalable: cuando se requiera buzón por asesor,
// el backend agrega campo `cuenta_gmail` al token JWT y este
// axiosClient lo envía automáticamente. El frontend no cambia.
// ─────────────────────────────────────────────────────────────────────────────