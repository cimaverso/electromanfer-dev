import axiosClient from './axiosClient'
import { listarCotizaciones } from './cotizacionesApi'

export async function getMetricas() {
  const cotizaciones = await listarCotizaciones()

  const hoy = new Date().toISOString().split('T')[0]
  const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)

  const cotizaciones_hoy = cotizaciones.filter(
    (c) => c.created_at?.startsWith(hoy)
  ).length

  const cotizaciones_mes = cotizaciones.filter(
    (c) => new Date(c.created_at) >= primerDiaMes
  ).length

  const cotizaciones_pendientes = cotizaciones.filter(
    (c) => c.estado === 'generada'
  ).length

  const monto_total_mes = cotizaciones
    .filter((c) => new Date(c.created_at) >= primerDiaMes)
    .reduce((acc, c) => acc + (c.total || 0), 0)

  const cotizaciones_recientes = cotizaciones.slice(0, 5).map((c) => ({
    id:          c.id,
    consecutivo: c.consecutivo,
    cliente:     c.cliente?.nombre_razon_social || 'Sin cliente',
    total:       c.total,
    estado:      c.estado,
    fecha:       c.created_at?.split('T')[0],
  }))

  return {
    cotizaciones_hoy,
    cotizaciones_mes,
    cotizaciones_pendientes,
    monto_total_mes,
    variacion_mes: 0,
    cotizaciones_recientes,
  }
}