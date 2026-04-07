import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select, true
from app.models.cotizaciones import Cotizaciones
from app.models.cotizaciones_item import CotizacionesItem
from app.models.productos import Productos
from app.models.productos_multimedia import ProductosMultimedia
from app.schemas.cotizaciones import CotizacionCreate
from app.services.clientes import ClientesService
from typing import Optional
from datetime import date
from app.models.clientes import Clientes

logger = logging.getLogger(__name__)

IVA = 0.19


class CotizacionesService:

    #Consecutivo
    @staticmethod
    def _generar_consecutivo(db: Session) -> str:
        anio = datetime.now(timezone.utc).year
        prefijo = f"COT-{anio}-"
        ultimo = db.execute(
            select(Cotizaciones)
            .where(Cotizaciones.consecutivo.like(f"{prefijo}%"))
            .order_by(Cotizaciones.id.desc())
            .limit(1)
        ).scalar_one_or_none()
        numero = 1 if ultimo is None else int(ultimo.consecutivo.split("-")[-1]) + 1
        return f"{prefijo}{numero:04d}"

    # Cálculos

    @staticmethod
    def _calcular_item(item) -> dict:
        subtotal  = round(item.valor_web * item.cantidad, 2)
        descuento = round(item.descuento_unitario * item.cantidad, 2)
        base      = round(subtotal - descuento, 2)
        iva       = round(base * IVA, 2)
        total     = round(base + iva, 2)
        return {"subtotal": subtotal, "iva": iva, "total": total}

    # Snapshot multimedia 
    @staticmethod
    def _imagen_principal(db: Session, cod_ref: str) -> Optional[str]:
        return db.execute(
            select(ProductosMultimedia.url)
            .join(Productos, Productos.id == ProductosMultimedia.producto_id)
            .where(
                Productos.cod_ref == cod_ref,
                ProductosMultimedia.tipo == "imagen",
                ProductosMultimedia.principal == true(),
            )
            .limit(1)
        ).scalar_one_or_none()
    

    @staticmethod
    def _imagenes(db: Session, cod_ref: str) -> Optional[list]:
        resultados = db.execute(
            select(ProductosMultimedia.url)
            .join(Productos, Productos.id == ProductosMultimedia.producto_id)
            .where(
                Productos.cod_ref == cod_ref,
                ProductosMultimedia.tipo == "imagen",
            )
        ).scalars().all()
        return list(resultados) if resultados else None

    @staticmethod
    def _fichas(db: Session, cod_ref: str) -> Optional[list]:
        resultados = db.execute(
            select(ProductosMultimedia.url)
            .join(Productos, Productos.id == ProductosMultimedia.producto_id)
            .where(
                Productos.cod_ref == cod_ref,
                ProductosMultimedia.tipo == "ficha_tecnica",
            )
        ).scalars().all()
        return list(resultados) if resultados else None

    # Crear

    @staticmethod
    def crear(db: Session, data: CotizacionCreate, usuario_id: int) -> Cotizaciones:
        cliente     = ClientesService.obtener_o_crear(db, data.cliente)
        consecutivo = CotizacionesService._generar_consecutivo(db)

        cotizacion = Cotizaciones(
            consecutivo       = consecutivo,
            cliente_id        = cliente.id,
            usuario_id        = usuario_id,
            estado            = "generada",
            subtotal          = 0,
            descuento         = 0,
            iva               = 0,
            total             = 0,
            notas             = data.notas,
            observaciones_pdf = data.observaciones_pdf,
        )
        db.add(cotizacion)
        db.flush()

        subtotal_total = descuento_total = iva_total = total_total = 0.0

        for item in data.items:
            calc = CotizacionesService._calcular_item(item)
            subtotal_total  += calc["subtotal"]
            descuento_total += round(item.descuento_unitario * item.cantidad, 2)
            iva_total       += calc["iva"]
            total_total     += calc["total"]

            db.add(CotizacionesItem(
                cotizacion_id      = cotizacion.id,
                cod_ref            = item.cod_ref,
                nom_ref            = item.nom_ref,
                cod_tip            = item.cod_tip,
                nom_tip            = item.nom_tip,
                cantidad           = item.cantidad,
                precio_unitario    = item.valor_web,
                descuento_unitario = item.descuento_unitario,
                subtotal           = calc["subtotal"],
                iva                = calc["iva"],
                total              = calc["total"],
                imagen_url    = CotizacionesService._imagen_principal(db, item.cod_ref),
                imagenes_urls = CotizacionesService._imagenes(db, item.cod_ref),
                fichas_urls   = CotizacionesService._fichas(db, item.cod_ref),
            ))

        cotizacion.subtotal  = round(subtotal_total, 2)
        cotizacion.descuento = round(descuento_total, 2)
        cotizacion.iva       = round(iva_total, 2)
        cotizacion.total     = round(total_total, 2)

        db.commit()

        return CotizacionesService.obtener_por_id(db, cotizacion.id)

    # Listar
    @staticmethod
    def listar(
        db: Session,
        cliente: Optional[str] = None,
        consecutivo: Optional[str] = None,
        estado: Optional[str] = None,
        fecha_inicio: Optional[date] = None,
        fecha_fin: Optional[date] = None,
    ) -> list[Cotizaciones]:
        query = (
            select(Cotizaciones)
            .options(
                joinedload(Cotizaciones.clientes),
                joinedload(Cotizaciones.cotizaciones_items)
            )
            .order_by(Cotizaciones.id.desc())
        )

        if consecutivo:
            query = query.where(Cotizaciones.consecutivo.ilike(f"%{consecutivo}%"))
        if estado:
            query = query.where(Cotizaciones.estado == estado)
        if fecha_inicio:
            query = query.where(Cotizaciones.created_at >= fecha_inicio)
        if fecha_fin:
            query = query.where(Cotizaciones.created_at <= fecha_fin)
        if cliente:
            query = query.join(Cotizaciones.clientes).where(
                Clientes.nombre_razon_social.ilike(f"%{cliente}%")
            )

        return db.execute(query).unique().scalars().all()

    # Detalle
    @staticmethod
    def obtener_por_id(db: Session, cotizacion_id: int) -> Optional[Cotizaciones]:
        return db.execute(
            select(Cotizaciones)
            .options(
                joinedload(Cotizaciones.clientes),
                joinedload(Cotizaciones.cotizaciones_items)
            )
            .where(Cotizaciones.id == cotizacion_id)
        ).unique().scalar_one_or_none()