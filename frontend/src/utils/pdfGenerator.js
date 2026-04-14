import jsPDF from 'jspdf'


const API_BASE = ''

function formatCOP(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value || 0)
}

function formatFecha(isoString) {
  return new Date(isoString).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

async function cargarImagenBase64(url) {
  if (!url) return null
  if (url.startsWith('data:')) return url

  const urlAbsoluta = url.startsWith('http')
    ? url
    : url.startsWith('/media')
      ? `${API_BASE}${url}`
      : `${window.location.origin}${url}`

  try {
    const response = await fetch(urlAbsoluta, { mode: 'cors' })
    if (!response.ok) return null
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}
function dibujarPlaceholder(doc, x, y, grisClaro, gris) {
  doc.setFillColor(...grisClaro)
  doc.rect(x, y + 1, 12, 12, 'F')
  doc.setTextColor(...gris)
  doc.setFontSize(5)
  doc.setFont('helvetica', 'normal')
  doc.text('SIN\nIMG', x + 1.5, y + 6)
}

/**
 * Genera el PDF de cotización.
 * @param {object}   cotizacion
 * @param {string[]} imagenes    URLs imágenes producto (por ahora vacío hasta backend)
 * @param {string[]} pdfsUrls    URLs fichas PDF
 * @param {boolean}  descargar   true=descarga | false=retorna blob URL
 */
export async function generarPdfCotizacion(
  cotizacion,
  imagenes = [],
  pdfsUrls = [],
  descargar = true,
  imagenesPorCodRef = {}
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const PAGE_W = 210
  const PAGE_H = 297
  const MARGEN = 14
  const ANCHO = PAGE_W - MARGEN * 2

  const VERDE = [140, 166, 83]
  const OSCURO = [30, 33, 48]
  const GRIS = [100, 110, 130]
  const GRIS_CLARO = [220, 225, 230]
  const BLANCO = [255, 255, 255]
  const AMARILLO = [255, 220, 50]

  const H_ENCABEZADO = 44   // altura imagen encabezado
  const H_FRANJA = 10   // franja número cotización / fecha
  const H_PIE = 57
  const Y_PIE = PAGE_H - H_PIE

  const items = cotizacion.cotizaciones_items || []

  // Carga encabezado y pie (imágenes de producto pendientes a backend)
  const [encabezadoB64, pieB64] = await Promise.all([
    cargarImagenBase64('/encabezado_cotizacion.png'),
    cargarImagenBase64('/pie_pagina_cotizacion.png'),
  ])

  // ── Helper: dibuja encabezado + franja + pie ──────────────────────────────
  const dibujarEncabezadoPie = (numeroCot, fecha) => {
    // Imagen encabezado
    if (encabezadoB64) {
      doc.addImage(encabezadoB64, 'PNG', 0, 0, PAGE_W, H_ENCABEZADO)
    } else {
      doc.setFillColor(...VERDE)
      doc.rect(0, 0, PAGE_W, H_ENCABEZADO, 'F')
      doc.setTextColor(...BLANCO)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('ELECTROMANFER LTDA.', MARGEN, 20)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('NIT. 800.250.956-1', MARGEN, 28)
    }

    // ── Franja número cotización y fecha (DEBAJO de la imagen) ──
    const yFranja = H_ENCABEZADO
    doc.setFillColor(245, 247, 250)
    doc.rect(0, yFranja, PAGE_W, H_FRANJA, 'F')
    doc.setDrawColor(...GRIS_CLARO)
    doc.line(0, yFranja + H_FRANJA, PAGE_W, yFranja + H_FRANJA)

    // Fecha izquierda
    doc.setTextColor(...GRIS)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(fecha, MARGEN, yFranja + 6.5)

    // Número cotización derecha en verde
    doc.setFillColor(...VERDE)
    const cotLabel = `COTIZACIÓN: ${numeroCot}`
    const cotW = doc.getTextWidth(cotLabel) + 8
    doc.roundedRect(PAGE_W - MARGEN - cotW, yFranja + 1.5, cotW, 7, 1, 1, 'F')
    doc.setTextColor(...BLANCO)
    doc.setFont('helvetica', 'bold')
    doc.text(cotLabel, PAGE_W - MARGEN - cotW / 2, yFranja + 6.5, { align: 'center' })

    // Imagen pie
    if (pieB64) {
      doc.addImage(pieB64, 'PNG', 0, Y_PIE, PAGE_W, H_PIE)
    } else {
      doc.setFillColor(...VERDE)
      doc.rect(0, Y_PIE, PAGE_W, H_PIE, 'F')
      doc.setTextColor(...BLANCO)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text(
        'ELECTROMANFER LTDA. · Calle 2 25A-55 Bogotá D.C. · ventas@electromanfer.com',
        PAGE_W / 2, Y_PIE + 10, { align: 'center' }
      )
    }
  }

  // ── Helper: cabecera tabla ────────────────────────────────────────────────
  const COL = {
    img: { x: MARGEN + 2 },
    item: { x: MARGEN + 16 },
    cant: { x: MARGEN + 26 },
    nom: { x: MARGEN + 38, w: 80 },
    precio: { x: MARGEN + 118 },
    sub: { x: MARGEN + 144 },
  }

  const dibujarCabeceraTabla = (yPos) => {
    doc.setFillColor(...OSCURO)
    doc.rect(MARGEN, yPos, ANCHO, 8, 'F')
    doc.setTextColor(...BLANCO)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text('IMG', COL.img.x, yPos + 5.5)
    doc.text('ITEM', COL.item.x, yPos + 5.5)
    doc.text('CANT', COL.cant.x, yPos + 5.5)
    doc.text('DESCRIPCION', COL.nom.x, yPos + 5.5)
    doc.text('V/UNIT.', COL.precio.x, yPos + 5.5)
    doc.text('V/TOTAL', COL.sub.x, yPos + 5.5)
    return yPos + 8
  }

  // ── Página 1 ──────────────────────────────────────────────────────────────
  const fecha = formatFecha(cotizacion.created_at || new Date().toISOString())
  const numeroCot = cotizacion.consecutivo

  dibujarEncabezadoPie(numeroCot, fecha)

  let y = H_ENCABEZADO + H_FRANJA + 6

  // ── Bloque cliente ────────────────────────────────────────────────────────
  const cliente = cotizacion.clientes || {}

  doc.setFillColor(245, 247, 250)
  doc.roundedRect(MARGEN, y, ANCHO, 34, 2, 2, 'F')
  doc.setDrawColor(...GRIS_CLARO)
  doc.roundedRect(MARGEN, y, ANCHO, 34, 2, 2, 'S')

  doc.setFillColor(...AMARILLO)
  doc.roundedRect(MARGEN + 3, y + 3, 32, 5, 1, 1, 'F')
  doc.setTextColor(80, 60, 0)
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'bold')
  doc.text('SEÑORES:', MARGEN + 4, y + 7)

  doc.setTextColor(...OSCURO)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(cliente.nombre_razon_social || 'Sin nombre', MARGEN + 38, y + 8)

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRIS)

  const col1 = []
  const col2 = []
  if (cliente.nit_cedula) col1.push(`NIT/CC: ${cliente.nit_cedula}`)
  if (cliente.nombre_contacto) col1.push(`ATN: ${cliente.nombre_contacto}`)
  if (cliente.telefono) col1.push(`TEL: ${cliente.telefono}`)
  if (cliente.email) col2.push(`Email: ${cliente.email}`)
  if (cliente.ciudad) col2.push(`Ciudad: ${cliente.ciudad}`)
  if (cliente.direccion) col2.push(`Dir: ${cliente.direccion}`)

  col1.forEach((line, i) => doc.text(line, MARGEN + 4, y + 15 + i * 5))
  col2.forEach((line, i) => doc.text(line, MARGEN + ANCHO / 2, y + 15 + i * 5))

  y += 40
  y = dibujarCabeceraTabla(y)

  // ── Filas de productos ────────────────────────────────────────────────────
  const FILA_H = 14

  for (let index = 0; index < items.length; index++) {
    const item = items[index]

    if (y + FILA_H > Y_PIE - 10) {
      doc.addPage()
      dibujarEncabezadoPie(numeroCot, fecha)
      y = H_ENCABEZADO + H_FRANJA + 6
      y = dibujarCabeceraTabla(y)
    }

    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(MARGEN, y, ANCHO, FILA_H, 'F')
    }
    doc.setDrawColor(...GRIS_CLARO)
    doc.line(MARGEN, y + FILA_H, MARGEN + ANCHO, y + FILA_H)

    // Imagen producto — placeholder hasta que backend entregue URLs
    // Imagen producto
    const imgUrl = imagenesPorCodRef[item.cod_ref]
    if (imgUrl) {
      const imgB64 = await cargarImagenBase64(imgUrl)
      if (imgB64) {
        doc.addImage(imgB64, 'PNG', COL.img.x, y + 1, 12, 12)
      } else {
        dibujarPlaceholder(doc, COL.img.x, y, GRIS_CLARO, GRIS)
      }
    } else {
      dibujarPlaceholder(doc, COL.img.x, y, GRIS_CLARO, GRIS)
    }

    const subtotal = (item.precio_unitario || 0) * (item.cantidad || 0)
    const yTexto = y + 7

    doc.setTextColor(...OSCURO)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.text(String(index + 1), COL.item.x, yTexto)
    doc.text(String(item.cantidad || 1), COL.cant.x, yTexto)

    const nomLines = doc.splitTextToSize(item.nom_ref || item.cod_ref || '', COL.nom.w)
    doc.text(nomLines.slice(0, 2), COL.nom.x, y + 5)

    doc.setTextColor(...GRIS)
    doc.setFontSize(6.5)
    doc.text(item.cod_ref || '', COL.nom.x, y + 11)

    doc.setTextColor(...OSCURO)
    doc.setFontSize(7.5)
    doc.text(formatCOP(item.precio_unitario || 0), COL.precio.x, yTexto)
    doc.text(formatCOP(subtotal), COL.sub.x, yTexto)

    y += FILA_H
  }

  y += 4

  // ── Totales ───────────────────────────────────────────────────────────────
  if (y + 40 > Y_PIE - 6) {
    doc.addPage()
    dibujarEncabezadoPie(numeroCot, fecha)
    y = H_ENCABEZADO + H_FRANJA + 6
  }

  const TOTAL_X = MARGEN + ANCHO - 72
  const TOTAL_W = 72

  // Subtotal
  doc.setFillColor(245, 247, 250)
  doc.rect(TOTAL_X, y, TOTAL_W, 8, 'F')
  doc.setDrawColor(...GRIS_CLARO)
  doc.rect(TOTAL_X, y, TOTAL_W, 8, 'S')
  doc.setTextColor(...GRIS)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('SUBTOTAL', TOTAL_X + 3, y + 5.5)
  doc.setTextColor(...OSCURO)
  doc.text(formatCOP(cotizacion.subtotal), TOTAL_X + TOTAL_W - 3, y + 5.5, { align: 'right' })
  y += 8

  // IVA
  doc.setFillColor(245, 247, 250)
  doc.rect(TOTAL_X, y, TOTAL_W, 8, 'F')
  doc.rect(TOTAL_X, y, TOTAL_W, 8, 'S')
  doc.setTextColor(...GRIS)
  doc.text('IVA(19%)', TOTAL_X + 3, y + 5.5)
  doc.setTextColor(...OSCURO)
  doc.text(formatCOP(cotizacion.iva), TOTAL_X + TOTAL_W - 3, y + 5.5, { align: 'right' })
  y += 8

  // Total
  doc.setFillColor(...VERDE)
  doc.rect(TOTAL_X, y, TOTAL_W, 10, 'F')
  doc.setTextColor(...BLANCO)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('TOTAL', TOTAL_X + 3, y + 6.5)
  doc.text(formatCOP(cotizacion.total), TOTAL_X + TOTAL_W - 3, y + 6.5, { align: 'right' })
  y += 14

  // ── Observaciones ─────────────────────────────────────────────────────────
  if (cotizacion.observaciones_pdf) {
    doc.setDrawColor(...GRIS_CLARO)
    doc.line(MARGEN, y, MARGEN + ANCHO, y)
    y += 5
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GRIS)
    doc.text('Observación:', MARGEN, y)
    y += 4
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...OSCURO)
    const obsLines = doc.splitTextToSize(cotizacion.observaciones_pdf, ANCHO)
    const obsH = obsLines.length * 4 + 6
    doc.setFillColor(252, 252, 252)
    doc.setDrawColor(...GRIS_CLARO)
    doc.rect(MARGEN, y - 2, ANCHO, obsH, 'FD')
    doc.text(obsLines, MARGEN + 3, y + 2)
  }

  // ── Número de página ──────────────────────────────────────────────────────
  const totalPaginas = doc.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setTextColor(...BLANCO)
    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Página ${i} de ${totalPaginas}`,
      PAGE_W / 2, Y_PIE + H_PIE - 4,
      { align: 'center' }
    )
  }

  // ── Output ────────────────────────────────────────────────────────────────
  if (descargar) {
    doc.save(`${cotizacion.consecutivo}.pdf`)
    return null
  }

  const blob = doc.output('blob')
  return URL.createObjectURL(blob)
}
