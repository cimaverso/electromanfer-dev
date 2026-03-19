import axiosClient from './axiosClient'

// ── MOCK TEMPORAL — eliminar cuando FastAPI esté listo ──
const MOCK_PRODUCTOS = [
  {
    cod_ref: 'TM-2P-20A',
    nom_ref: 'Termomagnético Bipolar 20A',
    cod_tip: 'TM',
    nom_tip: 'Termomagnético',
    saldo: 45,
    valor_web: 38500,
    imagen_url: 'https://placehold.co/300x300/1B2130/8CA653?text=TM-2P-20A',
    ficha_tecnica_url: null,
  },
  {
    cod_ref: 'TM-2P-32A',
    nom_ref: 'Termomagnético Bipolar 32A',
    cod_tip: 'TM',
    nom_tip: 'Termomagnético',
    saldo: 28,
    valor_web: 52000,
    imagen_url: 'https://placehold.co/300x300/1B2130/8CA653?text=TM-2P-32A',
    ficha_tecnica_url: null,
  },
  {
    cod_ref: 'CAB-THW-12',
    nom_ref: 'Cable THW calibre 12 AWG negro x metro',
    cod_tip: 'CAB',
    nom_tip: 'Cable',
    saldo: 320,
    valor_web: 4200,
    imagen_url: 'https://placehold.co/300x300/1B2130/BCBF5E?text=CAB-THW-12',
    ficha_tecnica_url: null,
  },
  {
    cod_ref: 'CAB-THW-10',
    nom_ref: 'Cable THW calibre 10 AWG rojo x metro',
    cod_tip: 'CAB',
    nom_tip: 'Cable',
    saldo: 180,
    valor_web: 6800,
    imagen_url: 'https://placehold.co/300x300/1B2130/BCBF5E?text=CAB-THW-10',
    ficha_tecnica_url: null,
  },
  {
    cod_ref: 'LUM-LED-50W',
    nom_ref: 'Luminaria LED industrial 50W IP65',
    cod_tip: 'LUM',
    nom_tip: 'Luminaria',
    saldo: 12,
    valor_web: 185000,
    imagen_url: 'https://placehold.co/300x300/1B2130/F2CD5C?text=LUM-LED-50W',
    ficha_tecnica_url: null,
  },
  {
    cod_ref: 'LUM-LED-100W',
    nom_ref: 'Luminaria LED industrial 100W IP65',
    cod_tip: 'LUM',
    nom_tip: 'Luminaria',
    saldo: 0,
    valor_web: 320000,
    imagen_url: 'https://placehold.co/300x300/1B2130/F2CD5C?text=LUM-LED-100W',
    ficha_tecnica_url: null,
  },
  {
    cod_ref: 'TAC-3F-60A',
    nom_ref: 'Tablero de distribución trifásico 60A 12 circuitos',
    cod_tip: 'TAC',
    nom_tip: 'Tablero',
    saldo: 8,
    valor_web: 425000,
    imagen_url: 'https://placehold.co/300x300/1B2130/8CA653?text=TAC-3F-60A',
    ficha_tecnica_url: null,
  },
  {
    cod_ref: 'CON-3F-40A',
    nom_ref: 'Contactor trifásico 40A 220V bobina',
    cod_tip: 'CON',
    nom_tip: 'Contactor',
    saldo: 15,
    valor_web: 98000,
    imagen_url: 'https://placehold.co/300x300/1B2130/BCBF5E?text=CON-3F-40A',
    ficha_tecnica_url: null,
  },
  {
    cod_ref: 'TUB-EMT-1/2',
    nom_ref: 'Tubo conduit EMT 1/2 pulgada x 3 metros',
    cod_tip: 'TUB',
    nom_tip: 'Tubería',
    saldo: 95,
    valor_web: 12500,
    imagen_url: null,
    ficha_tecnica_url: null,
  },
  {
    cod_ref: 'TUB-EMT-3/4',
    nom_ref: 'Tubo conduit EMT 3/4 pulgada x 3 metros',
    cod_tip: 'TUB',
    nom_tip: 'Tubería',
    saldo: 60,
    valor_web: 18000,
    imagen_url: null,
    ficha_tecnica_url: null,
  },
  {
    cod_ref: 'AUT-1P-16A',
    nom_ref: 'Automático enchufable monopolar 16A',
    cod_tip: 'AUT',
    nom_tip: 'Automático',
    saldo: 200,
    valor_web: 15500,
    imagen_url: 'https://placehold.co/300x300/1B2130/8CA653?text=AUT-1P-16A',
    ficha_tecnica_url: null,
  },
  {
    cod_ref: 'CAJ-PVC-4X4',
    nom_ref: 'Caja de paso PVC 4x4 pulgadas',
    cod_tip: 'CAJ',
    nom_tip: 'Caja',
    saldo: 150,
    valor_web: 3800,
    imagen_url: null,
    ficha_tecnica_url: null,
  },
]

function filtrarMock(query) {
  const q = query.toLowerCase().trim()
  return MOCK_PRODUCTOS.filter(
    (p) =>
      p.nom_ref.toLowerCase().includes(q) ||
      p.cod_ref.toLowerCase().includes(q) ||
      p.nom_tip.toLowerCase().includes(q)
  )
}
// ── FIN MOCK ──

/**
 * GET /productos/buscar?q=texto
 */
export async function buscarProductos(query) {
  // ── MOCK TEMPORAL ──
  await new Promise((r) => setTimeout(r, 600))
  const resultados = filtrarMock(query)
  return resultados
  // ── Cuando FastAPI esté listo, reemplazar con: ──
  // const response = await axiosClient.get('/productos/buscar', {
  //   params: { q: query },
  // })
  // return response.data
}

/**
 * GET /productos/:cod_ref
 */
export async function getProductoDetalle(codRef) {
  // ── MOCK TEMPORAL ──
  await new Promise((r) => setTimeout(r, 400))
  const producto = MOCK_PRODUCTOS.find((p) => p.cod_ref === codRef)
  if (!producto) throw new Error('Producto no encontrado')
  return {
    ...producto,
    multimedia: producto.imagen_url
      ? [{ tipo: 'imagen', url: producto.imagen_url, principal: true }]
      : [],
  }
  // ── Cuando FastAPI esté listo, reemplazar con: ──
  // const response = await axiosClient.get(`/productos/${codRef}`)
  // return response.data
}