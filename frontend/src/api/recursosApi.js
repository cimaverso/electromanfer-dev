import axiosClient from './axiosClient'

/**
 * ─── RECURSOS API ────────────────────────────────────────────────────────────
 *
 * Gestiona imágenes y PDFs (fichas técnicas) asociados a un producto.
 * Actualmente usa mocks en localStorage para desarrollo local.
 *
 * Cuando el backend esté listo:
 *   1. Eliminar las secciones marcadas con "── MOCK ──"
 *   2. Descomentar las líneas marcadas con "── REAL ──"
 *   3. El almacenamiento físico puede ser local o S3 — el frontend no cambia.
 *
 * ─── ENDPOINTS QUE EL BACKEND DEBE IMPLEMENTAR ──────────────────────────────
 *
 * GET  /productos/{cod_ref}/recursos
 *   Response: [{ id, cod_ref, tipo: 'imagen'|'pdf', nombre, url, seleccionada, orden }]
 *
 * POST /productos/{cod_ref}/recursos
 *   Body: multipart/form-data → { archivo: File, tipo: 'imagen'|'pdf' }
 *   Response: { id, cod_ref, tipo, nombre, url, seleccionada, orden }
 *
 * DELETE /productos/{cod_ref}/recursos/{id}
 *   Response: { ok: true }
 *
 * PATCH /productos/{cod_ref}/recursos/{id}/seleccion
 *   Body: { seleccionada: boolean }
 *   Response: { id, seleccionada }
 *
 * ─── MODELO DE DATOS (PostgreSQL sugerido) ───────────────────────────────────
 *
 * tabla: producto_recursos
 *   id              SERIAL PRIMARY KEY
 *   cod_ref         VARCHAR NOT NULL REFERENCES productos(cod_ref)
 *   tipo            VARCHAR(10) CHECK (tipo IN ('imagen', 'pdf'))
 *   nombre          VARCHAR NOT NULL          -- nombre original del archivo
 *   url             VARCHAR NOT NULL          -- URL pública (local o S3)
 *   seleccionada    BOOLEAN DEFAULT FALSE     -- si va a la cotización
 *   orden           INTEGER DEFAULT 0         -- orden de aparición
 *   created_at      TIMESTAMP DEFAULT NOW()
 *
 * Índice: CREATE INDEX ON producto_recursos(cod_ref, tipo);
 *
 * ─── ALMACENAMIENTO LOCAL (FastAPI) ─────────────────────────────────────────
 *
 * Ruta sugerida: /uploads/productos/{cod_ref}/{tipo}/{filename}
 * Servir estáticos: app.mount("/uploads", StaticFiles(directory="uploads"))
 * URL resultante: http://localhost:8000/uploads/productos/REF001/imagen/foto.jpg
 *
 * ─── MIGRACIÓN A S3 ──────────────────────────────────────────────────────────
 *
 * Solo cambiar la lógica de upload en el backend (boto3/aioboto3).
 * El campo `url` pasará de ser ruta local a URL de S3.
 * El frontend NO necesita cambios.
 */

// ── MOCK: clave en localStorage por cod_ref ──────────────────────────────────
const MOCK_KEY = (codRef) => `recursos_mock_${codRef}`

function getMockData(codRef) {
  try {
    const raw = localStorage.getItem(MOCK_KEY(codRef))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setMockData(codRef, data) {
  localStorage.setItem(MOCK_KEY(codRef), JSON.stringify(data))
}

let mockIdSeq = Date.now()
// ── FIN MOCK HELPERS ──────────────────────────────────────────────────────────

/**
 * Obtiene todos los recursos (imágenes y PDFs) de un producto.
 */
export async function getRecursos(codRef) {
  // ── MOCK ──
  await new Promise((r) => setTimeout(r, 200))
  return getMockData(codRef)
  // ── REAL ──
  // const response = await axiosClient.get(`/productos/${codRef}/recursos`)
  // return response.data
}

/**
 * Sube un archivo (imagen o PDF) al servidor.
 * @param {string} codRef
 * @param {File} archivo
 * @param {'imagen'|'pdf'} tipo
 */
export async function subirRecurso(codRef, archivo, tipo) {
  // ── MOCK: convierte a base64 y guarda en localStorage ──
  await new Promise((r) => setTimeout(r, 400))

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const recursos = getMockData(codRef)
      const nuevo = {
        id: ++mockIdSeq,
        cod_ref: codRef,
        tipo,
        nombre: archivo.name,
        url: reader.result, // base64 para mock local
        seleccionada: false,
        orden: recursos.filter((r) => r.tipo === tipo).length,
      }
      recursos.push(nuevo)
      setMockData(codRef, recursos)
      resolve(nuevo)
    }
    reader.onerror = () => reject(new Error('Error leyendo archivo'))
    reader.readAsDataURL(archivo)
  })
  // ── REAL ──
  // const formData = new FormData()
  // formData.append('archivo', archivo)
  // formData.append('tipo', tipo)
  // const response = await axiosClient.post(
  //   `/productos/${codRef}/recursos`,
  //   formData,
  //   { headers: { 'Content-Type': 'multipart/form-data' } }
  // )
  // return response.data
}

/**
 * Elimina un recurso por ID.
 */
export async function eliminarRecurso(codRef, id) {
  // ── MOCK ──
  await new Promise((r) => setTimeout(r, 200))
  const recursos = getMockData(codRef).filter((r) => r.id !== id)
  setMockData(codRef, recursos)
  return { ok: true }
  // ── REAL ──
  // const response = await axiosClient.delete(`/productos/${codRef}/recursos/${id}`)
  // return response.data
}

/**
 * Marca o desmarca un recurso como seleccionado para cotización.
 */
export async function toggleSeleccion(codRef, id, seleccionada) {
  // ── MOCK ──
  await new Promise((r) => setTimeout(r, 150))
  const recursos = getMockData(codRef).map((r) =>
    r.id === id ? { ...r, seleccionada } : r
  )
  setMockData(codRef, recursos)
  return { id, seleccionada }
  // ── REAL ──
  // const response = await axiosClient.patch(
  //   `/productos/${codRef}/recursos/${id}/seleccion`,
  //   { seleccionada }
  // )
  // return response.data
}

/**
 * Helper: retorna cuántos recursos de un tipo tiene un producto.
 * Usado en ProductosTable para el estado del ícono (activo/opaco).
 */
export async function contarRecursos(codRef) {
  const recursos = await getRecursos(codRef)
  return {
    imagenes: recursos.filter((r) => r.tipo === 'imagen').length,
    pdfs: recursos.filter((r) => r.tipo === 'pdf').length,
  }
}