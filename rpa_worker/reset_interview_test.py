import sys
import os
import sqlite3

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

sys.path.append(os.path.abspath('.'))
from integrations.gmail_api import get_gmail_service

MSG_ID = "1a169b12b59db1ba"

# 1. Limpiar en base de datos SQLite
db_path = os.path.abspath("../backend/rpa_iep.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT id, codigo, tipo_solicitud FROM requests WHERE gmail_message_id = ?", (MSG_ID,))
row = cur.fetchone()
if row:
    req_id, codigo, tipo = row
    print(f"Eliminando registro erroneo: ID={req_id}, Codigo={codigo}, Tipo={tipo}")
    cur.execute("DELETE FROM request_history WHERE request_id = ?", (req_id,))
    cur.execute("DELETE FROM requests WHERE id = ?", (req_id,))
    conn.commit()
    print("Registro eliminado de la base de datos.")
else:
    print("No se encontro registro en BD con ese message_id.")
conn.close()

# 2. Marcar correo como NO LEIDO en Gmail
try:
    service = get_gmail_service()
    service.users().messages().modify(
        userId='me',
        id=MSG_ID,
        body={'addLabelIds': ['UNREAD']}
    ).execute()
    print("OK: Correo marcado nuevamente como NO LEIDO en Gmail.")
except Exception as e:
    print("Error al marcar como no leido:", e)

