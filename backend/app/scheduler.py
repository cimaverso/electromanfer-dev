import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.services.productos import ProductosService

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def iniciar_scheduler() -> None:
    scheduler.add_job(
        ProductosService.sincronizar,
        trigger=IntervalTrigger(hours=1),
        id="sync_productos",
        replace_existing=True,
        misfire_grace_time=300,
    )
    scheduler.start()
    logger.info("Scheduler iniciado — sincronización cada hora.")

    # Primera sync inmediata al arrancar el servidor
    ProductosService.sincronizar()


def detener_scheduler() -> None:
    scheduler.shutdown(wait=False)
    logger.info("Scheduler detenido.")