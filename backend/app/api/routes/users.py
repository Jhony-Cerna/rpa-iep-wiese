from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api import deps
from app.core.security import get_password_hash
from app.db.models import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate

router = APIRouter()


@router.get("/", response_model=List[UserResponse])
def read_users(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """Lista todos los usuarios del sistema (solo Administradores)."""
    users = db.query(User).order_by(User.id.asc()).offset(skip).limit(limit).all()
    return users


@router.post("/", response_model=UserResponse)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """Crea un nuevo usuario en el sistema (solo Administradores)."""
    correo_clean = user_in.correo.strip().lower()
    existing = db.query(User).filter(func.lower(User.correo) == correo_clean).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un usuario registrado con ese correo electrónico.",
        )

    if len(user_in.password.strip()) < 6:
        raise HTTPException(
            status_code=400,
            detail="La contraseña debe tener al menos 6 caracteres.",
        )

    user = User(
        correo=correo_clean,
        nombre=user_in.nombre.strip(),
        rol=user_in.rol or "Secretaría",
        hashed_password=get_password_hash(user_in.password),
        estado=True if user_in.estado is None else user_in.estado,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    *,
    user_id: int,
    user_in: UserUpdate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """Actualiza datos, rol, contraseña o estado de un usuario (solo Administradores)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if user.id == current_user.id:
        if user_in.estado is False:
            raise HTTPException(
                status_code=400,
                detail="Por seguridad, no puedes desactivar tu propia cuenta en uso.",
            )
        if user_in.rol is not None and user_in.rol != "Administrador":
            raise HTTPException(
                status_code=400,
                detail="No puedes quitarte el rol de Administrador a ti mismo.",
            )

    if user_in.correo is not None:
        correo_clean = user_in.correo.strip().lower()
        duplicate = (
            db.query(User)
            .filter(func.lower(User.correo) == correo_clean, User.id != user_id)
            .first()
        )
        if duplicate:
            raise HTTPException(
                status_code=400,
                detail="Ese correo electrónico ya pertenece a otro usuario.",
            )
        user.correo = correo_clean

    if user_in.nombre is not None and user_in.nombre.strip():
        user.nombre = user_in.nombre.strip()

    if user_in.rol is not None:
        user.rol = user_in.rol

    if user_in.estado is not None:
        user.estado = user_in.estado

    if user_in.password is not None and user_in.password.strip():
        if len(user_in.password.strip()) < 6:
            raise HTTPException(
                status_code=400,
                detail="La nueva contraseña debe tener al menos 6 caracteres.",
            )
        user.hashed_password = get_password_hash(user_in.password)

    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/toggle-status", response_model=UserResponse)
def toggle_user_status(
    *,
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_admin),
) -> Any:
    """Activa o desactiva un usuario con un clic (solo Administradores)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Por seguridad, no puedes desactivar tu propia cuenta en uso.",
        )

    user.estado = not user.estado
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
def read_user_me(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Obtiene los datos del usuario autenticado."""
    return current_user
