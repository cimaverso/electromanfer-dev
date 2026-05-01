from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, FileResponse
import app.models
import os
import mimetypes
from app.routes import auth, productos, cotizaciones, multimedia, clientes, firmas, email_inbox
from app.db.base import Base
from app.core.db import engine
from app.routes import usuarios
from app.scheduler import iniciar_scheduler, detener_scheduler
from app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    iniciar_scheduler()
    yield
    detener_scheduler()

app = FastAPI(
    title="Electromanfer API",
    description="Sistema de cotizaciones Electromanfer Ltda.",
    version="1.0.0",
    lifespan=lifespan
)

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.electromanfer.com",
        "http://localhost:5173"
        
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
app.include_router(usuarios.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(productos.router, prefix="/api")
app.include_router(multimedia.router, prefix="/api")
app.include_router(cotizaciones.router, prefix="/api")
app.include_router(clientes.router, prefix="/api")
app.include_router(firmas.router, prefix="/api")
app.include_router(email_inbox.router, prefix="/api")

# Servir archivos de media (solo local — en prod lo maneja Nginx)
@app.get("/media/{file_path:path}", include_in_schema=False)
def servir_media(file_path: str):
    full_path = os.path.join(settings.MEDIA_BASE, file_path)
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    mime_type, _ = mimetypes.guess_type(full_path)
    return FileResponse(
        full_path,
        media_type=mime_type or "application/octet-stream",
        headers={"Access-Control-Allow-Origin": "*"}
    )