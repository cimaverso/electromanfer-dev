import jsPDF from 'jspdf'

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
    month: 'long',
    year: 'numeric',
  })
}

export function generarPdfCotizacion(cotizacion) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const MARGEN = 20
  const ANCHO = 210 - MARGEN * 2
  const VERDE = [140, 166, 83]
  const OSCURO = [30, 33, 48]
  const GRIS = [100, 110, 130]
  const GRIS_CLARO = [220, 225, 230]
  const BLANCO = [255, 255, 255]

  let y = 0

  // ─── Encabezado ───────────────────────────────────────────────────────────
  doc.setFillColor(...VERDE)
  doc.rect(0, 0, 210, 36, 'F')

  doc.setTextColor(...BLANCO)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('ELECTROMANFER LTDA.', MARGEN, 14)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('LA TIENDA AMBIENTAL', MARGEN, 20)

  doc.setFontSize(8)
  doc.text('electromanfer@gmail.com  |  www.electromanfer.com', MARGEN, 26)

  // Consecutivo en encabezado derecha
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(cotizacion.consecutivo, 210 - MARGEN, 14, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('COTIZACIÓN', 210 - MARGEN, 20, { align: 'right' })
  doc.text(formatFecha(cotizacion.created_at || new Date().toISOString()), 210 - MARGEN, 26, { align: 'right' })

  y = 44

  // ─── Bloque cliente ───────────────────────────────────────────────────────
  doc.setFillColor(245, 247, 250)
  doc.roundedRect(MARGEN, y, ANCHO, 36, 2, 2, 'F')
  doc.setDrawColor(...GRIS_CLARO)
  doc.roundedRect(MARGEN, y, ANCHO, 36, 2, 2, 'S')

  doc.setTextColor(...GRIS)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('CLIENTE', MARGEN + 4, y + 6)

  doc.setTextColor(...OSCURO)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  const cliente = cotizacion.cliente || {}
  doc.text(cliente.nombre_razon_social || 'Sin nombre', MARGEN + 4, y + 13)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRIS)

  const col1 = []
  const col2 = []

  if (cliente.nit_cedula) col1.push(`NIT/CC: ${cliente.nit_cedula}`)
  if (cliente.nombre_contacto) col1.push(`Contacto: ${cliente.nombre_contacto}`)
  if (cliente.email) col2.push(`Email: ${cliente.email}`)
  if (cliente.telefono) col2.push(`Tel: ${cliente.telefono}`)
  if (cliente.ciudad) col2.push(`Ciudad: ${cliente.ciudad}`)

  col1.forEach((line, i) => doc.text(line, MARGEN + 4, y + 19 + i * 5))
  col2.forEach((line, i) => doc.text(line, MARGEN + ANCHO / 2, y + 19 + i * 5))

  y += 44

  // ─── Tabla de productos ───────────────────────────────────────────────────
  // Cabecera tabla
  doc.setFillColor(...OSCURO)
  doc.rect(MARGEN, y, ANCHO, 8, 'F')

  doc.setTextColor(...BLANCO)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')

  const COL = {
    num:    { x: MARGEN + 2,   w: 8   },
    cod:    { x: MARGEN + 10,  w: 26  },
    nom:    { x: MARGEN + 36,  w: 74  },
    cant:   { x: MARGEN + 110, w: 16  },
    precio: { x: MARGEN + 126, w: 28  },
    sub:    { x: MARGEN + 154, w: 26  },
  }

  doc.text('#',           COL.num.x,    y + 5.5)
  doc.text('Código',      COL.cod.x,    y + 5.5)
  doc.text('Descripción', COL.nom.x,    y + 5.5)
  doc.text('Cant.',       COL.cant.x,   y + 5.5)
  doc.text('Precio unit.',COL.precio.x, y + 5.5)
  doc.text('Subtotal',    COL.sub.x,    y + 5.5)

  y += 8

  // Filas
  const items = cotizacion.items || []
  doc.setFont('helvetica', 'normal')

  items.forEach((item, index) => {
    const esPar = index % 2 === 0
    if (esPar) {
      doc.setFillColor(248, 250, 252)
      doc.rect(MARGEN, y, ANCHO, 8, 'F')
    }

    doc.setDrawColor(...GRIS_CLARO)
    doc.line(MARGEN, y + 8, MARGEN + ANCHO, y + 8)

    const subtotal = (item.precio_unitario || 0) * (item.cantidad || 0)

    doc.setTextColor(...OSCURO)
    doc.setFontSize(7.5)

    doc.text(String(index + 1),       COL.num.x,    y + 5.5)
    doc.text(item.cod_ref || '',       COL.cod.x,    y + 5.5)

    // Truncar nombre si es muy largo
    const nomRef = item.nom_ref || ''
    const nomTrunc = nomRef.length > 42 ? nomRef.substring(0, 42) + '...' : nomRef
    doc.text(nomTrunc,                 COL.nom.x,    y + 5.5)

    doc.text(String(item.cantidad || 1), COL.cant.x, y + 5.5)
    doc.text(formatCOP(item.precio_unitario || 0), COL.precio.x, y + 5.5)
    doc.text(formatCOP(subtotal),      COL.sub.x,    y + 5.5)

    y += 8

    // Salto de página si es necesario
    if (y > 240 && index < items.length - 1) {
      doc.addPage()
      y = 20
    }
  })

  y += 6

  // ─── Totales ──────────────────────────────────────────────────────────────
  const TOTAL_X = MARGEN + ANCHO - 70
  const TOTAL_W = 70

  // Subtotal
  doc.setFillColor(245, 247, 250)
  doc.rect(TOTAL_X, y, TOTAL_W, 8, 'F')
  doc.setTextColor(...GRIS)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Subtotal:', TOTAL_X + 2, y + 5.5)
  doc.setTextColor(...OSCURO)
  doc.text(formatCOP(cotizacion.subtotal), TOTAL_X + TOTAL_W - 2, y + 5.5, { align: 'right' })
  y += 8

  // IVA
  doc.setFillColor(245, 247, 250)
  doc.rect(TOTAL_X, y, TOTAL_W, 8, 'F')
  doc.setTextColor(...GRIS)
  doc.text('IVA (19%):', TOTAL_X + 2, y + 5.5)
  doc.setTextColor(...OSCURO)
  doc.text(formatCOP(cotizacion.iva_total), TOTAL_X + TOTAL_W - 2, y + 5.5, { align: 'right' })
  y += 8

  // Total
  doc.setFillColor(...VERDE)
  doc.rect(TOTAL_X, y, TOTAL_W, 10, 'F')
  doc.setTextColor(...BLANCO)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('TOTAL:', TOTAL_X + 2, y + 6.5)
  doc.text(formatCOP(cotizacion.total), TOTAL_X + TOTAL_W - 2, y + 6.5, { align: 'right' })
  y += 16

  // ─── Notas y condiciones ──────────────────────────────────────────────────
  if (cotizacion.observaciones_pdf || cotizacion.condiciones_comerciales || cotizacion.notas) {
    doc.setDrawColor(...GRIS_CLARO)
    doc.line(MARGEN, y, MARGEN + ANCHO, y)
    y += 6

    if (cotizacion.observaciones_pdf) {
      doc.setTextColor(...GRIS)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text('Observaciones:', MARGEN, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...OSCURO)
      const obsLines = doc.splitTextToSize(cotizacion.observaciones_pdf, ANCHO)
      doc.text(obsLines, MARGEN, y)
      y += obsLines.length * 4 + 4
    }

    if (cotizacion.condiciones_comerciales) {
      doc.setTextColor(...GRIS)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.text('Condiciones comerciales:', MARGEN, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...OSCURO)
      const condLines = doc.splitTextToSize(cotizacion.condiciones_comerciales, ANCHO)
      doc.text(condLines, MARGEN, y)
      y += condLines.length * 4 + 4
    }
  }

  // ─── Pie de página ────────────────────────────────────────────────────────
  const PIE_Y = 285
  doc.setFillColor(...VERDE)
  doc.rect(0, PIE_Y, 210, 12, 'F')
  doc.setTextColor(...BLANCO)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text(
    'ELECTROMANFER LTDA. · La Tienda Ambiental · Documento preliminar generado desde sistema administrativo',
    105,
    PIE_Y + 5,
    { align: 'center' }
  )
  doc.text(
    `Página 1 · ${cotizacion.consecutivo}`,
    105,
    PIE_Y + 9,
    { align: 'center' }
  )

  // ─── Descarga ─────────────────────────────────────────────────────────────
  doc.save(`${cotizacion.consecutivo}.pdf`)
}