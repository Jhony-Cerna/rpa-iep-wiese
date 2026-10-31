from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security
from app.core.config import settings
from app.db.models import User
from app.schemas.token import Token

router = APIRouter()


class LoginRequest(BaseModel):
    correo: str
    password: str


def _authenticate_user(db: Session, correo: str, password: str) -> User:
    email_clean = correo.strip().lower()
    user = db.query(User).filter(func.lower(User.correo) == email_clean).first()
    if not user or not security.verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    if not user.estado:
        raise HTTPException(
            status_code=403,
            detail="Tu cuenta se encuentra desactivada por el Administrador.",
        )
    return user


def _build_token_response(user: User) -> dict:
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
        "nombre": user.nombre,
        "correo": user.correo,
        "rol": user.rol,
    }


@router.post("/login", response_model=Token)
def login_access_token(
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    """Autenticación OAuth2 estándar por formulario."""
    user = _authenticate_user(db, form_data.username, form_data.password)
    return _build_token_response(user)


@router.post("/login-json", response_model=Token)
def login_json(
    payload: LoginRequest,
    db: Session = Depends(deps.get_db),
) -> Any:
    """Autenticación directa por JSON desde el panel web."""
    user = _authenticate_user(db, payload.correo, payload.password)
    return _build_token_response(user)


@router.get("/me")
def get_me(current_user: User = Depends(deps.get_current_user)) -> Any:
    """Devuelve los datos del usuario autenticado actual."""
    return {
        "id": current_user.id,
        "nombre": current_user.nombre,
        "correo": current_user.correo,
        "rol": current_user.rol,
    }
