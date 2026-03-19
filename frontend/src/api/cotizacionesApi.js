import axiosClient from './axiosClient'

// ── MOCK TEMPORAL — eliminar cuando FastAPI esté listo ──
let mockIdCounter = 88

const MOCK_HISTORIAL = [
  {
    id: 87,
    consecutivo: 'COT-2026-000087',
    cliente: { nombre_razon_social: 'Constructora Los Andes S.A.' },
    subtotal: 2012605,
    iva_total: 382395,
    total: 2395000,
    estado: 'enviada_email',
    fecha_generacion: '2026-03-18T10:30:00',
    pdf_url: null,
  },
  {
    id: 86,
    consecutivo: 'COT-2026-000086',
    cliente: { nombre_razon_social: 'Industria del Norte S.A.S.' },
    subtotal: 731092,
    iva_total: 138908,
    total: 870000,
    estado: 'generada',
    fecha_generacion: '2026-03-18T09:15:00',
    pdf_url: null,
  },
  {
    id: 85,
    consecutivo: 'COT-2026-000085',
    cliente: { nombre_razon_social: 'Ferretería Central Ltda.' },
    subtotal: 1042016,
    iva_total: 197984,
    total: 1240000,
    estado: 'enviada_whatsapp',
    fecha_generacion: '2026-03-17T16:45:00',
    pdf_url: null,
  },
  {
    id: 84,
    consecutivo: 'COT-2026-000084',
    cliente: { nombre_razon_social: 'Eléctricos del Valle' },
    subtotal: 470588,
    iva_total: 89412,
    total: 560000,
    estado: 'generada',
    fecha_generacion: '2026-03-17T14:20:00',
    pdf_url: null,
  },
  {
    id: 83,
    consecutivo: 'COT-2026-000083',
    cliente: { nombre_razon_social: 'Grupo Constructor Medellín' },
    subtotal: 2672268,
    iva_total: 507732,
    total: 3180000,
    estado: 'anulada',
    fecha_generacion: '2026-03-16T11:00:00',
    pdf_url: null,
  },
]

function calcularTotales(items) {
  const subtotal = items.reduce(
    (acc, item) => acc + item.precio_unitario * item.cantidad,
    0
  )
  const iva = subtotal * 0.19
  const total = subtotal + iva
  return { subtotal, iva_total: iva, total }
}
// ── FIN MOCK HELPERS ──

/**
 * POST /cotizaciones
 */
export async function crearCotizacion(payload) {
  // ── MOCK TEMPORAL ──
  await new Promise((r) => setTimeout(r, 1200))

  mockIdCounter++
  const consecutivo = `COT-2026-0000${mockIdCounter}`

  const itemsConPrecio = payload.items.map((item) => ({
    ...item,
    precio_unitario: 50000, // precio placeholder
    subtotal_linea: 50000 * item.cantidad,
    iva_linea: 50000 * item.cantidad * 0.19,
    total_linea: 50000 * item.cantidad * 1.19,
  }))

  const { subtotal, iva_total, total } = calcularTotales(
    itemsConPrecio.map((i) => ({
      precio_unitario: i.precio_unitario,
      cantidad: i.cantidad,
    }))
  )

  const nueva = {
    id: mockIdCounter,
    consecutivo,
    estado: 'generada',
    cliente: payload.cliente,
    items: itemsConPrecio,
    subtotal,
    iva_total,
    total,
    pdf_url: null,
    created_at: new Date().toISOString(),
  }

  MOCK_HISTORIAL.unshift({
    ...nueva,
    fecha_generacion: nueva.created_at,
  })

  return nueva
  // ── Cuando FastAPI esté listo, reemplazar con: ──
  // const response = await axiosClient.post('/cotizaciones', payload)
  // return response.data
}

/**
 * GET /cotizaciones
 */
export async function listarCotizaciones(filtros = {}) {
  // ── MOCK TEMPORAL ──
  await new Promise((r) => setTimeout(r, 500))

  let resultado = [...MOCK_HISTORIAL]

  if (filtros.cliente) {
    const q = filtros.cliente.toLowerCase()
    resultado = resultado.filter((c) =>
      c.cliente?.nombre_razon_social?.toLowerCase().includes(q)
    )
  }

  if (filtros.estado) {
    resultado = resultado.filter((c) => c.estado === filtros.estado)
  }

  if (filtros.consecutivo) {
    resultado = resultado.filter((c) =>
      c.consecutivo.toLowerCase().includes(filtros.consecutivo.toLowerCase())
    )
  }

  if (filtros.fecha_inicio) {
    resultado = resultado.filter(
      (c) => new Date(c.fecha_generacion) >= new Date(filtros.fecha_inicio)
    )
  }

  if (filtros.fecha_fin) {
    resultado = resultado.filter(
      (c) => new Date(c.fecha_generacion) <= new Date(filtros.fecha_fin + 'T23:59:59')
    )
  }

  return resultado
  // ── Cuando FastAPI esté listo, reemplazar con: ──
  // const response = await axiosClient.get('/cotizaciones', { params: filtros })
  // return response.data
}

/**
 * GET /cotizaciones/:id
 */
export async function getCotizacion(id) {
  // ── MOCK TEMPORAL ──
  await new Promise((r) => setTimeout(r, 400))
  const cot = MOCK_HISTORIAL.find((c) => c.id === id)
  if (!cot) throw new Error('Cotización no encontrada')
  return cot
  // ── Cuando FastAPI esté listo, reemplazar con: ──
  // const response = await axiosClient.get(`/cotizaciones/${id}`)
  // return response.data
}

/**
 * GET /cotizaciones/:id/pdf
 */
export async function getPdfUrl(id) {
  // ── MOCK TEMPORAL ──
  await new Promise((r) => setTimeout(r, 300))
  return { pdf_url: null }
  // ── Cuando FastAPI esté listo, reemplazar con: ──
  // const response = await axiosClient.get(`/cotizaciones/${id}/pdf`)
  // return response.data
}

/**
 * POST /cotizaciones/:id/enviar-email
 */
export async function enviarEmail(id, payload) {
  // ── MOCK TEMPORAL ──
  await new Promise((r) => setTimeout(r, 800))
  const cot = MOCK_HISTORIAL.find((c) => c.id === id)
  if (cot) cot.estado = 'enviada_email'
  return { ok: true }
  // ── Cuando FastAPI esté listo, reemplazar con: ──
  // const response = await axiosClient.post(`/cotizaciones/${id}/enviar-email`, payload)
  // return response.data
}

/**
 * POST /cotizaciones/:id/enviar-whatsapp
 */
export async function enviarWhatsapp(id, payload) {
  // ── MOCK TEMPORAL ──
  await new Promise((r) => setTimeout(r, 600))
  const tel = payload.telefono || '573001234567'
  const msg = encodeURIComponent(payload.mensaje || '')
  const cot = MOCK_HISTORIAL.find((c) => c.id === id)
  if (cot) cot.estado = 'enviada_whatsapp'
  return { whatsapp_url: `https://wa.me/${tel}?text=${msg}` }
  // ── Cuando FastAPI esté listo, reemplazar con: ──
  // const response = await axiosClient.post(`/cotizaciones/${id}/enviar-whatsapp`, payload)
  // return response.data
}

/**
 * GET /cotizaciones/:id/historial
 */
export async function getHistorial(id) {
  // ── MOCK TEMPORAL ──
  await new Promise((r) => setTimeout(r, 400))
  return [
    { id: 1, evento: 'generada', created_at: new Date().toISOString() },
  ]
  // ── Cuando FastAPI esté listo, reemplazar con: ──
  // const response = await axiosClient.get(`/cotizaciones/${id}/historial`)
  // return response.data
}