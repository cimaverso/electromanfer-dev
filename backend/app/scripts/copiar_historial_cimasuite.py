"""Copia el historial de WhatsApp de CimaSuite a las tablas propias de Electromanfer.

    uv run python -m app.scripts.copiar_historial_cimasuite --verificar
    uv run python -m app.scripts.copiar_historial_cimasuite
    uv run python -m app.scripts.copiar_historial_cimasuite --sin-archivos --conversacion 123

Solo lee de CimaSuite y se puede repetir. Conserva el id de cada conversación.
--verificar no escribe nada: compara los mensajes de cada conversación con los que hay aquí.
Sin carpeta de archivos configurada no copia archivos.
"""
import argparse
import logging
import sys

from app.core.db import SessionLocal
from app.integrations.cimasuite.client import WhatsappService
from app.integrations.cimasuite.copiar_historial import copiar_historial


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--verificar", action="store_true", help="solo compara, no escribe")
    p.add_argument("--sin-archivos", action="store_true")
    p.add_argument("--conversacion", type=int, help="solo esa conversación (id de CimaSuite)")
    args = p.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    r = copiar_historial(
        WhatsappService, SessionLocal,
        con_archivos=not args.sin_archivos, solo_verificar=args.verificar, conversacion_id=args.conversacion,
    )
    print(f"Conversaciones: {r.conversaciones} | mensajes leídos: {r.mensajes_leidos} | nuevos: {r.mensajes_nuevos}")
    print(f"Archivos copiados: {r.archivos_copiados} | fallidos: {r.archivos_fallidos}")
    if r.unidas:
        print(f"Conversaciones unidas a otra de la misma línea (id CimaSuite -> id local): {r.unidas}")
    dif = r.diferencias()
    if dif:
        print(f"Conversaciones con distinto número de mensajes ({len(dif)}): id -> (CimaSuite, aquí)")
        for cid, (a, b) in sorted(dif.items())[:50]:
            print(f"  {cid}: {a} -> {b}")
        return 1
    print("Todas las conversaciones coinciden.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
