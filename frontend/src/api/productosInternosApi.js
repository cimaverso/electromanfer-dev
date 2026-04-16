import axiosClient from './axiosClient'

export async function buscarProductosInternos(query = '') {
  const response = await axiosClient.get('/productos/internos/', { params: { q: query } })
  return response.data
}

export async function crearProductoInterno(payload) {
  const response = await axiosClient.post('/productos/internos/', payload)
  return response.data
}

export async function actualizarProductoInterno(cod_ref, payload) {
  const response = await axiosClient.patch(`/productos/internos/${cod_ref}`, payload)
  return response.data
}

export async function eliminarProductoInterno(id) {
  await axiosClient.delete(`/productos/internos/${id}`)
  return { success: true }
}