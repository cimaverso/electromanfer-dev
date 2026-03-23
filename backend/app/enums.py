# ENUMS para la app 
# app/models/enums.py

from enum import Enum

class RoleEnum(str, Enum):
    ADMINISTRADOR = "ADMINISTRADOR"
    ASESOR = "ASESOR"

class TipoCliente(str, Enum):
    empresa = "empresa"