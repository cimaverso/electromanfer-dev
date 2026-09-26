# app/schemas/bot.py
from typing import Optional
from datetime import date
from pydantic import BaseModel, Field


class BotConfigResponse(BaseModel):
    override_manual: Optional[str] = None
    horario_activo: bool
    horario_reglas: dict
    saldo_usd: float
    saldo_activo: bool
    instrucciones_extra: str
    activo_ahora: bool


class BotConfigUpdate(BaseModel):
    override_manual: Optional[str] = "__sin_cambio__"
    horario_activo: Optional[bool] = None
    horario_reglas: Optional[dict] = None
    saldo_activo: Optional[bool] = None
    instrucciones_extra: Optional[str] = Field(default=None, max_length=1500)


class BotRecargaRequest(BaseModel):
    monto: float = Field(gt=0, le=10_000)


class BotChatFlagRequest(BaseModel):
    desactivado: bool


class BotUsoDia(BaseModel):
    fecha: str
    tokens_entrada: int
    tokens_salida: int
    costo_usd: float


class BotUsoResponse(BaseModel):
    total_tokens_entrada: int
    total_tokens_salida: int
    total_usd: float
    por_dia: list[BotUsoDia]
