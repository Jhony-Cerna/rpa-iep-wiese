from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.router import api_router
from app.db.database import engine, Base

# Importar TODOS los modelos para que Base los registre
import app.db.models  # noqa: F401

# Crear tablas nuevas automáticamente (no borra las existentes)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API para el Sistema de Gestión Administrativa con RPA — I.E.P. Augusto Wiese",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "API RPA-IEP v2.0 — Sistema de Gestión Administrativa"}
