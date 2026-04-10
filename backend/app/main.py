from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
import app.models
import os
from app.routes import auth, productos, cotizaciones, multimedia, clientes
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
        "http://localhost:5173",
        "http://localhost:3000",
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

# Servir archivos de media (solo local — en prod lo maneja Nginx)
if os.path.exists(settings.MEDIA_BASE):
    app.mount("/media", StaticFiles(directory=settings.MEDIA_BASE), name="media")