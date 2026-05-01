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
    leido: true,
    remitente: nombre || emailAddr,
    email_remitente: emailAddr,
    asunto: correo.asunto || '(Sin asunto)',
    preview: correo.preview || '',
    fecha: correo.fecha,
    cotizacion_consecutivo: cotMatch ? cotMatch[0] : null,
    mensajes: [],
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

export async function getHilo(hiloId, bandeja = 'inbox') {
  const response = await axiosClient.get(`/emails/${hiloId}`, {
    params: { bandeja },
  })
  const correo = response.data
  const esEnviado = bandeja === 'sent'
  const campoPersona = esEnviado ? correo.destinatario : correo.remitente
  const nombre = limpiarNombre(campoPersona)
  const emailAddr = extraerEmail(campoPersona)
  const cotMatch = correo.asunto?.match(/COT-\d{4}-\d{4}/)

  return {
    id: correo.id,
    leido: true,
    remitente: nombre || emailAddr,
    email_remitente: emailAddr,
    asunto: correo.asunto || '(Sin asunto)',
    preview: correo.preview || '',
    fecha: correo.fecha,
    cotizacion_consecutivo: cotMatch ? cotMatch[0] : null,
    mensajes: [
      {
        id: `msg-${correo.id}`,
        direccion: esEnviado ? 'enviado' : 'recibido',
        remitente: nombre || emailAddr,
        email: emailAddr,
        cuerpo: correo.cuerpo || '',
        cuerpo_html: correo.cuerpo_html || '',
        fecha: correo.fecha,
        adjuntos: correo.adjuntos || [],
      },
    ],
  }
}

export async function marcarLeido(hiloId) {
  return { ok: true }
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