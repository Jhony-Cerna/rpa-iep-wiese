import os
import os.path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

# SCOPES requeridos para leer/enviar correos y leer/escribir en Google Drive
SCOPES = [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/drive'
]

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TOKEN_PATH = os.path.join(BASE_DIR, 'token.json')
CREDENTIALS_PATH = os.path.join(BASE_DIR, 'credentials.json')


def get_google_credentials():
    """Obtiene y refresca las credenciales de OAuth2 para Google APIs."""
    creds = None
    
    # Cargar token existente si está disponible
    if os.path.exists(TOKEN_PATH):
        try:
            creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
        except Exception:
            creds = None

    # Si no hay credenciales o no son válidas
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                print(f"⚠️ El token de acceso expiró o fue revocado ({e}).")
                print("🔄 Se solicitará inicio de sesión nuevamente en el navegador...")
                creds = None
                if os.path.exists(TOKEN_PATH):
                    try:
                        os.remove(TOKEN_PATH)
                    except Exception:
                        pass

        # Si aún no hay credenciales válidas, abrir flujo OAuth en navegador
        if not creds or not creds.valid:
            if not os.path.exists(CREDENTIALS_PATH):
                raise FileNotFoundError(
                    f"Falta el archivo credentials.json en: {CREDENTIALS_PATH}. "
                    "Por favor descárgalo desde Google Cloud Console."
                )
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_PATH, SCOPES)
            creds = flow.run_local_server(port=0)
            
            # Guardar credenciales para próximas ejecuciones
            with open(TOKEN_PATH, 'w') as token:
                token.write(creds.to_json())
            print(f"✅ Nuevo token guardado exitosamente en: {TOKEN_PATH}")

    return creds
