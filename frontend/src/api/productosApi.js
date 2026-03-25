import axiosClient from './axiosClient'

/**
 * GET /productos/buscar?q=texto
 */
export async function buscarProductos(query) {
  if (!query || query.trim() === '') return []

  try {
    const response = await axiosClient.get('/productos', {
      params: { q: query },
    })

    return response.data
  } catch (error) {
    console.error('Error buscando productos:', error)
    return []
  }
}

/**
 * GET /productos/:cod_ref
 */
export async function getProductoDetalle(codRef) {
  try {
    const response = await axiosClient.get(`/productos/${codRef}`)

    const producto = response.data

    return {
      ...producto,
      multimedia: [], // luego metemos imágenes reales
    }
  } catch (error) {
    console.error('Error obteniendo detalle:', error)
    throw error
  }
}