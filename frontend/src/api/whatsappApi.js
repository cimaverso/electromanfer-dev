import axiosClient from './axiosClient'

// ─────────────────────────────────────────────────────────────────────────────
// Conectado a los endpoints reales de Electromanfer (que a su vez consumen CimAPI).
// Backend listo: listarChats, getChat, enviarMensaje, enviarConAdjunto (imagen/documento/audio).
// Backend PENDIENTE: marcarLeido, poll real, buscarOCrearChatPorTelefono.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Listar chats (bandeja) ──────────────────────────────────────────────────
export async function listarChats(filtros = {}) {
  const { data } = await axiosClient.get('/whatsapp/conversaciones', {
    params: { page: 1, limit: 50 },
  })

  let lista = data.data.map((c) => ({
    id: c.id,
    telefono: c.contact_phone?.phone || c.contact?.whatsapp_number || '',
    nombre: c.contact?.name || c.contact_phone?.phone || 'Sin nombre',
    ultimo_mensaje: c.last_message?.content || '',
    fecha: c.last_message?.created_at || c.updated_at,
    no_leidos: 0,
  }))

  if (filtros.q) {
    const q = filtros.q.toLowerCase()
    lista = lista.filter((c) => c.nombre.toLowerCase().includes(q) || c.telefono.includes(q))
  }
  lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  return { chats: lista }
}

// ─── Abrir un chat (con sus mensajes) ────────────────────────────────────────
export async function getChat(chatId) {
  const { data } = await axiosClient.get(`/whatsapp/conversaciones/${chatId}/mensajes`, {
    params: { page: 1, limit: 100 },
  })

  return {
    id: data.conversation_id,
    telefono: data.contact_phone?.phone || data.contact?.whatsapp_number || '',
    nombre: data.contact?.name || 'Sin nombre',
    mensajes: data.messages.map((m) => ({
      id: m.id,
      direccion: m.direction === 'inbound' ? 'recibido' : 'enviado',
      texto: m.content || '',
      tipo: m.type,
      media_id: m.media_id,
      fecha: m.created_at,
    })),
  }
}

// ─── Buscar o crear chat por teléfono ─────────────────────────────────────────
// PENDIENTE: falta endpoint en backend para iniciar conversación nueva.
export async function buscarOCrearChatPorTelefono(telefono, nombreSugerido = '') {
  console.warn('buscarOCrearChatPorTelefono: aún no conectado a backend real')
  throw new Error('Función no disponible todavía')
}

// ─── Enviar mensaje de texto ──────────────────────────────────────────────────
// CimAPI necesita el teléfono ("to"), así que primero resolvemos el chat.
// → { mensaje: {id, direccion, texto, fecha} }
export async function enviarMensaje(chatId, { texto }) {
  const chat = await getChat(chatId)

  const { data } = await axiosClient.post('/whatsapp/mensajes/texto', {
    to: chat.telefono,
    message: texto,
    conversation_id: chatId,
  })

  return {
    mensaje: {
      id: data.message?.id ?? `m_${Date.now()}`,
      direccion: 'enviado',
      texto: data.message?.content ?? texto,
      fecha: data.message?.created_at ?? new Date().toISOString(),
    },
  }
}

// ─── Enviar con adjunto (imagen, documento o audio) ──────────────────────────
// formData que arma ChatPanel.jsx trae: 'texto' (caption opcional) y 'archivo' (File).
// Se traduce a los campos que espera el backend (to, conversation_id, caption, file)
// y se elige el endpoint según el tipo MIME del archivo.
// → { mensaje: {id, direccion, texto, media_nombre, fecha} }
export async function enviarConAdjunto(chatId, formData) {
  const chat = await getChat(chatId)
  const archivo = formData.get('archivo')
  const texto = formData.get('texto') || ''

  if (!archivo) throw new Error('No se adjuntó ningún archivo')

  let endpoint = 'documento'
  if (archivo.type?.startsWith('image/')) endpoint = 'imagen'
  else if (archivo.type?.startsWith('audio/')) endpoint = 'audio'
  else if (archivo.type?.startsWith('video/')) endpoint = 'video'

  const body = new FormData()
  body.append('to', chat.telefono)
  body.append('conversation_id', chatId)
  body.append('file', archivo)
  if (endpoint !== 'audio') body.append('caption', texto)

  const { data } = await axiosClient.post(`/whatsapp/mensajes/${endpoint}`, body)

  return {
    mensaje: {
      id: data.message?.id ?? `m_${Date.now()}`,
      direccion: 'enviado',
      texto: data.message?.content ?? texto,
      media_nombre: archivo.name,
      fecha: data.message?.created_at ?? new Date().toISOString(),
    },
  }
}

// ─── Marcar leído ─────────────────────────────────────────────────────────────
// PENDIENTE: CimAPI no expone estado de leído/no leído en lo que hemos visto.
export async function marcarLeido(chatId) {
  return { ok: true }
}

// ─── Poll — simula el empuje del webhook ─────────────────────────────────────
// Reutiliza listarChats como polling simple (sin detectar "hayNuevos" real).
export async function poll(_ultimoTimestamp) {
  const { chats } = await listarChats()
  return { hayNuevos: false, chats }
}
