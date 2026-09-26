"""
Configuración del bot (bot_config, fila única id=1) y la regla que combina
el override manual con el horario automático para decidir si el bot debe
responder ahora mismo. Ver schedule.py para la evaluación del horario y
routes/whatsapp.py para los endpoints que exponen esto al frontend.
"""
from datetime import datetime
from sqlalchemy.orm import Session

from app.integrations.bot.schedule import esta_en_horario
from app.models.bot_config import BotConfig

DIAS_SEMANA = [str(i) for i in range(7)]
MAX_LARGO_INSTRUCCIONES_EXTRA = 1500


def _config_por_defecto() -> BotConfig:
    return BotConfig(
        id=1,
        override_manual=None,
        horario_activo=True,
        horario_reglas={},
        saldo_usd=0,
        saldo_activo=False,
        instrucciones_extra="",
    )


def obtener_config(db: Session) -> BotConfig:
    config = db.get(BotConfig, 1)
    if config is None:
        config = _config_por_defecto()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


def validar_horario_reglas(reglas: dict) -> None:
    if not isinstance(reglas, dict) or set(reglas.keys()) - set(DIAS_SEMANA):
        raise ValueError("horario_reglas debe tener únicamente las claves '0' a '6'")
    for dia, tramos in reglas.items():
        if not isinstance(tramos, list):
            raise ValueError(f"Los tramos del día {dia} deben ser una lista")
        for tramo in tramos:
            if len(tramo) != 2:
                raise ValueError(f"Cada tramo del día {dia} debe tener [desde, hasta]")
            desde, hasta = tramo
            try:
                h1, m1 = (int(x) for x in desde.split(":"))
                h2, m2 = (int(x) for x in hasta.split(":"))
            except (ValueError, AttributeError):
                raise ValueError(f"Hora inválida en el día {dia}: {tramo}")
            if not (0 <= h1 <= 24 and 0 <= m1 < 60 and 0 <= h2 <= 24 and 0 <= m2 < 60):
                raise ValueError(f"Hora fuera de rango en el día {dia}: {tramo}")
            if (h1, m1) > (h2, m2):
                raise ValueError(f"El tramo del día {dia} no puede terminar antes de empezar: {tramo}")


def actualizar_config(
    db: Session,
    *,
    override_manual: str | None = "__sin_cambio__",
    horario_activo: bool | None = None,
    horario_reglas: dict | None = None,
    saldo_activo: bool | None = None,
    instrucciones_extra: str | None = None,
    actualizado_por_id: int | None = None,
) -> BotConfig:
    config = obtener_config(db)
    if override_manual != "__sin_cambio__":
        if override_manual not in (None, "on", "off"):
            raise ValueError("override_manual debe ser 'on', 'off' o null")
        config.override_manual = override_manual
    if horario_activo is not None:
        config.horario_activo = horario_activo
    if horario_reglas is not None:
        validar_horario_reglas(horario_reglas)
        config.horario_reglas = horario_reglas
    if saldo_activo is not None:
        config.saldo_activo = saldo_activo
    if instrucciones_extra is not None:
        if len(instrucciones_extra) > MAX_LARGO_INSTRUCCIONES_EXTRA:
            raise ValueError(
                f"Las instrucciones adicionales no pueden superar los {MAX_LARGO_INSTRUCCIONES_EXTRA} caracteres"
            )
        config.instrucciones_extra = instrucciones_extra.strip()
    if actualizado_por_id is not None:
        config.actualizado_por_id = actualizado_por_id
    db.commit()
    db.refresh(config)
    return config


def recargar_saldo(db: Session, monto: float, actualizado_por_id: int | None = None) -> BotConfig:
    if monto <= 0:
        raise ValueError("El monto a recargar debe ser mayor a 0")
    config = obtener_config(db)
    config.saldo_usd = float(config.saldo_usd or 0) + monto
    if actualizado_por_id is not None:
        config.actualizado_por_id = actualizado_por_id
    db.commit()
    db.refresh(config)
    return config


def descontar_saldo(db: Session, monto: float) -> None:
    """Resta el costo de una respuesta del bot del saldo prepago. No hace
    `commit` -- se llama dentro de la misma transacción que registra el
    uso en bot_uso_ia (ver bot/uso.py:registrar_uso)."""
    if monto <= 0:
        return
    config = obtener_config(db)
    config.saldo_usd = float(config.saldo_usd or 0) - monto


def bot_activo_ahora(db: Session, ahora: datetime | None = None) -> bool:
    config = obtener_config(db)
    if config.saldo_activo and float(config.saldo_usd or 0) <= 0:
        return False
    if config.override_manual == "on":
        return True
    if config.override_manual == "off":
        return False
    if not config.horario_activo:
        return False
    return esta_en_horario(config.horario_reglas, ahora)
