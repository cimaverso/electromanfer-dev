import axiosClient from './axiosClient'

// Convierte un timestamp UTC de la DB a fecha Colombia (YYYY-MM-DD)
const fechaColombia = (isoString) => {
  if (!isoString) return ''
  const fecha = new Date(isoString.includes('Z') ? isoString : isoString + 'Z')
  return fecha.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
}

export async function getMetricas() {
  // Llamada directa sin pasar por el hook de cotizaciones
  const response = await axiosClient.get('/cotizaciones/')
  const cotizaciones = response.data

  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
  const [anio, mes] = hoy.split('-').map(Number)
  const primerDiaMes = `${anio}-${String(mes).padStart(2, '0')}-01`

  const cotizaciones_hoy = cotizaciones.filter(
    (c) => fechaColombia(c.created_at) === hoy
  ).length

  const cotizaciones_mes = cotizaciones.filter(
    (c) => fechaColombia(c.created_at) >= primerDiaMes
  ).length

  const cotizaciones_pendientes = cotizaciones.filter(
    (c) => c.estado === 'generada'
  ).length

  const monto_total_mes = cotizaciones
    .filter((c) => fechaColombia(c.created_at) >= primerDiaMes)
    .reduce((acc, c) => acc + (c.total || 0), 0)

  const cotizaciones_recientes = cotizaciones.slice(0, 5).map((c) => ({
    id:          c.id,
    consecutivo: c.consecutivo,
    cliente:     c.clientes?.nombre_razon_social || 'Sin cliente',
    total:       c.total,
    estado:      c.estado,
    fecha:       fechaColombia(c.created_at),
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