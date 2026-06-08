import axiosClient from './axiosClient'

// ─── FLAG: cambiar a false cuando Jair tenga los endpoints ───────────────────
const USE_MOCK = true

// ─── Mock data ───────────────────────────────────────────────────────────────
let _mockGuias = [
  {
    id: 1,
    cotizacion_id: 101,
    cotizacion_consecutivo: 'COT-2024-0041',
    transportadora: 'Coordinadora',
    numero_guia: 'CRA-2024-881234',
    fecha_despacho: '2024-06-01',
    destinatario: 'Carlos Pérez',
    direccion_destino: 'Cra 15 # 80-20',
    ciudad_destino: 'Bogotá',
    telefono_destinatario: '3101234567',
    unidades: 3,
    peso_kg: 12.5,
    valor_declarado: 450000,
    valor_recaudo: 0,
    costo_flete: 18000,
    referencia_interna: 'REF-001',
    observaciones: 'Entregar en portería',
    foto_guia_path: null,
    estado: 'entregada',
    created_at: '2024-06-01T10:00:00',
    updated_at: '2024-06-03T15:00:00',
  },
  {
    id: 2,
    cotizacion_id: 102,
    cotizacion_consecutivo: 'COT-2024-0045',
    transportadora: 'Interrapidísimo',
    numero_guia: 'INT-2024-554321',
    fecha_despacho: '2024-06-05',
    destinatario: 'Ferretería El Tornillo',
    direccion_destino: 'Cl 50 # 20-10',
    ciudad_destino: 'Medellín',
    telefono_destinatario: '3209876543',
    unidades: 1,
    peso_kg: 4.0,
    valor_declarado: 120000,
    valor_recaudo: 120000,
    costo_flete: 12500,
    referencia_interna: '',
    observaciones: '',
    foto_guia_path: null,
    estado: 'en_transito',
    created_at: '2024-06-05T08:30:00',
    updated_at: '2024-06-05T08:30:00',
  },
  {
    id: 3,
    cotizacion_id: 103,
    cotizacion_consecutivo: 'COT-2024-0048',
    transportadora: 'Envia',
    numero_guia: 'ENV-2024-112233',
    fecha_despacho: '2024-06-10',
    destinatario: 'Distribuidora Norte',
    direccion_destino: 'Av 30 # 15-40',
    ciudad_destino: 'Barranquilla',
    telefono_destinatario: '3155551234',
    unidades: 5,
    peso_kg: 22.0,
    valor_declarado: 980000,
    valor_recaudo: 0,
    costo_flete: 35000,
    referencia_interna: 'REF-003',
    observaciones: 'Fragil',
    foto_guia_path: null,
    estado: 'despachada',
    created_at: '2024-06-10T09:00:00',
    updated_at: '2024-06-10T09:00:00',
  },
  {
    id: 4,
    cotizacion_id: 104,
    cotizacion_consecutivo: 'COT-2024-0050',
    transportadora: 'Servientrega',
    numero_guia: 'SRV-2024-998877',
    fecha_despacho: '2024-06-12',
    destinatario: 'Construcciones Ramírez',
    direccion_destino: 'Cll 9 # 5-10',
    ciudad_destino: 'Cali',
    telefono_destinatario: '3173334455',
    unidades: 2,
    peso_kg: 8.0,
    valor_declarado: 320000,
    valor_recaudo: 0,
    costo_flete: 22000,
    referencia_interna: '',
    observaciones: '',
    foto_guia_path: null,
    estado: 'generada',
    created_at: '2024-06-12T11:00:00',
    updated_at: '2024-06-12T11:00:00',
  },
  {
    id: 5,
    cotizacion_id: 105,
    cotizacion_consecutivo: 'COT-2024-0052',
    transportadora: 'TCC',
    numero_guia: 'TCC-2024-776655',
    fecha_despacho: '2024-06-14',
    destinatario: 'Electro Sur',
    direccion_destino: 'Kr 8 # 22-30',
    ciudad_destino: 'Pasto',
    telefono_destinatario: '3181112233',
    unidades: 4,
    peso_kg: 15.0,
    valor_declarado: 560000,
    valor_recaudo: 560000,
    costo_flete: 28000,
    referencia_interna: 'REF-005',
    observaciones: '',
    foto_guia_path: null,
    estado: 'novedad',
    created_at: '2024-06-14T14:00:00',
    updated_at: '2024-06-15T10:00:00',
  },
]

let _mockHistorial = {
  1: [{ id: 1, guia_id: 1, estado: 'generada',   nota: '',                  created_at: '2024-06-01T10:00:00' },
      { id: 2, guia_id: 1, estado: 'despachada',  nota: 'Recogida a tiempo', created_at: '2024-06-01T16:00:00' },
      { id: 3, guia_id: 1, estado: 'en_transito', nota: '',                  created_at: '2024-06-02T08:00:00' },
      { id: 4, guia_id: 1, estado: 'entregada',   nota: 'Entregado al portero', created_at: '2024-06-03T15:00:00' }],
  2: [{ id: 5, guia_id: 2, estado: 'generada',   nota: '', created_at: '2024-06-05T08:30:00' },
      { id: 6, guia_id: 2, estado: 'despachada',  nota: '', created_at: '2024-06-05T12:00:00' },
      { id: 7, guia_id: 2, estado: 'en_transito', nota: '', created_at: '2024-06-06T07:00:00' }],
  3: [{ id: 8,  guia_id: 3, estado: 'generada',  nota: '', created_at: '2024-06-10T09:00:00' },
      { id: 9,  guia_id: 3, estado: 'despachada', nota: '', created_at: '2024-06-10T14:00:00' }],
  4: [{ id: 10, guia_id: 4, estado: 'generada',  nota: '', created_at: '2024-06-12T11:00:00' }],
  5: [{ id: 11, guia_id: 5, estado: 'generada',  nota: '', created_at: '2024-06-14T14:00:00' },
      { id: 12, guia_id: 5, estado: 'despachada', nota: '', created_at: '2024-06-14T18:00:00' },
      { id: 13, guia_id: 5, estado: 'novedad',    nota: 'Dirección incorrecta', created_at: '2024-06-15T10:00:00' }],
}

let _mockTransportadoras = [
  { id: 1, nombre: 'Coordinadora',     activa: true },
  { id: 2, nombre: 'Interrapidísimo',  activa: true },
  { id: 3, nombre: 'Encoexpres',       activa: true },
  { id: 4, nombre: 'Envia',            activa: true },
  { id: 5, nombre: 'Servientrega',     activa: true },
  { id: 6, nombre: 'TCC',              activa: true },
]

let _mockIdCounter = 6

function mockDelay(ms = 300) {
  return new Promise((r) => setTimeout(r, ms))
}

// ─── Transportadoras ─────────────────────────────────────────────────────────

export async function getTransportadoras() {
  if (USE_MOCK) {
    await mockDelay()
    return [..._mockTransportadoras]
  }
  const res = await axiosClient.get('/transportadoras')
  return res.data
}

export async function crearTransportadora(nombre) {
  if (USE_MOCK) {
    await mockDelay()
    const nueva = { id: _mockTransportadoras.length + 1, nombre, activa: true }
    _mockTransportadoras.push(nueva)
    return nueva
  }
  const res = await axiosClient.post('/transportadoras', { nombre })
  return res.data
}

// ─── Guías — Listado ─────────────────────────────────────────────────────────

/**
 * filtros: { estado, transportadora, fecha_inicio, fecha_fin, buscar }
 */
export async function getGuias(filtros = {}) {
  if (USE_MOCK) {
    await mockDelay()
    let lista = [..._mockGuias]

    if (filtros.estado)         lista = lista.filter((g) => g.estado === filtros.estado)
    if (filtros.transportadora) lista = lista.filter((g) => g.transportadora === filtros.transportadora)
    if (filtros.fecha_inicio)   lista = lista.filter((g) => g.fecha_despacho >= filtros.fecha_inicio)
    if (filtros.fecha_fin)      lista = lista.filter((g) => g.fecha_despacho <= filtros.fecha_fin)
    if (filtros.buscar) {
      const q = filtros.buscar.toLowerCase()
      lista = lista.filter((g) =>
        g.numero_guia.toLowerCase().includes(q) ||
        g.destinatario.toLowerCase().includes(q) ||
        g.ciudad_destino.toLowerCase().includes(q) ||
        (g.cotizacion_consecutivo || '').toLowerCase().includes(q)
      )
    }

    return lista
  }

  const params = new URLSearchParams()
  Object.entries(filtros).forEach(([k, v]) => { if (v) params.append(k, v) })
  const res = await axiosClient.get(`/guias?${params.toString()}`)
  return res.data
}

// ─── Guías — Detalle ─────────────────────────────────────────────────────────

export async function getGuia(id) {
  if (USE_MOCK) {
    await mockDelay()
    const guia = _mockGuias.find((g) => g.id === id)
    if (!guia) throw new Error('Guía no encontrada')
    return { ...guia, historial: _mockHistorial[id] || [] }
  }
  const res = await axiosClient.get(`/guias/${id}`)
  return res.data
}

// ─── Guías — Crear ───────────────────────────────────────────────────────────

/**
 * data: FormData con campos + foto_guia (File, opcional)
 */
export async function crearGuia(formData) {
  if (USE_MOCK) {
    await mockDelay(500)
    _mockIdCounter++
    const nueva = {
      id: _mockIdCounter,
      cotizacion_id:           Number(formData.get('cotizacion_id')) || null,
      cotizacion_consecutivo:  formData.get('cotizacion_consecutivo') || '',
      transportadora:          formData.get('transportadora') || '',
      numero_guia:             formData.get('numero_guia') || '',
      fecha_despacho:          formData.get('fecha_despacho') || '',
      destinatario:            formData.get('destinatario') || '',
      direccion_destino:       formData.get('direccion_destino') || '',
      ciudad_destino:          formData.get('ciudad_destino') || '',
      telefono_destinatario:   formData.get('telefono_destinatario') || '',
      unidades:                Number(formData.get('unidades')) || null,
      peso_kg:                 Number(formData.get('peso_kg')) || null,
      valor_declarado:         Number(formData.get('valor_declarado')) || null,
      valor_recaudo:           Number(formData.get('valor_recaudo')) || null,
      costo_flete:             Number(formData.get('costo_flete')) || null,
      referencia_interna:      formData.get('referencia_interna') || '',
      observaciones:           formData.get('observaciones') || '',
      foto_guia_path:          formData.get('foto_guia') ? 'mock/foto_guia.jpg' : null,
      estado:                  'generada',
      created_at:              new Date().toISOString(),
      updated_at:              new Date().toISOString(),
    }
    _mockGuias.unshift(nueva)
    _mockHistorial[nueva.id] = [{
      id: Date.now(),
      guia_id:    nueva.id,
      estado:     'generada',
      nota:       '',
      created_at: nueva.created_at,
    }]
    return nueva
  }
  // Real: axiosClient detecta FormData y omite Content-Type: application/json
  const res = await axiosClient.post('/guias', formData)
  return res.data
}

// ─── Guías — Editar ──────────────────────────────────────────────────────────

export async function editarGuia(id, formData) {
  if (USE_MOCK) {
    await mockDelay(500)
    const idx = _mockGuias.findIndex((g) => g.id === id)
    if (idx === -1) throw new Error('Guía no encontrada')
    const actualizada = {
      ..._mockGuias[idx],
      transportadora:        formData.get('transportadora') || _mockGuias[idx].transportadora,
      numero_guia:           formData.get('numero_guia') || _mockGuias[idx].numero_guia,
      fecha_despacho:        formData.get('fecha_despacho') || _mockGuias[idx].fecha_despacho,
      destinatario:          formData.get('destinatario') || _mockGuias[idx].destinatario,
      direccion_destino:     formData.get('direccion_destino') || _mockGuias[idx].direccion_destino,
      ciudad_destino:        formData.get('ciudad_destino') || _mockGuias[idx].ciudad_destino,
      telefono_destinatario: formData.get('telefono_destinatario') || _mockGuias[idx].telefono_destinatario,
      unidades:              Number(formData.get('unidades')) || _mockGuias[idx].unidades,
      peso_kg:               Number(formData.get('peso_kg')) || _mockGuias[idx].peso_kg,
      valor_declarado:       Number(formData.get('valor_declarado')) || _mockGuias[idx].valor_declarado,
      valor_recaudo:         Number(formData.get('valor_recaudo')) || _mockGuias[idx].valor_recaudo,
      costo_flete:           Number(formData.get('costo_flete')) || _mockGuias[idx].costo_flete,
      referencia_interna:    formData.get('referencia_interna') ?? _mockGuias[idx].referencia_interna,
      observaciones:         formData.get('observaciones') ?? _mockGuias[idx].observaciones,
      updated_at:            new Date().toISOString(),
    }
    if (formData.get('foto_guia')) actualizada.foto_guia_path = 'mock/foto_guia_updated.jpg'
    _mockGuias[idx] = actualizada
    return actualizada
  }
  const res = await axiosClient.patch(`/guias/${id}`, formData)
  return res.data
}

// ─── Guías — Cambiar estado ──────────────────────────────────────────────────

export async function cambiarEstadoGuia(id, estado, nota = '') {
  if (USE_MOCK) {
    await mockDelay()
    const idx = _mockGuias.findIndex((g) => g.id === id)
    if (idx === -1) throw new Error('Guía no encontrada')
    _mockGuias[idx] = { ..._mockGuias[idx], estado, updated_at: new Date().toISOString() }
    const registro = {
      id:         Date.now(),
      guia_id:    id,
      estado,
      nota,
      created_at: new Date().toISOString(),
    }
    if (!_mockHistorial[id]) _mockHistorial[id] = []
    _mockHistorial[id].push(registro)
    return _mockGuias[idx]
  }
  const res = await axiosClient.patch(`/guias/${id}/estado`, { estado, nota })
  return res.data
}

// ─── Métricas (solo admin) ───────────────────────────────────────────────────

/**
 * params: { mes, anio }  (mes: 1-12)
 * Retorna: { total_mes, total_mes_anterior, total_anio, por_estado, top_transportadoras }
 */
export async function getMetricasGuias(params = {}) {
  if (USE_MOCK) {
    await mockDelay()
    return {
      total_mes:           115500,
      total_mes_anterior:  98000,
      total_anio:          742000,
      cantidad_mes:        12,
      por_estado: {
        generada:    2,
        despachada:  3,
        en_transito: 2,
        entregada:   4,
        novedad:     1,
      },
      top_transportadoras: [
        { nombre: 'Coordinadora',    total: 54000, cantidad: 4 },
        { nombre: 'Interrapidísimo', total: 31500, cantidad: 3 },
        { nombre: 'Envia',           total: 30000, cantidad: 2 },
      ],
    }
  }
  const res = await axiosClient.get('/guias/metricas', { params })
  return res.data
}

// ─── Consolidado exportable (admin) ─────────────────────────────────────────

/**
 * filtros: { mes, anio, transportadora, estado }
 * Retorna array plano listo para CSV/PDF
 */
export async function getConsolidado(filtros = {}) {
  if (USE_MOCK) {
    await mockDelay()
    // Reutiliza el mock de guías con los datos que necesita el consolidado
    return _mockGuias.map((g) => ({
      numero_guia:          g.numero_guia,
      fecha_despacho:       g.fecha_despacho,
      cotizacion:           g.cotizacion_consecutivo,
      transportadora:       g.transportadora,
      destinatario:         g.destinatario,
      ciudad_destino:       g.ciudad_destino,
      unidades:             g.unidades,
      peso_kg:              g.peso_kg,
      valor_declarado:      g.valor_declarado,
      valor_recaudo:        g.valor_recaudo,
      costo_flete:          g.costo_flete,
      estado:               g.estado,
      referencia_interna:   g.referencia_interna,
    }))
  }
  const res = await axiosClient.get('/guias/consolidado', { params: filtros })
  return res.data
}