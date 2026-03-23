from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass


from app.models.usuario import Usuario
from app.models.cliente import Cliente
from app.models.producto_catalogo import ProductoCatalogo
from app.models.producto_multimedia import ProductoMultimedia
from app.models.cotizacion import Cotizacion
from app.models.cotizacion_item import CotizacionItem
from app.models.cotizacion_historial import CotizacionHistorial
from app.models.cotizacion_envio import CotizacionEnvio
from app.models.configuracion_empresa import ConfiguracionEmpresa