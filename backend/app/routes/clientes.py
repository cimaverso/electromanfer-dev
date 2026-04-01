from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.services.clientes import ClientesService
from app.schemas.clientes import ClienteResponse

router = APIRouter(prefix="/clientes", tags=["Clientes"])

@router.get("/", response_model=list[ClienteResponse])
def buscar_clientes(q: str = "", db: Session = Depends(get_db)):
    return ClientesService.buscar_clientes(db, q)