import axiosClient from './axiosClient'

// ─────────────────────────────────────────────────────────────────────────────
// Control del asistente de IA de WhatsApp (encendido manual, horario
// automático, chats con el bot desactivado) y créditos gastados en Anthropic.
// Todo esto es local a Electromanfer (no viene de CimAPI). Solo lo puede
// usar GERENCIA/ADMINISTRADOR -- el backend devuelve 403 a un VENDEDOR.
// ─────────────────────────────────────────────────────────────────────────────

// → { override_manual: 'on'|'off'|null, horario_activo, horario_reglas, activo_ahora }
export async function obtenerConfigBot() {
  const { data } = await axiosClient.get('/whatsapp/bot/config')
  return data
}

// cambios: { override_manual?, horario_activo?, horario_reglas?, saldo_activo? } (parcial)
export async function actualizarConfigBot(cambios) {
  const { data } = await axiosClient.put('/whatsapp/bot/config', cambios)
  return data
}

// Acredita saldo prepago (plata ya recibida por fuera, ej. una transferencia).
// No toca la cuenta de Anthropic -- es un saldo interno que puede apagar el
// bot solo si "saldo_activo" está prendido en la config.
export async function recargarSaldoBot(monto) {
  const { data } = await axiosClient.post('/whatsapp/bot/saldo/recargar', { monto })
  return data
}

// → { total_tokens_entrada, total_tokens_salida, total_usd, por_dia: [{fecha, tokens_entrada, tokens_salida, costo_usd}] }
export async function obtenerUsoBot(desde, hasta) {
  const params = {}
  if (desde) params.desde = desde
  if (hasta) params.hasta = hasta
  const { data } = await axiosClient.get('/whatsapp/bot/uso', { params })
  return data
}

// Activa/desactiva el asistente en un chat puntual.
export async function toggleBotChat(conversationId, desactivado) {
  const { data } = await axiosClient.patch(`/whatsapp/conversaciones/${conversationId}/bot`, { desactivado })
  return data
}
