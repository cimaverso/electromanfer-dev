from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.services.clientes import ClientesService
from app.schemas.clientes import ClienteResponse
from app.schemas.auth import TokenData
from app.core.security import require_auth


router = APIRouter(prefix="/clientes", tags=["Clientes"])

@router.get("/", response_model=list[ClienteResponse])
def buscar_clientes(
    q: str = "", 
    db: Session = Depends(get_db),
    _: TokenData = Depends(require_auth)
    
):
    return ClientesService.buscar_clientes(db, q)