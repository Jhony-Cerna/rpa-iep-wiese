from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    nombre: str
    correo: EmailStr
    rol: Optional[str] = "Secretaría"
    estado: Optional[bool] = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    correo: Optional[EmailStr] = None
    rol: Optional[str] = None
    estado: Optional[bool] = None
    password: Optional[str] = None


class UserInDBBase(UserBase):
    id: int
    fecha_creacion: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserResponse(UserInDBBase):
    pass
