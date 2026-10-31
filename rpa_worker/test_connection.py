import os
import sys

# Añadimos la ruta actual al sistema para poder importar las integraciones
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from integrations.google_auth import get_google_credentials
from integrations.gmail_api import get_gmail_service
from integrations.drive_api import get_drive_service

def test_connections():
    print("Iniciando prueba de conexión con Google APIs...")
    
    try:
        # Esto disparará el flujo de OAuth 2.0 en el navegador si no existe token.json
        print("1. Verificando credenciales de OAuth 2.0...")
        creds = get_google_credentials()
        if creds and creds.valid:
            print("   ✅ Credenciales válidas obtenidas.")
        else:
            print("   ❌ Error: No se pudieron obtener credenciales válidas.")
            return

        # Probar Gmail API
        print("\n2. Probando conexión con Gmail API...")
        gmail_service = get_gmail_service()
        profile = gmail_service.users().getProfile(userId='me').execute()
        print(f"   ✅ Conexión exitosa a Gmail. Correo autenticado: {profile.get('emailAddress')}")

        # Probar Google Drive API
        print("\n3. Probando conexión con Google Drive API...")
        drive_service = get_drive_service()
        about = drive_service.about().get(fields="user").execute()
        print(f"   ✅ Conexión exitosa a Google Drive. Usuario: {about.get('user', {}).get('displayName')}")

        print("\n🎉 Todas las conexiones fueron exitosas. El RPA está listo para interactuar con Google Workspace.")
    
    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}")
        print("Asegúrate de colocar tu archivo 'credentials.json' descargado de Google Cloud Console en la carpeta 'rpa_worker'.")
    except Exception as e:
        print(f"\n❌ Ha ocurrido un error inesperado durante las pruebas: {e}")

if __name__ == "__main__":
    test_connections()
