import axiosClient from './axiosClient'

/**
 * GET /dashboard/metricas
 * Retorna totales generales para el panel principal.
 *
 * Respuesta esperada del backend:
 * {
 *   cotizaciones_hoy: number,
 *   cotizaciones_mes: number,
 *   cotizaciones_pendientes: number,
 *   monto_total_mes: number,
 *   variacion_mes: number,        // porcentaje vs mes anterior (puede ser negativo)
 *   cotizaciones_recientes: [
 *     {
 *       id: number,
 *       consecutivo: string,
 *       cliente: string,
 *       total: number,
 *       estado: string,
 *       fecha: string
 *     }
 *   ]
 * }
 */
export async function getMetricas() {
  const response = await axiosClient.get('/dashboard/metricas')
  return response.data
}