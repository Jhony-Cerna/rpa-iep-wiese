from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.security import get_password_hash
from app.api.router import api_router
from app.db.database import engine, Base, SessionLocal

# Importar TODOS los modelos para que Base los registre
import app.db.models  # noqa: F401
from app.db.models import User

# Crear tablas nuevas automáticamente (no borra las existentes)
Base.metadata.create_all(bind=engine)


def ensure_default_users() -> None:
    """Garantiza que existan las cuentas administrativas iniciales del colegio."""
    db = SessionLocal()
    try:
        defaults = [
            ("admin@colegio.edu.pe", "Administrador del Sistema", "Administrador", "Admin123!"),
            ("iepaugustowiese@gmail.com", "Dirección — IEP Augusto Wiese", "Administrador", "Wiese2026!"),
        ]
        for correo, nombre, rol, plain_pwd in defaults:
            exists = db.query(User).filter(User.correo == correo).first()
            if not exists:
                db.add(
                    User(
                        correo=correo,
                        nombre=nombre,
                        rol=rol,
                        hashed_password=get_password_hash(plain_pwd),
                        estado=True,
                    )
                )
        db.commit()
    finally:
        db.close()


ensure_default_users()

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
