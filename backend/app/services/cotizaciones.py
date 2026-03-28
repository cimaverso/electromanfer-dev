import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.cotizaciones import Cotizaciones
from app.models.cotizaciones_item import CotizacionesItem
from app.schemas.cotizaciones import CotizacionCreate
from app.services.clientes import ClientesService
from typing import Optional

logger = logging.getLogger(__name__)

IVA = 0.19


class CotizacionesService:

    # Consecutivo 

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
        subtotal  = round(item.precio_unitario * item.cantidad, 2)
        descuento = round(item.descuento_unitario * item.cantidad, 2)
        base      = round(subtotal - descuento, 2)
        iva       = round(base * IVA, 2)
        total     = round(base + iva, 2)
        return {"subtotal_linea": subtotal, "iva_linea": iva, "total_linea": total}

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
        )
        db.add(cotizacion)
        db.flush()

        subtotal_total = descuento_total = iva_total = total_total = 0.0

        for item in data.items:
            calc = CotizacionesService._calcular_item(item)

            subtotal_total  += calc["subtotal_linea"]
            descuento_total += round(item.descuento_unitario * item.cantidad, 2)
            iva_total       += calc["iva_linea"]
            total_total     += calc["total_linea"]

            db.add(CotizacionesItem(
                cotizacion_id              = cotizacion.id,
                cod_ref                    = item.cod_ref,
                nom_ref                    = item.nom_ref,
                cod_tip                    = item.cod_tip,
                nom_tip                    = item.nom_tip,
                cantidad                   = item.cantidad,
                precio_unitario            = item.precio_unitario,
                descuento_unitario         = item.descuento_unitario,
                subtotal_linea             = calc["subtotal_linea"],
                iva_linea                  = calc["iva_linea"],
                total_linea                = calc["total_linea"],
                imagen_url_snapshot        = item.imagen_url_snapshot,
                ficha_tecnica_url_snapshot = item.ficha_tecnica_url_snapshot,
            ))

        cotizacion.subtotal  = round(subtotal_total, 2)
        cotizacion.descuento = round(descuento_total, 2)
        cotizacion.iva       = round(iva_total, 2)
        cotizacion.total     = round(total_total, 2)

        db.commit()
        db.refresh(cotizacion)
        return cotizacion

    # Listar 
    @staticmethod
    def listar(db: Session) -> list[Cotizaciones]:
        return db.execute(
            select(Cotizaciones).order_by(Cotizaciones.id.desc())
        ).scalars().all()

    # Detalle 

    @staticmethod
    def obtener_por_id(db: Session, cotizacion_id: int) -> Optional[Cotizaciones]:
        return db.execute(
            select(Cotizaciones).where(Cotizaciones.id == cotizacion_id)
        ).scalar_one_or_none()