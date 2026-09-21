import axiosClient from './axiosClient'

// ─────────────────────────────────────────────────────────────────────────────
// Conectado a los endpoints reales de Electromanfer (que a su vez consumen CimAPI).
// Backend listo: listarChats, getChat, enviarMensaje, enviarConAdjunto (imagen/documento/audio).
// Backend PENDIENTE: marcarLeido, poll real, buscarOCrearChatPorTelefono.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Listar chats (bandeja) ──────────────────────────────────────────────────
export async function listarChats(filtros = {}) {
  const params = { page: 1, limit: 50 }
  if (filtros.linea_id != null) params.linea_id = filtros.linea_id

  const { data } = await axiosClient.get('/whatsapp/conversaciones', { params })

  let lista = data.data.map((c) => ({
    id: c.id,
    telefono: c.contact_phone?.phone || c.contact?.whatsapp_number || '',
    nombre: c.contact?.name || c.contact_phone?.phone || 'Sin nombre',
    ultimo_mensaje: c.last_message?.content || '',
    fecha: c.last_message?.created_at || c.updated_at,
    no_leidos: 0,
    is_pinned: !!c.is_pinned,
    is_muted: !!c.is_muted,
  }))

  if (filtros.q) {
    const q = filtros.q.toLowerCase()
    lista = lista.filter((c) => c.nombre.toLowerCase().includes(q) || c.telefono.includes(q))
  }
  lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  return { chats: lista }
}

// ─── Búsqueda híbrida (contactos + texto de mensajes) ────────────────────────
// → { contactos: [...], mensajes: [{conversation_id, snippet, matches, fecha, nombre, telefono}] }
export async function buscarGlobal(q, lineaId, signal) {
  const params = { q }
  if (lineaId != null) params.linea_id = lineaId
  const { data } = await axiosClient.get('/whatsapp/buscar', { params, signal })
  return {
    contactos: data.contacts || [],
    mensajes: (data.messages || []).map((m) => ({
      conversation_id: m.conversation_id,
      message_id: m.message_id,
      snippet: m.snippet,
      matches: m.matches,
      fecha: m.created_at,
      nombre: m.contact?.name || m.contact?.whatsapp_number || 'Sin nombre',
      telefono: m.contact?.whatsapp_number || '',
    })),
  }
}

// ─── Abrir un chat (con sus mensajes) ────────────────────────────────────────
export async function getChat(chatId) {
  const { data } = await axiosClient.get(`/whatsapp/conversaciones/${chatId}/mensajes`, {
    params: { page: 1, limit: 100 },
  })

  return {
    id: data.conversation_id,
    telefono: data.contact_phone?.phone || data.contact?.whatsapp_number || '',
    nombre: data.contact?.name || data.contact_phone?.phone || data.contact?.whatsapp_number || 'Sin nombre',
    mensajes: data.messages.map((m) => ({
      id: m.id,
      direccion: m.direction === 'inbound' ? 'recibido' : 'enviado',
      texto: m.content || '',
      tipo: m.type,
      media_id: m.media_id,
      media_nombre: m.media_filename || null,
      plantilla: m.template_components || null,
      fecha: m.created_at,
    })),
  }
}

// ─── Líneas de WhatsApp disponibles (selector — solo GERENCIA/ADMINISTRADOR) ──
export async function listarLineas() {
  const { data } = await axiosClient.get('/whatsapp/lineas')
  return data.lineas
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
      tipo: { imagen: 'image', audio: 'audio', video: 'video', documento: 'document' }[endpoint],
      media_id: data.message?.media_id ?? null,
      media_nombre: archivo.name,
      // Respaldo: si CimAPI no devuelve media_id, se previsualiza el archivo local
      media_local: archivo,
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


// ─── Fijar / silenciar chat ───────────────────────────────────────────────────
export async function actualizarFlagsChat(chatId, flags) {
  const { data } = await axiosClient.patch(`/whatsapp/conversaciones/${chatId}`, flags)
  return data
}

// ─── Vaciar conversación (borra mensajes, conserva el chat) ──────────────────
export async function vaciarChat(chatId) {
  await axiosClient.delete(`/whatsapp/conversaciones/${chatId}/mensajes`)
  return { ok: true }
}

// ─── Eliminar chat (soft delete en CimAPI) ───────────────────────────────────
export async function eliminarChat(chatId) {
  await axiosClient.delete(`/whatsapp/conversaciones/${chatId}`)
  return { ok: true }
}

// ─── Plantillas ───────────────────────────────────────────────────────────────
// Viven a nivel de línea. GERENCIA/ADMIN pasan la línea elegida; el backend
// ignora `lineaId` para vendedores (usa su línea fija).
const paramsLinea = (lineaId) => (lineaId != null ? { linea_id: lineaId } : {})

// → [{id, name, language, category, status, components}]
export async function listarPlantillas(lineaId) {
  const { data } = await axiosClient.get('/whatsapp/plantillas', { params: paramsLinea(lineaId) })
  return data
}

export async function crearPlantilla(lineaId, { name, language, category, components }) {
  const { data } = await axiosClient.post(
    '/whatsapp/plantillas',
    { name, language, category, components },
    { params: paramsLinea(lineaId) }
  )
  return data
}

// Trae de Meta el estado actualizado (aprobada / en revisión / rechazada).
export async function sincronizarPlantillas(lineaId) {
  const { data } = await axiosClient.post('/whatsapp/plantillas/sincronizar', null, { params: paramsLinea(lineaId) })
  return data
}

// → { mensaje: {id, direccion, texto, tipo, fecha} }
export async function enviarPlantilla(chatId, { templateName, language, components, previewText }) {
  const chat = await getChat(chatId)
  const { data } = await axiosClient.post('/whatsapp/mensajes/plantilla', {
    to: chat.telefono,
    template_name: templateName,
    language,
    components: components?.length ? components : null,
    preview_text: previewText,
    conversation_id: chatId,
  })
  return {
    mensaje: {
      id: data.message?.id ?? `m_${Date.now()}`,
      direccion: 'enviado',
      texto: data.message?.content ?? previewText ?? templateName,
      tipo: data.message?.type ?? 'template',
      plantilla: data.message?.template_components ?? null,
      fecha: data.message?.created_at ?? new Date().toISOString(),
    },
  }
}
