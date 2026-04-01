import axiosClient from './axiosClient'

export async function buscarClientes(q = '') {
  if (!q || q.trim().length < 2) return []
  const { data } = await axiosClient.get('/clientes/', { params: { q } })
  return data
}