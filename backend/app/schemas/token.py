from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str
    nombre: Optional[str] = None
    correo: Optional[str] = None
    rol: Optional[str] = None

class TokenPayload(BaseModel):
    sub: Optional[str] = None
