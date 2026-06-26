from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.core.db import get_db
from typing import Optional
import json
from datetime import date
from app.services.cotizaciones import CotizacionesService
from app.schemas.cotizaciones import CotizacionCreate, CotizacionResponse, CambiarEstadoSchema
from app.services.email import enviar_email
from app.schemas.auth import TokenData
from app.core.security import require_auth

router = APIRouter(prefix="/cotizaciones", tags=["Cotizaciones"])


@router.get("/", response_model=list[CotizacionResponse])
def listar_cotizaciones(
    db: Session = Depends(get_db),
    cliente: Optional[str] = Query(None),
    consecutivo: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
    _: TokenData = Depends(require_auth)
):
    return CotizacionesService.listar(
        db,
        cliente=cliente,
        consecutivo=consecutivo,
        estado=estado,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
    )

@router.post("/", response_model=CotizacionResponse)
def crear_cotizacion(
    data: CotizacionCreate,
    db: Session = Depends(get_db),
    token : TokenData = Depends(require_auth)
):
    print(f">>> usuario_id del token: {token.user_id}")
    return CotizacionesService.crear(db, data, usuario_id=token.user_id)

@router.get("/{cotizacion_id}", response_model=CotizacionResponse)
def detalle_cotizacion(
    cotizacion_id: int,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_auth)
):
    cotizacion = CotizacionesService.obtener_por_id(db, cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    return cotizacion

@router.post("/{cotizacion_id}/enviar-email")
async def enviar_cotizacion_email(
    cotizacion_id: int,
    destino: str = Form(...),
    asunto: str = Form(...),
    cuerpo: str = Form(...),
    in_reply_to: Optional[str] = Form(None),
    references: Optional[str] = Form(None),
    firma_url: Optional[str] = Form(None),
    pdf_cotizacion: UploadFile = File(...),
    adjuntos_imagenes_urls: Optional[str] = Form(None),
    adjuntos_pdfs_urls: Optional[str] = Form(None),
    archivos_extra: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    token: TokenData = Depends(require_auth)
):
    cotizacion = CotizacionesService.obtener_por_id(db, cotizacion_id)
    if not cotizacion:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    pdf_bytes = await pdf_cotizacion.read()

    imagenes_urls = json.loads(adjuntos_imagenes_urls) if adjuntos_imagenes_urls else []
    fichas_urls = json.loads(adjuntos_pdfs_urls) if adjuntos_pdfs_urls else []

    adjuntos_urls = []
    for u in imagenes_urls:
        if isinstance(u, dict):
            adjuntos_urls.append({'url': u.get('url', ''), 'nombre': u.get('nombre', u.get('url', '').split('/')[-1])})
        else:
            adjuntos_urls.append({'url': u, 'nombre': u.split('/')[-1]})

    for u in fichas_urls:
        if isinstance(u, dict):
            adjuntos_urls.append({'url': u.get('url', ''), 'nombre': u.get('nombre', u.get('url', '').split('/')[-1])})
        else:
            adjuntos_urls.append({'url': u, 'nombre': u.split('/')[-1]})

    # Archivos extra adjuntados manualmente
    for archivo in archivos_extra:
        contenido = await archivo.read()
        adjuntos_urls.append({'nombre': archivo.filename, 'data': contenido})

    enviado = enviar_email(
        destino=destino,
        asunto=asunto,
        cuerpo=cuerpo,
        pdf_bytes=pdf_bytes,
        nombre_pdf=f"{cotizacion.consecutivo}.pdf",
        firma_url=firma_url,
        consecutivo=cotizacion.consecutivo,
        adjuntos_urls=adjuntos_urls if adjuntos_urls else None,
        in_reply_to=in_reply_to,
        references=references,
    )

    if not enviado:
        raise HTTPException(status_code=500, detail="Error al enviar el correo")

    cotizacion.estado = "enviada_email"
    cotizacion.usuario_id = token.user_id
    cotizacion.email_thread_id = enviado
    db.commit()

    return {"ok": True, "mensaje": "Correo enviado correctamente"}

@router.patch("/{cotizacion_id}/estado")
def cambiar_estado(
    cotizacion_id: int,
    data: CambiarEstadoSchema,
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_auth)
):
    try:
        cotizacion = CotizacionesService.cambiar_estado(db, cotizacion_id, data.estado)
        if not cotizacion:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
        return {"ok": True, "estado": cotizacion.estado}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.patch("/{cotizacion_id}", response_model=CotizacionResponse)
def editar_cotizacion(
    cotizacion_id: int,
    data: CotizacionCreate,
    db: Session = Depends(get_db),
    token: TokenData = Depends(require_auth)
):
    try:
        cotizacion = CotizacionesService.editar(db, cotizacion_id, data, usuario_id=token.user_id)
        if not cotizacion:
            raise HTTPException(status_code=404, detail="Cotización no encontrada")
        return cotizacion
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))