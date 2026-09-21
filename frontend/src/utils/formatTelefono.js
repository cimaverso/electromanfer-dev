// Formatea un numero de WhatsApp: 573046829374 -> +57 304 682 9374
export function formatTelefono(valor = '') {
  const digitos = String(valor ?? '').replace(/\D/g, '')
  if (!digitos) return String(valor ?? '')
  if (digitos.length === 12 && digitos.startsWith('57')) {
    const n = digitos.slice(2)
    return `+57 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`
  }
  // Otros paises: +CC resto agrupado de a 3-4
  if (digitos.length > 10) {
    const cc = digitos.slice(0, digitos.length - 10)
    const n = digitos.slice(-10)
    return `+${cc} ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`
  }
  return `+${digitos}`
}

// Un contacto sin nombre guardado llega con el numero como nombre
export function sinNombreGuardado(nombre = '') {
  return !nombre || nombre === 'Sin nombre' || /^\+?[\d\s]+$/.test(nombre)
}

// Nombre a mostrar: el guardado, o el telefono formateado
export function nombreVisible(chat) {
  return sinNombreGuardado(chat.nombre) ? formatTelefono(chat.telefono || chat.nombre) : chat.nombre
}
