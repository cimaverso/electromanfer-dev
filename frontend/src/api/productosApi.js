import axiosClient from './axiosClient'

export async function buscarProductos(query) {
  if (!query || query.trim() === '') return []
  try {
    const response = await axiosClient.get('/productos', { params: { q: query } })
    return response.data
  } catch (error) {
    console.error('Error buscando productos:', error)
    return []
  }
}

export async function getProductoDetalle(codRef) {
  try {
    const response = await axiosClient.get(`/productos/${codRef}`)
    const producto = response.data

    // Cargar imagen principal
    let imagen_url = null
    try {
      const recursos = await axiosClient.get(`/multimedia/${codRef}`)
      const imagenes = recursos.data?.imagenes || []
      const principal = imagenes.find(img => img.principal) || imagenes[0]
      if (principal) imagen_url = principal.url
    } catch { }

    return { ...producto, imagen_url }
  } catch (error) {
    console.error('Error obteniendo detalle:', error)
    throw error
  }
}