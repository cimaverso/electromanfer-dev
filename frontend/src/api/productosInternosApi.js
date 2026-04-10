import axiosClient from './axiosClient'

// ─── MOCK ─────────────────────────────────────────────────────────────────────
// Reemplazar todo este bloque por las llamadas reales cuando el backend esté listo
let mockDB = []
let mockIdCounter = 1

function mockDelay(ms = 300) {
  return new Promise((res) => setTimeout(res, ms))
}
// ─── END MOCK ─────────────────────────────────────────────────────────────────

/**
 * GET /productos-internos
 * @param {string} query - texto a buscar en cod_ref o nom_ref
 */
export async function buscarProductosInternos(query = '') {
  // ─── MOCK ───────────────────────────────────────────────────────────────────
  await mockDelay()
  const q = query.toLowerCase().trim()
  const resultados = q
    ? mockDB.filter(
        (p) =>
          p.cod_ref.toLowerCase().includes(q) ||
          p.nom_ref.toLowerCase().includes(q) ||
          (p.tipo || '').toLowerCase().includes(q)
      )
    : [...mockDB]
  return resultados
  // ─── REAL ───────────────────────────────────────────────────────────────────
  // const response = await axiosClient.get('/productos-internos', { params: { q: query } })
  // return response.data
}

/**
 * POST /productos-internos
 * @param {Object} payload - { cod_ref, nom_ref, tipo, saldo, valor_web }
 */
export async function crearProductoInterno(payload) {
  // ─── MOCK ───────────────────────────────────────────────────────────────────
  await mockDelay()
  const nuevo = { ...payload, id: mockIdCounter++ }
  mockDB.push(nuevo)
  return nuevo
  // ─── REAL ───────────────────────────────────────────────────────────────────
  // const response = await axiosClient.post('/productos-internos', payload)
  // return response.data
}

/**
 * PUT /productos-internos/:id
 * @param {number} id
 * @param {Object} payload
 */
export async function actualizarProductoInterno(id, payload) {
  // ─── MOCK ───────────────────────────────────────────────────────────────────
  await mockDelay()
  mockDB = mockDB.map((p) => (p.id === id ? { ...p, ...payload } : p))
  return mockDB.find((p) => p.id === id)
  // ─── REAL ───────────────────────────────────────────────────────────────────
  // const response = await axiosClient.put(`/productos-internos/${id}`, payload)
  // return response.data
}

/**
 * DELETE /productos-internos/:id
 * @param {number} id
 */
export async function eliminarProductoInterno(id) {
  // ─── MOCK ───────────────────────────────────────────────────────────────────
  await mockDelay()
  mockDB = mockDB.filter((p) => p.id !== id)
  return { success: true }
  // ─── REAL ───────────────────────────────────────────────────────────────────
  // await axiosClient.delete(`/productos-internos/${id}`)
  // return { success: true }
}