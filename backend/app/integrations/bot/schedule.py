"""
Horario en el que el bot de saludo fuera de horario está activo.

Regla (hora local America/Bogota):
- Lunes a viernes: activo de 18:00 a 06:00 del día siguiente.
- Sábado: activo desde las 14:00, de forma continua durante todo el
  domingo, hasta las 06:00 del lunes.
- Hueco: sábado de 06:00 a 14:00 el bot está apagado.

Expresado por franja horaria (sin importar el día, `hora < 6` y
`hora >= 18` siempre caen dentro de alguna de las dos reglas de arriba):
- hora < 6: activo todos los días.
- hora >= 18: activo todos los días.
- 6 <= hora < 14: activo solo domingo.
- 14 <= hora < 18: activo sábado y domingo.
"""
from datetime import datetime
from zoneinfo import ZoneInfo

ZONA_HORARIA = ZoneInfo("America/Bogota")

DOMINGO = 6
SABADO = 5


def esta_en_horario_bot(ahora: datetime | None = None) -> bool:
    if ahora is None:
        ahora = datetime.now(ZONA_HORARIA)
    elif ahora.tzinfo is None:
        ahora = ahora.replace(tzinfo=ZONA_HORARIA)
    else:
        ahora = ahora.astimezone(ZONA_HORARIA)

    hora = ahora.hour
    dia = ahora.weekday()  # 0=lunes ... 6=domingo

    if hora < 6 or hora >= 18:
        return True
    if hora < 14:
        return dia == DOMINGO
    return dia in (SABADO, DOMINGO)
