from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import app.models
from app.routes import auth, productos, cotizaciones
from app.db.base import Base
from app.core.db import engine
from app.routes import usuarios
from app.scheduler import iniciar_scheduler, detener_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    iniciar_scheduler()       # arranca scheduler + primera sync
    yield
    detener_scheduler() # limpia al apagar

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(usuarios.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(productos.router, prefix="/api")
app.include_router(cotizaciones.router, prefix="/api")