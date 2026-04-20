import axiosClient from './axiosClient'


export async function crearCotizacion(payload) {
  const response = await axiosClient.post('/cotizaciones', payload)
  return response.data
}

export async function listarCotizaciones(filtros = {}) {
  const response = await axiosClient.get('/cotizaciones/', { params: filtros })
  return response.data
}

export async function getCotizacion(id) {
  const response = await axiosClient.get(`/cotizaciones/${id}`)
  return response.data
}

export async function actualizarCotizacion(id, payload) {
  const response = await axiosClient.patch(`/cotizaciones/${id}`, payload)
  return response.data
}

export async function cambiarEstadoCotizacion(id, estado) {
  const response = await axiosClient.patch(`/cotizaciones/${id}/estado`, { estado })
  return response.data
}

export async function enviarEmail(id, payload) {
  const response = await axiosClient.post(`/cotizaciones/${id}/enviar-email`, payload, {
    timeout: 60000
  })
  return response.data
}

