import axiosClient from './axiosClient'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/api$/, '')

function getMediaUrl(url) {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_BASE}/${url.replace(/^\/+/, '')}`
}

function conFotoUrl(guia) {
  if (!guia) return guia
  return { ...guia, foto_guia_path: getMediaUrl(guia.foto_guia_path) }
}

// ─── Transportadoras ─────────────────────────────────────────────────────────

export async function getTransportadoras() {
  const res = await axiosClient.get('/transportadoras')
  return res.data
}

export async function crearTransportadora(nombre) {
  const res = await axiosClient.post('/transportadoras', { nombre })
  return res.data
}

// ─── Guías — Listado ─────────────────────────────────────────────────────────

export async function getGuias(filtros = {}) {
  const params = new URLSearchParams()
  Object.entries(filtros).forEach(([k, v]) => { if (v) params.append(k, v) })
  const res = await axiosClient.get(`/guias?${params.toString()}`)
  return res.data.map(conFotoUrl)
}

// ─── Guías — Detalle ─────────────────────────────────────────────────────────

export async function getGuia(id) {
  const res = await axiosClient.get(`/guias/${id}`)
  return conFotoUrl(res.data)
}

// ─── Guías — Crear ───────────────────────────────────────────────────────────

export async function crearGuia(formData) {
  const res = await axiosClient.post('/guias', formData)
  return conFotoUrl(res.data)
}

// ─── Guías — Editar ──────────────────────────────────────────────────────────

export async function editarGuia(id, formData) {
  const res = await axiosClient.patch(`/guias/${id}`, formData)
  return conFotoUrl(res.data)
}

// ─── Guías — Cambiar estado ──────────────────────────────────────────────────

export async function cambiarEstadoGuia(id, estado, nota = '') {
  const res = await axiosClient.patch(`/guias/${id}/estado`, { estado, nota })
  return res.data
}

// ─── Métricas — calculadas en frontend desde getGuias ────────────────────────

export async function getMetricasGuias(params = {}) {
  const res = await axiosClient.get('/guias')
  return res.data
}

// ─── Consolidado exportable ───────────────────────────────────────────────────

export async function getConsolidado(filtros = {}) {
  const res = await axiosClient.get('/guias/consolidado', { params: filtros })
  return res.data
}