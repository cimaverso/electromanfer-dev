"""
Evalúa si, según el horario configurado (bot_config.horario_reglas, ver
app/integrations/bot/config.py), la hora actual (America/Bogota) cae
dentro de un tramo en el que el bot debe estar activo.

Formato de `reglas`: {"0": [["HH:MM","HH:MM"], ...], ..., "6": [...]},
con claves = weekday() (0=lunes ... 6=domingo). Cada tramo vive dentro de
un único día calendario -- no hay wrap de medianoche; un horario nocturno
que hoy cruza la medianoche se modela como un tramo en el día que empieza
("18:00"-"24:00") y otro en el día siguiente ("00:00"-"06:00").
"""
from datetime import datetime, time
from zoneinfo import ZoneInfo

ZONA_HORARIA = ZoneInfo("America/Bogota")


def _parsear_hora(valor: str) -> time:
    horas, minutos = valor.split(":")
    horas = int(horas)
    if horas == 24:
        return time(23, 59, 59, 999999)
    return time(horas, int(minutos))


def esta_en_horario(reglas: dict, ahora: datetime | None = None) -> bool:
    if ahora is None:
        ahora = datetime.now(ZONA_HORARIA)
    elif ahora.tzinfo is None:
        ahora = ahora.replace(tzinfo=ZONA_HORARIA)
    else:
        ahora = ahora.astimezone(ZONA_HORARIA)

    tramos = (reglas or {}).get(str(ahora.weekday()), [])
    hora_actual = ahora.time()
    for desde, hasta in tramos:
        if _parsear_hora(desde) <= hora_actual <= _parsear_hora(hasta):
            return True
    return False
