import { createContext, useReducer, useCallback } from 'react'

export const CotizacionDraftContext = createContext(null)

const IVA = 0.19

const initialState = {
  selectedProducts: [],    // [{ ...producto, cantidad: number, valor_web: number }]
  clienteDraft: null,
  notas: '',
  observacionesPdf: '',
  condicionesComerciales: '',
  // ── Edición ──────────────────────────────────────────────────────────────
  editandoId:           null,   // id numérico de la cotización en edición
  editandoConsecutivo:  null,   // ej. "COT-2024-0042" — para mostrar en UI
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

    // ── Edición de precio por producto ───────────────────────────────────
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

    case 'CLEAR_DRAFT':
      return { ...initialState }

    // ── Carga una cotización existente para editar ────────────────────────
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
      }
    }

    default:
      return state
  }
}

export function CotizacionDraftProvider({ children }) {
  const [state, dispatch] = useReducer(draftReducer, initialState)

  const addProduct = useCallback((producto) => {
    dispatch({ type: 'ADD_PRODUCT', payload: producto })
  }, [])

  const removeProduct = useCallback((codRef) => {
    dispatch({ type: 'REMOVE_PRODUCT', payload: codRef })
  }, [])

  const updateQuantity = useCallback((codRef, cantidad) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { codRef, cantidad } })
  }, [])

  const updatePrice = useCallback((codRef, precio) => {
    dispatch({ type: 'UPDATE_PRICE', payload: { codRef, precio } })
  }, [])

  const setClienteDraft = useCallback((cliente) => {
    dispatch({ type: 'SET_CLIENTE_DRAFT', payload: cliente })
  }, [])

  const setNotas = useCallback((val) => {
    dispatch({ type: 'SET_NOTAS', payload: val })
  }, [])

  const setObservacionesPdf = useCallback((val) => {
    dispatch({ type: 'SET_OBSERVACIONES_PDF', payload: val })
  }, [])

  const setCondicionesComerciales = useCallback((val) => {
    dispatch({ type: 'SET_CONDICIONES', payload: val })
  }, [])

  const clearDraft = useCallback(() => {
    dispatch({ type: 'CLEAR_DRAFT' })
  }, [])

  const loadFromHistorial = useCallback((cotizacion) => {
    dispatch({ type: 'LOAD_FROM_HISTORIAL', payload: cotizacion })
  }, [])

  const getSubtotal = useCallback(() => {
    return state.selectedProducts.reduce(
      (acc, p) => acc + (p.valor_web || 0) * p.cantidad,
      0
    )
  }, [state.selectedProducts])

  const getIva = useCallback(() => {
    return getSubtotal() * IVA
  }, [getSubtotal])

  const getTotal = useCallback(() => {
    return getSubtotal() + getIva()
  }, [getSubtotal, getIva])

  const getTotalItems = useCallback(() => {
    return state.selectedProducts.reduce((acc, p) => acc + p.cantidad, 0)
  }, [state.selectedProducts])

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
    addProduct,
    removeProduct,
    updateQuantity,
    updatePrice,
    setClienteDraft,
    setNotas,
    setObservacionesPdf,
    setCondicionesComerciales,
    clearDraft,
    loadFromHistorial,
    getSubtotal,
    getIva,
    getTotal,
    getTotalItems,
    isProductoAgregado,
  }

  return (
    <CotizacionDraftContext.Provider value={value}>
      {children}
    </CotizacionDraftContext.Provider>
  )
}