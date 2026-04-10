import axiosClient from './axiosClient'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/api$/, '')

function getMediaUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_BASE}${url}`
}

export async function getRecursos(codRef) {
  const { data } = await axiosClient.get(`/multimedia/${codRef}`)
  const imagenes = (data.imagenes || []).map((r) => ({
    id: r.id,
    cod_ref: codRef,
    tipo: 'imagen',
    nombre: r.titulo || r.nombre,
    url: getMediaUrl(r.url),
    seleccionada: r.seleccionada ?? false,
    principal: r.principal || false,
  }))
  const pdfs = (data.pdfs || []).map((r) => ({
    id: r.id,
    cod_ref: codRef,
    tipo: 'pdf',
    nombre: r.titulo || r.nombre,
    url: getMediaUrl(r.url),
    seleccionada: r.seleccionada ?? false,
    orden: r.orden || 0,
  }))
  return [...imagenes, ...pdfs]
}

export async function subirRecurso(codRef, archivo, tipo) {
  const formData = new FormData()
  formData.append('file', archivo)
  const endpoint = tipo === 'imagen'
    ? `/multimedia/${codRef}/imagen`
    : `/multimedia/${codRef}/pdf`
  const { data } = await axiosClient.post(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return {
    id: data.id,
    cod_ref: codRef,
    tipo,
    nombre: data.titulo || data.nombre,
    url: getMediaUrl(data.url),
    seleccionada: false,
    orden: data.orden || 0,
  }
}

export async function eliminarRecurso(codRef, id) {
  const { data } = await axiosClient.delete(`/multimedia/${id}`)
  return data
}

export async function toggleSeleccion(codRef, id, seleccionada) {
  const { data } = await axiosClient.patch(`/multimedia/${id}/seleccionada`, { seleccionada })  // ← cambio
  return data
}

export async function contarRecursos(codRef) {
  try {
    const recursos = await getRecursos(codRef)
    return {
      imagenes: recursos.filter((r) => r.tipo === 'imagen').length,
      pdfs: recursos.filter((r) => r.tipo === 'pdf').length,
    }
  } catch {
    return { imagenes: 0, pdfs: 0 }
  }
}

export async function marcarPrincipal(id) {
  const { data } = await axiosClient.patch(`/multimedia/${id}/principal`)
  return data
}
