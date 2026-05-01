import { createContext, useReducer, useCallback } from 'react'

export const CotizacionDraftContext = createContext(null)

const IVA = 0.19

const initialState = {
  selectedProducts: [],
  clienteDraft: null,
  notas: '',
  observacionesPdf: '',
  condicionesComerciales: '',
  editandoId:           null,
  editandoConsecutivo:  null,
  // { hiloId, remitente, emailRemitente, asunto } | null
  buzonHiloOrigen: null,
}

function draftReducer(state, action) {
  switch (action.type) {

    case 'ADD_PRODUCT': {
      const existe = state.selectedProducts.find(
        (p) => p.cod_ref === action.payload.cod_ref
      )
      if (existe) {
        return {
          ...state,
          selectedProducts: state.selectedProducts.map((p) =>
            p.cod_ref === action.payload.cod_ref
              ? { ...p, cantidad: p.cantidad + 1 }
              : p
          ),
        }
      }
      return {
        ...state,
        selectedProducts: [
          ...state.selectedProducts,
          { ...action.payload, cantidad: 1 },
        ],
      }
    }

    case 'REMOVE_PRODUCT':
      return {
        ...state,
        selectedProducts: state.selectedProducts.filter(
          (p) => p.cod_ref !== action.payload
        ),
      }

    case 'UPDATE_QUANTITY': {
      const cantidad = Math.max(1, parseInt(action.payload.cantidad, 10) || 1)
      return {
        ...state,
        selectedProducts: state.selectedProducts.map((p) =>
          p.cod_ref === action.payload.codRef
            ? { ...p, cantidad }
            : p
        ),
      }
    }

    case 'UPDATE_PRICE': {
      const precio = Math.max(0, parseFloat(action.payload.precio) || 0)
      return {
        ...state,
        selectedProducts: state.selectedProducts.map((p) =>
          p.cod_ref === action.payload.codRef
            ? { ...p, valor_web: precio }
            : p
        ),
      }
    }

    case 'SET_CLIENTE_DRAFT':
      return { ...state, clienteDraft: action.payload }

    case 'SET_NOTAS':
      return { ...state, notas: action.payload }

    case 'SET_OBSERVACIONES_PDF':
      return { ...state, observacionesPdf: action.payload }

    case 'SET_CONDICIONES':
      return { ...state, condicionesComerciales: action.payload }

    case 'SET_BUZON_ORIGEN':
      return { ...state, buzonHiloOrigen: action.payload }

    case 'CLEAR_BUZON_ORIGEN':
      return { ...state, buzonHiloOrigen: null }

    case 'CLEAR_DRAFT':
      return { ...initialState }

    case 'LOAD_FROM_HISTORIAL': {
      const cot = action.payload

      const selectedProducts = (cot.cotizaciones_items || []).map((item) => ({
        cod_ref:   item.cod_ref,
        nom_ref:   item.nom_ref,
        cod_tip:   item.cod_tip   || null,
        nom_tip:   item.nom_tip   || null,
        valor_web: item.valor_web ?? item.precio_unitario ?? 0,
        cantidad:  item.cantidad  ?? 1,
      }))

      const clienteDraft = cot.clientes
        ? {
            nombre_razon_social: cot.clientes.nombre_razon_social || '',
            nit_cedula:          cot.clientes.nit_cedula          || '',
            email:               cot.clientes.email               || '',
            telefono:            cot.clientes.telefono            || '',
            ciudad:              cot.clientes.ciudad              || '',
            direccion:           cot.clientes.direccion           || '',
          }
        : null

      return {
        ...state,
        selectedProducts,
        clienteDraft,
        notas:                  cot.notas                    || '',
        observacionesPdf:       cot.observaciones_pdf        || '',
        condicionesComerciales: cot.condiciones_comerciales  || '',
        editandoId:             cot.id,
        editandoConsecutivo:    cot.consecutivo              || null,
        // buzonHiloOrigen se preserva: si el asesor edita desde un hilo, el contexto no se pierde
      }
    }

    default:
      return state
  }
}

export function CotizacionDraftProvider({ children }) {
  const [state, dispatch] = useReducer(draftReducer, initialState)

  const addProduct        = useCallback((p)   => dispatch({ type: 'ADD_PRODUCT',       payload: p }),   [])
  const removeProduct     = useCallback((ref) => dispatch({ type: 'REMOVE_PRODUCT',    payload: ref }), [])
  const updateQuantity    = useCallback((ref, cantidad) => dispatch({ type: 'UPDATE_QUANTITY', payload: { codRef: ref, cantidad } }), [])
  const updatePrice       = useCallback((ref, precio)   => dispatch({ type: 'UPDATE_PRICE',    payload: { codRef: ref, precio } }),   [])
  const setClienteDraft   = useCallback((v)   => dispatch({ type: 'SET_CLIENTE_DRAFT',  payload: v }), [])
  const setNotas          = useCallback((v)   => dispatch({ type: 'SET_NOTAS',          payload: v }), [])
  const setObservacionesPdf = useCallback((v) => dispatch({ type: 'SET_OBSERVACIONES_PDF', payload: v }), [])
  const setCondicionesComerciales = useCallback((v) => dispatch({ type: 'SET_CONDICIONES', payload: v }), [])
  const clearDraft        = useCallback(()    => dispatch({ type: 'CLEAR_DRAFT' }), [])
  const loadFromHistorial = useCallback((cot) => dispatch({ type: 'LOAD_FROM_HISTORIAL', payload: cot }), [])
  const setBuzonOrigen    = useCallback((hilo) => dispatch({ type: 'SET_BUZON_ORIGEN',  payload: hilo }), [])
  const clearBuzonOrigen  = useCallback(()    => dispatch({ type: 'CLEAR_BUZON_ORIGEN' }), [])

  const getSubtotal = useCallback(() =>
    state.selectedProducts.reduce((acc, p) => acc + (p.valor_web || 0) * p.cantidad, 0),
    [state.selectedProducts]
  )
  const getIva   = useCallback(() => getSubtotal() * IVA, [getSubtotal])
  const getTotal = useCallback(() => getSubtotal() + getIva(), [getSubtotal, getIva])
  const getTotalItems = useCallback(() =>
    state.selectedProducts.reduce((acc, p) => acc + p.cantidad, 0),
    [state.selectedProducts]
  )
  const isProductoAgregado = useCallback(
    (codRef) => state.selectedProducts.some((p) => p.cod_ref === codRef),
    [state.selectedProducts]
  )

  const value = {
    selectedProducts:       state.selectedProducts,
    clienteDraft:           state.clienteDraft,
    notas:                  state.notas,
    observacionesPdf:       state.observacionesPdf,
    condicionesComerciales: state.condicionesComerciales,
    editandoId:             state.editandoId,
    editandoConsecutivo:    state.editandoConsecutivo,
    buzonHiloOrigen:        state.buzonHiloOrigen,
    addProduct, removeProduct, updateQuantity, updatePrice,
    setClienteDraft, setNotas, setObservacionesPdf, setCondicionesComerciales,
    clearDraft, loadFromHistorial, setBuzonOrigen, clearBuzonOrigen,
    getSubtotal, getIva, getTotal, getTotalItems, isProductoAgregado,
  }

  return (
    <CotizacionDraftContext.Provider value={value}>
      {children}
    </CotizacionDraftContext.Provider>
  )
}