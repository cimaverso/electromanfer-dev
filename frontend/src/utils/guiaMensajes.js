// ─────────────────────────────────────────────────────────────────────────────
// Texto compartido para notificar el despacho de una guía.
// Usado por: BuzonPanel (email), EmailGuiaModal (email), WhatsappGuiaModal (whatsapp).
// Si el formato del mensaje cambia, se edita AQUÍ ÚNICAMENTE.
// ─────────────────────────────────────────────────────────────────────────────

const ESTADO_LABELS = {
  generada: 'Generada',
  despachada: 'Despachada',
  en_transito: 'En tránsito',
  entregada: 'Entregada',
  novedad: 'Novedad',
}

export function buildTextoGuia(guia) {
  if (!guia) return ''
  const estado = ESTADO_LABELS[guia.estado] || guia.estado || '—'
  const fecha = guia.fecha_despacho
    ? new Date(guia.fecha_despacho + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

  return `Estimado cliente,

Le informamos que su pedido ha sido despachado. A continuación los detalles del envío:

──────────────────────────────
Número de guía:    ${guia.numero_guia || '—'}
Transportadora:    ${guia.transportadora || '—'}
Fecha de despacho: ${fecha}
Destinatario:      ${guia.destinatario || '—'}
Ciudad destino:    ${guia.ciudad_destino || '—'}${guia.direccion_destino ? `\nDirección:         ${guia.direccion_destino}` : ''}${guia.unidades ? `\nUnidades:          ${guia.unidades}` : ''}
Estado actual:     ${estado}
──────────────────────────────
${guia.observaciones ? `\nObservaciones: ${guia.observaciones}\n` : ''}
Para rastrear su envío, comuníquese directamente con la transportadora indicando el número de guía.

Quedamos atentos a cualquier inquietud.

Atentamente,`
}