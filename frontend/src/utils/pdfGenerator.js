import jsPDF from 'jspdf'
const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || ''


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

function safeAddImage(doc, b64, x, y, w, h) {
  if (!b64) return
  try {
    const fmt = b64.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG'
    doc.addImage(b64, fmt, x, y, w, h)
  } catch (e) {
    console.warn('addImage falló:', e.message)
  }
}

// ── Lee orientación EXIF de un ArrayBuffer JPEG ──────────────────────────────
// Retorna 1-8 (1 = normal, 3 = 180°, 6 = 90°CW, 8 = 270°CW)
function leerExifOrientation(arrayBuffer) {
  try {
    const view = new DataView(arrayBuffer)
    if (view.getUint16(0) !== 0xFFD8) return 1 // no es JPEG
    let offset = 2
    while (offset < view.byteLength) {
      const marker = view.getUint16(offset)
      offset += 2
      if (marker === 0xFFE1) {
        // APP1
        const exifHeader = view.getUint32(offset + 2)
        if (exifHeader !== 0x45786966) return 1 // no es 'Exif'
        const tiffOffset = offset + 8
        const littleEndian = view.getUint16(tiffOffset) === 0x4949
        const ifdOffset = tiffOffset + view.getUint32(tiffOffset + 4, littleEndian)
        const entries = view.getUint16(ifdOffset, littleEndian)
        for (let i = 0; i < entries; i++) {
          const entryOffset = ifdOffset + 2 + i * 12
          if (view.getUint16(entryOffset, littleEndian) === 0x0112) {
            return view.getUint16(entryOffset + 8, littleEndian)
          }
        }
        return 1
      } else if ((marker & 0xFF00) !== 0xFF00) {
        break
      } else {
        offset += view.getUint16(offset)
      }
    }
  } catch { /* silencioso */ }
  return 1
}

// ── Normaliza orientación EXIF pasando la imagen por canvas ──────────────────
// Recibe un Blob, devuelve data URL con la imagen derecha (PNG)
async function normalizarOrientacionImagen(blob) {
  return new Promise((resolve) => {
    // Leer EXIF solo en JPEG
    const esJpeg = blob.type === 'image/jpeg' || blob.type === 'image/jpg'

    const procesarConOrientation = (orientation, dataUrl) => {
      // Orientación 1 = normal, no necesita canvas
      if (orientation === 1) return resolve(dataUrl)

      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const w = img.naturalWidth
        const h = img.naturalHeight

        // Orientaciones 5-8 intercambian ejes
        if (orientation >= 5) {
          canvas.width = h
          canvas.height = w
        } else {
          canvas.width = w
          canvas.height = h
        }

        switch (orientation) {
          case 2: ctx.transform(-1, 0, 0,  1,  w, 0); break
          case 3: ctx.transform(-1, 0, 0, -1,  w, h); break
          case 4: ctx.transform( 1, 0, 0, -1,  0, h); break
          case 5: ctx.transform( 0, 1, 1,  0,  0, 0); break
          case 6: ctx.transform( 0, 1,-1,  0,  h, 0); break
          case 7: ctx.transform( 0,-1,-1,  0,  h, w); break
          case 8: ctx.transform( 0,-1, 1,  0,  0, w); break
          default: break
        }

        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => resolve(dataUrl)
      img.src = dataUrl
    }

    const reader = new FileReader()
    reader.onerror = () => resolve(null)

    if (esJpeg) {
      // Leer como ArrayBuffer primero para extraer EXIF
      const readerBuf = new FileReader()
      readerBuf.onerror = () => resolve(null)
      readerBuf.onloadend = () => {
        const orientation = leerExifOrientation(readerBuf.result)
        // Si es normal, devolver data URL sin pasar por canvas
        if (orientation === 1) {
          reader.onloadend = () => resolve(reader.result)
          reader.readAsDataURL(blob)
          return
        }
        // Si necesita corrección, leer como dataURL y corregir
        reader.onloadend = () => procesarConOrientation(orientation, reader.result)
        reader.readAsDataURL(blob)
      }
      readerBuf.readAsArrayBuffer(blob)
    } else {
      // PNG u otros: sin EXIF, leer directo
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    }
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
    const response = await fetch(urlAbsoluta, { mode: 'cors', cache: 'no-store' })
    if (!response.ok) return null
    const blob = await response.blob()
    // Normaliza orientación EXIF — solo actúa en JPEG con orientación != 1
    return await normalizarOrientacionImagen(blob)
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
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  })

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
      safeAddImage(doc, encabezadoB64, 0, 0, PAGE_W, H_ENCABEZADO)
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
      safeAddImage(doc, pieB64, 0, Y_PIE, PAGE_W, H_PIE)
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

    // Imagen producto
    const imgUrl = imagenesPorCodRef[item.cod_ref]
    if (imgUrl) {
      const imgB64 = await cargarImagenBase64(imgUrl)
      if (imgB64) {
        safeAddImage(doc, imgB64, COL.img.x, y + 1, 12, 12)
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