import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.services.productos import ProductosService
from app.services.clientes import ClientesService

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()

def iniciar_scheduler() -> None:
   
    scheduler.add_job(
        ProductosService.sincronizar,
        trigger=IntervalTrigger(minutes=3),
        id="sync_productos",
        replace_existing=True,
        misfire_grace_time=300,
    )
    scheduler.add_job(
        ClientesService.sincronizar,
        trigger=IntervalTrigger(minutes=5),
        id="sync_clientes",
        replace_existing=True,
        misfire_grace_time=300,
    )

    scheduler.start()
    logger.info("Scheduler iniciado.")

def detener_scheduler() -> None:
    scheduler.shutdown(wait=False)
    logger.info("Scheduler detenido.")