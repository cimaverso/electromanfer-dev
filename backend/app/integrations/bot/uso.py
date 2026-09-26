"""
Registro y consulta de tokens/costo gastados por el bot de WhatsApp en la
API de Anthropic. El costo se calcula y se guarda ya resuelto (ver
PRECIOS_POR_MODELO) para que un cambio futuro de tarifa no altere el
histórico.
"""
from datetime import date, datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.integrations.bot.config import descontar_saldo
from app.models.bot_uso_ia import BotUsoIA

# USD por millón de tokens (tarifas oficiales de Anthropic). Agregar acá
# si el bot llega a usar otro modelo.
PRECIOS_POR_MODELO = {
    "claude-haiku-4-5-20251001": {"entrada": 1.00, "salida": 5.00},
}
PRECIO_POR_DEFECTO = {"entrada": 1.00, "salida": 5.00}


def _costo_usd(modelo: str, tokens_entrada: int, tokens_salida: int) -> float:
    precio = PRECIOS_POR_MODELO.get(modelo, PRECIO_POR_DEFECTO)
    return round(
        tokens_entrada * precio["entrada"] / 1_000_000
        + tokens_salida * precio["salida"] / 1_000_000,
        6,
    )


def registrar_uso(
    db: Session,
    *,
    conversation_id: int,
    phone_number_id: str,
    modelo: str,
    tokens_entrada: int,
    tokens_salida: int,
) -> None:
    if tokens_entrada <= 0 and tokens_salida <= 0:
        return
    costo = _costo_usd(modelo, tokens_entrada, tokens_salida)
    registro = BotUsoIA(
        conversation_id=conversation_id,
        phone_number_id=str(phone_number_id),
        modelo=modelo,
        tokens_entrada=tokens_entrada,
        tokens_salida=tokens_salida,
        costo_usd=costo,
    )
    db.add(registro)
    descontar_saldo(db, costo)
    db.commit()


def resumen_uso(db: Session, desde: date, hasta: date) -> dict:
    """`hasta` es inclusivo (se consulta hasta el final de ese día)."""
    limite_superior = datetime.combine(hasta + timedelta(days=1), datetime.min.time())
    limite_inferior = datetime.combine(desde, datetime.min.time())

    fecha_dia = func.date(BotUsoIA.created_at)
    filas = (
        db.query(
            fecha_dia.label("fecha"),
            func.coalesce(func.sum(BotUsoIA.tokens_entrada), 0).label("tokens_entrada"),
            func.coalesce(func.sum(BotUsoIA.tokens_salida), 0).label("tokens_salida"),
            func.coalesce(func.sum(BotUsoIA.costo_usd), 0).label("costo_usd"),
        )
        .filter(BotUsoIA.created_at >= limite_inferior, BotUsoIA.created_at < limite_superior)
        .group_by(fecha_dia)
        .order_by(fecha_dia)
        .all()
    )

    por_dia = [
        {
            "fecha": fila.fecha.isoformat() if hasattr(fila.fecha, "isoformat") else str(fila.fecha),
            "tokens_entrada": int(fila.tokens_entrada),
            "tokens_salida": int(fila.tokens_salida),
            "costo_usd": round(float(fila.costo_usd), 6),
        }
        for fila in filas
    ]

    return {
        "total_tokens_entrada": sum(f["tokens_entrada"] for f in por_dia),
        "total_tokens_salida": sum(f["tokens_salida"] for f in por_dia),
        "total_usd": round(sum(f["costo_usd"] for f in por_dia), 6),
        "por_dia": por_dia,
    }
