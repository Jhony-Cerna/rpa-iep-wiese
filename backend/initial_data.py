import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.db.database import SessionLocal
from app.db.models import User
from app.core.security import get_password_hash

def init_db() -> None:
    db = SessionLocal()
    
    # Check if admin exists
    user = db.query(User).filter(User.correo == "admin@colegio.edu.pe").first()
    if not user:
        user = User(
            correo="admin@colegio.edu.pe",
            nombre="Administrador del Sistema",
            rol="Administrador",
            hashed_password=get_password_hash("Admin123!"),
            estado=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print("Usuario administrador creado exitosamente.")
        print("Correo: admin@colegio.edu.pe")
        print("Contraseña: Admin123!")
    else:
        print("El usuario administrador ya existe.")
    
    db.close()

if __name__ == "__main__":
    print("Creando datos iniciales...")
    init_db()
