# app/models/enums.py

from enum import Enum

class RoleEnum(str, Enum):
    ADMINISTRADOR = "ADMINISTRADOR"
    GERENTE = "GERENCIA"
    VENDEDOR = "VENDEDOR"

class TipoCliente(str, Enum):
    empresa = "EMPRESA"