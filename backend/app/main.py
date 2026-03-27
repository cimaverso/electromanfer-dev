from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import app.models
from app.routes import auth, productos
from app.db.base import Base
from app.core.db import engine
from app.routes import usuarios

app = FastAPI()

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