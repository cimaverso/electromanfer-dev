import axiosClient from './axiosClient'

/**
 * POST /cotizaciones
 */
export async function crearCotizacion(payload) {
  const response = await axiosClient.post('/cotizaciones', payload)
  return response.data
}

/**
 * GET /cotizaciones
 */
export async function listarCotizaciones(filtros = {}) {
  const response = await axiosClient.get('/cotizaciones/', { params: filtros })
  return response.data
}

/**
 * GET /cotizaciones/:id
 */
export async function getCotizacion(id) {
  const response = await axiosClient.get(`/cotizaciones/${id}`)
  return response.data
}

/**
 * PUT /cotizaciones/:id
 * PENDIENTE: endpoint en backend por implementar.
 * Cuando el backend lo entregue, esta función ya está lista.
 */
export async function actualizarCotizacion(id, payload) {
  const response = await axiosClient.put(`/cotizaciones/${id}`, payload)
  return response.data
}

/**
 * PATCH /cotizaciones/:id/estado
 * PENDIENTE: endpoint en backend por implementar.
 * Transiciones permitidas: enviada_email → efectiva, enviada_whatsapp → efectiva
 */
export async function cambiarEstadoCotizacion(id, estado) {
  const response = await axiosClient.patch(`/cotizaciones/${id}/estado`, { estado })
  return response.data
}

/**
 * POST /cotizaciones/:id/enviar-email
 */
export async function enviarEmail(id, payload) {
  const response = await axiosClient.post(`/cotizaciones/${id}/enviar-email`, payload, {
    timeout: 60000
  })
  return response.data
}

/**
 * POST /cotizaciones/:id/enviar-whatsapp
 */
export async function enviarWhatsapp(id, payload) {
  const response = await axiosClient.post(`/cotizaciones/${id}/enviar-whatsapp`, payload)
  return response.data
}