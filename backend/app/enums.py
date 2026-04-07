# app/models/enums.py

from enum import Enum

class RoleEnum(str, Enum):
    ADMINISTRADOR = "ADMINISTRADOR"
    GERENTE = "GERENTE"
    VENDEDOR = "VENDEDOR"

class TipoCliente(str, Enum):
    empresa = "EMPRESA"