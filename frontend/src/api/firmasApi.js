import axiosClient from './axiosClient'

export async function listarFirmas() {
  const response = await axiosClient.get('/firmas')
  return response.data
}

export async function subirFirma(formData) {
  const response = await axiosClient.post('/firmas', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function eliminarFirma(id) {
  await axiosClient.delete(`/firmas/${id}`)
  return { success: true }
}