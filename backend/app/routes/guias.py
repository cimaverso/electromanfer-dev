from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from app.core.db import get_db
from app.services.guia import GuiaService
from app.schemas.guia import GuiaOut, CambioEstadoGuia
from app.schemas.auth import TokenData
from app.core.security import require_auth

router = APIRouter(prefix="/guias", tags=["Guías"])


@router.get("/", response_model=list[GuiaOut])
def listar_guias(
    estado: Optional[str] = None,
    transportadora: Optional[str] = None,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    buscar: Optional[str] = None,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_auth),
):
    return GuiaService.listar(db, estado, transportadora, fecha_inicio, fecha_fin, buscar)

@router.post("/", response_model=GuiaOut, status_code=201)
def crear_guia(
    transportadora: str = Form(...),
    numero_guia: str = Form(...),
    fecha_despacho: date = Form(...),
    cotizacion_id: Optional[str] = Form(None),
    cotizacion_consecutivo: Optional[str] = Form(None),
    destinatario: Optional[str] = Form(None),
    direccion_destino: Optional[str] = Form(None),
    ciudad_destino: Optional[str] = Form(None),
    telefono_destinatario: Optional[str] = Form(None),
    unidades: Optional[str] = Form(None),
    peso_kg: Optional[str] = Form(None),
    valor_declarado: Optional[str] = Form(None),
    valor_recaudo: Optional[str] = Form(None),
    costo_flete: Optional[str] = Form(None),
    referencia_interna: Optional[str] = Form(None),
    observaciones: Optional[str] = Form(None),
    foto_guia: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    token: TokenData = Depends(require_auth),
):
    datos = {
        "transportadora": transportadora,
        "numero_guia": numero_guia,
        "fecha_despacho": fecha_despacho,
        "cotizacion_id": int(cotizacion_id) if cotizacion_id else None,
        "cotizacion_consecutivo": cotizacion_consecutivo,
        "destinatario": destinatario,
        "direccion_destino": direccion_destino,
        "ciudad_destino": ciudad_destino,
        "telefono_destinatario": telefono_destinatario,
        "unidades": int(unidades) if unidades else None,
        "peso_kg": float(peso_kg) if peso_kg else None,
        "valor_declarado": float(valor_declarado) if valor_declarado else None,
        "valor_recaudo": float(valor_recaudo) if valor_recaudo else None,
        "costo_flete": float(costo_flete) if costo_flete else None,
        "referencia_interna": referencia_interna,
        "observaciones": observaciones,
    }
    return GuiaService.crear(db, datos, token.user_id, foto_guia)

@router.get("/{guia_id}", response_model=GuiaOut)
def obtener_guia(
    guia_id: int,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_auth),
):
    guia = GuiaService.obtener_por_id(db, guia_id)
    if not guia:
        raise HTTPException(status_code=404, detail="Guía no encontrada")
    return guia

@router.patch("/{guia_id}/estado", response_model=GuiaOut)
def cambiar_estado_guia(
    guia_id: int,
    body: CambioEstadoGuia,
    db: Session = Depends(get_db),
    token: TokenData = Depends(require_auth),
):
    guia = GuiaService.obtener_por_id(db, guia_id)
    if not guia:
        raise HTTPException(status_code=404, detail="Guía no encontrada")
    return GuiaService.cambiar_estado(db, guia, body.estado, body.nota, token.user_id)

@router.patch("/{guia_id}", response_model=GuiaOut)
def editar_guia(
    guia_id: int,
    transportadora: Optional[str] = Form(None),
    numero_guia: Optional[str] = Form(None),
    fecha_despacho: Optional[date] = Form(None),
    cotizacion_id: Optional[str] = Form(None),
    cotizacion_consecutivo: Optional[str] = Form(None),
    destinatario: Optional[str] = Form(None),
    direccion_destino: Optional[str] = Form(None),
    ciudad_destino: Optional[str] = Form(None),
    telefono_destinatario: Optional[str] = Form(None),
    unidades: Optional[str] = Form(None),
    peso_kg: Optional[str] = Form(None),
    valor_declarado: Optional[str] = Form(None),
    valor_recaudo: Optional[str] = Form(None),
    costo_flete: Optional[str] = Form(None),
    referencia_interna: Optional[str] = Form(None),
    observaciones: Optional[str] = Form(None),
    foto_guia: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    token: TokenData = Depends(require_auth),
):
    guia = GuiaService.obtener_por_id(db, guia_id)
    if not guia:
        raise HTTPException(status_code=404, detail="Guía no encontrada")
    datos = {
        k: v for k, v in {
            "transportadora": transportadora,
            "numero_guia": numero_guia,
            "fecha_despacho": fecha_despacho,
            "cotizacion_id": int(cotizacion_id) if cotizacion_id else None,
            "cotizacion_consecutivo": cotizacion_consecutivo,
            "destinatario": destinatario,
            "direccion_destino": direccion_destino,
            "ciudad_destino": ciudad_destino,
            "telefono_destinatario": telefono_destinatario,
            "unidades": int(unidades) if unidades else None,
            "peso_kg": float(peso_kg) if peso_kg else None,
            "valor_declarado": float(valor_declarado) if valor_declarado else None,
            "valor_recaudo": float(valor_recaudo) if valor_recaudo else None,
            "costo_flete": float(costo_flete) if costo_flete else None,
            "referencia_interna": referencia_interna,
            "observaciones": observaciones,
        }.items() if v is not None
    }
    return GuiaService.editar(db, guia, datos, foto_guia)