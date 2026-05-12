# app/models/enums.py

from enum import Enum

class RoleEnum(str, Enum):
    ADMINISTRADOR = "ADMINISTRADOR"
    GERENCIA = "GERENCIA"
    VENDEDOR = "VENDEDOR"

class TipoCliente(str, Enum):
    empresa = "EMPRESA"