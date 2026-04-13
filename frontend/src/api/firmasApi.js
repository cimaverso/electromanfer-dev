import axiosClient from './axiosClient'

// ─── MOCK ─────────────────────────────────────────────────────────────────────
// Simula las firmas disponibles en la carpeta media del backend
const mockFirmas = [
  {
    id: 1,
    nombre: 'Harvey Cano - Logo Electromanfer',
    descripcion: 'Firma estándar con logo principal',
    url: '/firma_harvie.jpeg',
    activa: true,
  },
  {
    id: 2,
    nombre: 'Harvey Cano - Logo Ecológico',
    descripcion: 'Firma para línea de productos ecológicos',
    url: '/firma_harvie.jpeg', // reemplazar con la firma ecológica real
    activa: true,
  },
]

function mockDelay(ms = 250) {
  return new Promise((res) => setTimeout(res, ms))
}
// ─── END MOCK ─────────────────────────────────────────────────────────────────

/**
 * GET /firmas
 * Retorna lista de firmas disponibles para el correo
 * @returns {Promise<Array>} [{ id, nombre, descripcion, url, activa }]
 */
export async function listarFirmas() {
  // ─── MOCK ───────────────────────────────────────────────────────────────────
  await mockDelay()
  return mockFirmas.filter((f) => f.activa)
  // ─── REAL ───────────────────────────────────────────────────────────────────
  // const response = await axiosClient.get('/firmas')
  // return response.data
}

/**
 * POST /firmas
 * Sube una nueva firma al servidor (multipart/form-data)
 * @param {FormData} formData - { nombre, descripcion, archivo: File }
 */
export async function subirFirma(formData) {
  // ─── MOCK ───────────────────────────────────────────────────────────────────
  await mockDelay()
  return { id: Date.now(), nombre: formData.get('nombre'), url: '/firma_harvie.jpeg', activa: true }
  // ─── REAL ───────────────────────────────────────────────────────────────────
  // const response = await axiosClient.post('/firmas', formData, {
  //   headers: { 'Content-Type': 'multipart/form-data' },
  // })
  // return response.data
}

/**
 * DELETE /firmas/:id
 * Elimina una firma del servidor
 */
export async function eliminarFirma(id) {
  // ─── MOCK ───────────────────────────────────────────────────────────────────
  await mockDelay()
  return { success: true }
  // ─── REAL ───────────────────────────────────────────────────────────────────
  // await axiosClient.delete(`/firmas/${id}`)
  // return { success: true }
}