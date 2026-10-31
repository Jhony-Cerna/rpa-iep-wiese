import os
import sys

sys.path.append(os.path.abspath('.'))
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/drive'
]

print("\n=======================================================")
print("🔐 AUTORIZACIÓN DE ESCRITURA EN GOOGLE DRIVE (RPA-IEP)")
print("=======================================================")
print("Se abrirá una pestaña en tu navegador.")
print("1. Selecciona tu cuenta: iepaugustowiese@gmail.com")
print("2. Haz clic en 'Continuar' / 'Permitir'")
print("=======================================================\n")

flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
creds = flow.run_local_server(port=0)

with open('token.json', 'w') as f:
    f.write(creds.to_json())

print("\n✅ ¡Autorización completada con éxito!")
print("El archivo token.json ahora tiene permisos para leer y modificar archivos en Google Drive.")
