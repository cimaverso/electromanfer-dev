import axiosClient from './axiosClient'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/api$/, '')

function getMediaUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_BASE}${url}`
}

export async function listarFirmas() {
  const response = await axiosClient.get('/firmas')
  return response.data.map((f) => ({
    ...f,
    url: getMediaUrl(f.url)
  }))
}

export async function subirFirma(formData) {
  const response = await axiosClient.post('/firmas', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  const f = response.data
  return { ...f, url: getMediaUrl(f.url) }
}

export async function eliminarFirma(id) {
  await axiosClient.delete(`/firmas/${id}`)
  return { success: true }
}