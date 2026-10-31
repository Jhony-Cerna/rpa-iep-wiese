from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from .user import UserResponse

class RequestBase(BaseModel):
    correo_solicitante: EmailStr
    nombre_solicitante: Optional[str] = None
    dni_estudiante: str
    grado: str
    tipo_solicitud: str = "Libreta de Notas"
    asunto: Optional[str] = None
    descripcion: Optional[str] = None
    prioridad: str = "Normal"

class RequestCreate(RequestBase):
    pass

class RequestUpdate(BaseModel):
    estado: Optional[str] = None
    prioridad: Optional[str] = None
    responsable_id: Optional[int] = None
    comentario_historial: Optional[str] = None

class RequestInDBBase(RequestBase):
    id: int
    estado: str
    fecha_recepcion: datetime
    fecha_creacion: datetime
    fecha_actualizacion: Optional[datetime] = None
    responsable_id: Optional[int] = None

    class Config:
        from_attributes = True

class RequestResponse(RequestInDBBase):
    responsable: Optional[UserResponse] = None
