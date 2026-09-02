import axiosClient from './axiosClient'

// ─────────────────────────────────────────────────────────────────────────────
// MOCK — Jair reemplaza el cuerpo de cada función por la llamada real a axiosClient.
// Los nombres, firmas y shapes de retorno son el CONTRATO. No cambiar sin avisar
// al frontend, porque useWhatsapp.js y ChatPanel.jsx ya asumen esta forma.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Datos en memoria (solo para el mock) ────────────────────────────────────
let _chats = [
  {
    id: 'chat_1',
    telefono: '573001234567',
    nombre: 'Comercializadora Milpa',
    ultimo_mensaje: 'Perfecto, quedamos atentos al envío',
    fecha: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    no_leidos: 2,
    mensajes: [
      { id: 'm1', direccion: 'recibido', texto: 'Buenas tardes, ¿tienen disponibilidad de guantes dieléctricos?', fecha: new Date(Date.now() - 1000 * 60 * 40).toISOString() },
      { id: 'm2', direccion: 'enviado',  texto: 'Buenas tardes, sí tenemos. Le comparto la cotización en un momento.', fecha: new Date(Date.now() - 1000 * 60 * 35).toISOString() },
      { id: 'm3', direccion: 'recibido', texto: 'Perfecto, quedamos atentos al envío', fecha: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
    ],
  },
  {
    id: 'chat_2',
    telefono: '573109876543',
    nombre: 'Wherex - Avimol S.A.S',
    ultimo_mensaje: 'Recibido, gracias',
    fecha: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    no_leidos: 0,
    mensajes: [
      { id: 'm4', direccion: 'recibido', texto: 'Hola, ¿me confirman el estado de la guía CRA-2024-881234?', fecha: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() },
      { id: 'm5', direccion: 'enviado',  texto: 'Hola, la guía fue despachada ayer, debería llegar hoy en la tarde.', fecha: new Date(Date.now() - 1000 * 60 * 60 * 3.5).toISOString() },
      { id: 'm6', direccion: 'recibido', texto: 'Recibido, gracias', fecha: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
    ],
  },
]

function clone(x) { return JSON.parse(JSON.stringify(x)) }

// ─── Listar chats (bandeja) ──────────────────────────────────────────────────
// → { chats: [{id, telefono, nombre, ultimo_mensaje, fecha, no_leidos}] }
export async function listarChats(filtros = {}) {
  await new Promise((r) => setTimeout(r, 150))
  let lista = clone(_chats).map(({ mensajes, ...resto }) => resto)
  if (filtros.q) {
    const q = filtros.q.toLowerCase()
    lista = lista.filter((c) => c.nombre.toLowerCase().includes(q) || c.telefono.includes(q))
  }
  lista.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  return { chats: lista }
}

// ─── Abrir un chat (con sus mensajes) ────────────────────────────────────────
// → { id, telefono, nombre, mensajes: [...] }
export async function getChat(chatId) {
  await new Promise((r) => setTimeout(r, 150))
  const chat = _chats.find((c) => c.id === chatId)
  if (!chat) return null
  return clone(chat)
}

// ─── Buscar o crear chat por teléfono (para "nuevo chat" desde cotización/guía) ─
// → { id, telefono, nombre, mensajes: [] }
export async function buscarOCrearChatPorTelefono(telefono, nombreSugerido = '') {
  await new Promise((r) => setTimeout(r, 150))
  const limpio = telefono.replace(/\D/g, '')
  let chat = _chats.find((c) => c.telefono.includes(limpio) || limpio.includes(c.telefono))
  if (!chat) {
    chat = {
      id: `chat_${Date.now()}`,
      telefono: limpio.startsWith('57') ? limpio : `57${limpio}`,
      nombre: nombreSugerido || limpio,
      ultimo_mensaje: '',
      fecha: new Date().toISOString(),
      no_leidos: 0,
      mensajes: [],
    }
    _chats.push(chat)
  }
  return clone(chat)
}

// ─── Enviar mensaje de texto ──────────────────────────────────────────────────
// → { mensaje: {id, direccion, texto, fecha} }
export async function enviarMensaje(chatId, { texto }) {
  await new Promise((r) => setTimeout(r, 300))
  const chat = _chats.find((c) => c.id === chatId)
  if (!chat) throw new Error('Chat no encontrado')
  const mensaje = { id: `m_${Date.now()}`, direccion: 'enviado', texto, fecha: new Date().toISOString() }
  chat.mensajes.push(mensaje)
  chat.ultimo_mensaje = texto
  chat.fecha = mensaje.fecha
  return { mensaje }
}

// ─── Enviar con adjunto (PDF cotización / foto guía) ─────────────────────────
// En real: 1) subir a Meta media endpoint → media_id, 2) enviar mensaje con media_id.
// El mock simula ambos pasos como una sola llamada.
// → { mensaje: {id, direccion, texto, media_nombre, fecha} }
export async function enviarConAdjunto(chatId, formData) {
  await new Promise((r) => setTimeout(r, 500))
  const chat = _chats.find((c) => c.id === chatId)
  if (!chat) throw new Error('Chat no encontrado')
  const texto = formData.get('texto') || ''
  const archivo = formData.get('archivo')
  const mensaje = {
    id: `m_${Date.now()}`,
    direccion: 'enviado',
    texto,
    media_nombre: archivo?.name || null,
    fecha: new Date().toISOString(),
  }
  chat.mensajes.push(mensaje)
  chat.ultimo_mensaje = texto || `📎 ${archivo?.name || 'archivo'}`
  chat.fecha = mensaje.fecha
  return { mensaje }
}

// ─── Marcar leído ─────────────────────────────────────────────────────────────
export async function marcarLeido(chatId) {
  const chat = _chats.find((c) => c.id === chatId)
  if (chat) chat.no_leidos = 0
  return { ok: true }
}

// ─── Poll — simula el empuje del webhook ─────────────────────────────────────
// El hook llama esto cada 5-8s con el timestamp del último mensaje visto.
// → { hayNuevos: bool, chats: [...] }  (mismo shape que listarChats)
export async function poll(_ultimoTimestamp) {
  await new Promise((r) => setTimeout(r, 100))
  // Mock: nunca genera mensajes espontáneos — Jair conecta esto al webhook real.
  return { hayNuevos: false, chats: clone(_chats).map(({ mensajes, ...r }) => r) }
}