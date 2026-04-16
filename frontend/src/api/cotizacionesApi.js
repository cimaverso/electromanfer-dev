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
  const response = await axiosClient.get('/cotizaciones', { params: filtros })
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
 * POST /cotizaciones/:id/enviar-email
 */
export async function enviarEmail(id, payload) {
  const response = await axiosClient.post(`/cotizaciones/${id}/enviar-email`, payload, {
    timeout: 60000  // 60 segundos solo para este endpoint
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