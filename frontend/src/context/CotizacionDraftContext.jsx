import { createContext, useReducer, useCallback } from 'react'

export const CotizacionDraftContext = createContext(null)

const IVA = 0.19

const initialState = {
  selectedProducts: [],    // [{ ...producto, cantidad: number }]
  clienteDraft: null,      // objeto con datos del cliente
  notas: '',
  observacionesPdf: '',
  condicionesComerciales: '',
}

function draftReducer(state, action) {
  switch (action.type) {

    case 'ADD_PRODUCT': {
      const existe = state.selectedProducts.find(
        (p) => p.cod_ref === action.payload.cod_ref
      )
      if (existe) {
        // Si ya existe, incrementa cantidad en 1
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
      const cantidad = Math.max(1, Number(action.payload.cantidad))
      return {
        ...state,
        selectedProducts: state.selectedProducts.map((p) =>
          p.cod_ref === action.payload.cod_ref
            ? { ...p, cantidad }
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

  // ─── Cálculos preliminares (nivel 1 — solo para previsualización) ───────────
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
    selectedProducts: state.selectedProducts,
    clienteDraft: state.clienteDraft,
    notas: state.notas,
    observacionesPdf: state.observacionesPdf,
    condicionesComerciales: state.condicionesComerciales,
    addProduct,
    removeProduct,
    updateQuantity,
    setClienteDraft,
    setNotas,
    setObservacionesPdf,
    setCondicionesComerciales,
    clearDraft,
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