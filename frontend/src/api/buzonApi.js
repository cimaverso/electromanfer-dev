import axiosClient from './axiosClient'

function limpiarNombre(str = '') {
  return str
    .replace(/"/g, '')
    .replace(/<.*?>/, '')
    .trim()
}

function extraerEmail(str = '') {
  const match = str.match(/<(.+?)>/)
  return match ? match[1] : str.trim()
}

function correoAHilo(correo, bandeja) {
  const esEnviado = bandeja === 'sent'
  const campoPersona = esEnviado ? correo.destinatario : correo.remitente
  const nombre = limpiarNombre(campoPersona)
  const emailAddr = extraerEmail(campoPersona)
  const cotMatch = correo.asunto?.match(/COT-\d{4}-\d{4}/)
  return {
    id: correo.id,
    leido: esEnviado ? true : (correo.leido ?? true),
    remitente: nombre || emailAddr,
    email_remitente: emailAddr,
    asunto: correo.asunto || '(Sin asunto)',
    preview: correo.preview || '',
    fecha: correo.fecha,
    cotizacion_consecutivo: cotMatch ? cotMatch[0] : null,
    mensajes_count: correo.mensajes_count || 1,
    hilo_message_id: correo.thread_id || correo.id || '',
    mensajes: [],
  }
}

export async function getHilo(hiloMessageId, bandeja = 'inbox') {
  const response = await axiosClient.get(`/emails/hilo/${encodeURIComponent(hiloMessageId)}`)
  const mensajes = response.data
  if (!mensajes || mensajes.length === 0) return null
  const primero = mensajes[0]
  const esEnviado = bandeja === 'sent'
  const campoPersona = esEnviado ? primero.destinatario : primero.remitente
  const nombre = limpiarNombre(campoPersona)
  const emailAddr = extraerEmail(campoPersona)
  const CUENTA_PROPIA = 'ventas@electromanfer.com'
  const emailFinal = emailAddr === CUENTA_PROPIA ? extraerEmail(primero.destinatario) : emailAddr
  const cotMatch = primero.asunto?.match(/COT-\d{4}-\d{4}/)
  const ultimoRecibidoConId = [...mensajes].reverse().find(m => m.message_id && m.message_id !== '' && m.direccion === 'recibido')
  return {
    id: hiloMessageId,
    leido: true,
    remitente: nombre || emailAddr,
    email_remitente: emailFinal,
    asunto: primero.asunto || '(Sin asunto)',
    fecha: primero.fecha,
    cotizacion_consecutivo: cotMatch ? cotMatch[0] : null,
    message_id: hiloMessageId,
    last_message_id: ultimoRecibidoConId?.message_id || hiloMessageId,
    mensajes: mensajes.map((m) => ({
      id: m.id,
      direccion: m.direccion,
      remitente: limpiarNombre(m.remitente),
      email: extraerEmail(m.remitente),
      cuerpo: m.cuerpo || '',
      cuerpo_html: m.cuerpo_html || '',
      fecha: m.fecha,
      adjuntos: m.adjuntos || [],
    })),
  }
}

// Devuelve { hilos: [...], nextPageToken: string|null }
export async function listarHilos(bandeja = 'inbox', filtros = {}) {
  const endpoint = bandeja === 'inbox' ? '/emails/inbox' : '/emails/sent'
  const params = { limit: filtros.limit || 10 }
  if (filtros.page_token) params.page_token = filtros.page_token
  if (filtros.q) params.q = filtros.q

  const response = await axiosClient.get(endpoint, { params })
  const data = response.data

  // Soporta tanto el formato nuevo { hilos, next_page_token }
  // como el antiguo array plano (retrocompatibilidad)
  const correos = Array.isArray(data) ? data : (data.hilos || [])
  const nextPageToken = Array.isArray(data) ? null : (data.next_page_token || null)

  return {
    hilos: correos.map((c) => correoAHilo(c, bandeja)),
    nextPageToken,
  }
}

export async function marcarLeido(hiloId) {
  const response = await axiosClient.patch(`/emails/${hiloId}/leido`)
  return response.data
}

export async function responderHilo(hiloId, payload) {
  const response = await axiosClient.post('/emails/responder', payload, { timeout: 60000 })
  return response.data
}

export async function redactarCorreo(payload) {
  const response = await axiosClient.post('/emails/enviar', payload, { timeout: 60000 })
  return response.data
}

export async function responderConAdjuntos(formData) {
  const response = await axiosClient.post('/emails/responder-con-adjuntos', formData, {
    timeout: 120000,
  })
  return response.data
}

export async function sincronizarBuzon() {
  return { ok: true }
}