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
    hilo_message_id: correo.hilo_root_id || correo.message_id || '',
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
  const cotMatch = primero.asunto?.match(/COT-\d{4}-\d{4}/)

  return {
    id: hiloMessageId,
    leido: true,
    remitente: nombre || emailAddr,
    email_remitente: emailAddr,
    asunto: primero.asunto || '(Sin asunto)',
    fecha: primero.fecha,
    cotizacion_consecutivo: cotMatch ? cotMatch[0] : null,
    message_id: hiloMessageId,
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

export async function listarHilos(bandeja = 'inbox', filtros = {}) {
  const endpoint = bandeja === 'inbox' ? '/emails/inbox' : '/emails/sent'
  const response = await axiosClient.get(endpoint, {
    params: { limit: filtros.limit || 10 },
  })
  const correos = Array.isArray(response.data) ? response.data : []
  return correos.map((c) => correoAHilo(c, bandeja))
}

export async function marcarLeido(hiloId) {
  const response = await axiosClient.patch(`/emails/${hiloId}/leido`)
  return response.data
}

export async function responderHilo(hiloId, payload) {
  return { ok: true }
}

export async function redactarCorreo(payload) {
  const response = await axiosClient.post('/emails/enviar', payload, {
    timeout: 60000,
  })
  return response.data
}

export async function sincronizarBuzon() {
  return { ok: true }
}