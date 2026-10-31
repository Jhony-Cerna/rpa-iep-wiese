import os
import sys
import openpyxl
from datetime import datetime as dt

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from googleapiclient.http import MediaFileUpload
from .drive_api import get_drive_service, download_excel_file


PADRON_FILE_ID = '1glaT8XTHhcVUVLQhxwP9g3rqCqbtvsdE'
TEMP_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'temp_files'))

def update_student_padron(dni: str, campo: str, nuevo_valor: str, codigo_solicitud: str = ""):
    """
    Descarga el Padrón de Drive, busca al estudiante/apoderado por DNI,
    actualiza el campo solicitado, coloca la fecha de actualización y código,
    y vuelve a subir el archivo actualizado a Google Drive.
    """
    if not os.path.exists(TEMP_DIR):
        os.makedirs(TEMP_DIR)
        
    temp_excel_path = os.path.join(TEMP_DIR, f"temp_padron_{dni}.xlsx")
    
    # 1. Descargar archivo actual desde Google Drive
    print(f"📥 Descargando Padrón oficial desde Drive (ID: {PADRON_FILE_ID})...")
    download_excel_file(PADRON_FILE_ID, temp_excel_path)
    
    # 2. Cargar con openpyxl
    wb = openpyxl.load_workbook(temp_excel_path)
    ws = wb.active
    
    # Mapeo de campos a columnas de Excel
    # 1: DNI_ESTUDIANTE, 2: ESTUDIANTE, 4: DNI_APODERADO, 5: APODERADO_RESPONSABLE,
    # 7: TELEFONO_CONTACTO, 8: CORREO_ELECTRONICO, 9: DIRECCION,
    # 11: FECHA_ULTIMA_ACTUALIZACION, 12: CODIGO_SOLICITUD
    col_map = {
        'telefono': 7,
        'teléfono': 7,
        'celular': 7,
        'correo': 8,
        'correo electrónico': 8,
        'email': 8,
        'direccion': 9,
        'dirección': 9,
        'domicilio': 9,
        'apoderado': 5,
        'nombre apoderado': 5,
        'estudiante': 2,
        'nombre': 2,
    }
    
    target_col = col_map.get(campo.lower().strip(), 7) # Por defecto teléfono si no coincide
    
    def _clean_val(v):
        if v is None:
            return ""
        if isinstance(v, (int, float)):
            return str(int(v))
        s = str(v).strip()
        if s.endswith('.0') and s[:-2].isdigit():
            s = s[:-2]
        return s

    # 3. Buscar la fila correspondiente al DNI
    target_row = None
    estudiante_nombre = ""
    valor_anterior = ""
    
    for row in range(2, ws.max_row + 1):
        dni_est = _clean_val(ws.cell(row=row, column=1).value)
        dni_apod = _clean_val(ws.cell(row=row, column=4).value)
        
        if dni == dni_est or dni == dni_apod:
            target_row = row
            estudiante_nombre = str(ws.cell(row=row, column=2).value or '')
            raw_ant = ws.cell(row=row, column=target_col).value
            valor_anterior = _clean_val(raw_ant) if target_col == 7 else str(raw_ant or '')
            break
            
    if not target_row:
        if os.path.exists(temp_excel_path):
            os.remove(temp_excel_path)
        raise ValueError(f"DNI {dni} no fue encontrado en el Padrón Oficial.")
        
    # 4. Actualizar celda
    ws.cell(row=target_row, column=target_col, value=nuevo_valor)
    ws.cell(row=target_row, column=11, value=dt.now().strftime("%Y-%m-%d %H:%M"))
    ws.cell(row=target_row, column=12, value=codigo_solicitud or "RPA-AUTO")
    
    wb.save(temp_excel_path)
    wb.close()
    print(f"✏️ Padrón modificado: Fila {target_row} ({estudiante_nombre}) -> Columna {target_col} cambiada de '{valor_anterior}' a '{nuevo_valor}'.")
    
    # 5. Subir archivo actualizado a Google Drive
    service = get_drive_service()
    media = MediaFileUpload(
        temp_excel_path,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        resumable=False
    )
    
    updated_file = service.files().update(
        fileId=PADRON_FILE_ID,
        media_body=media,
        fields='id, name, modifiedTime'
    ).execute()
    
    print(f"☁️ Archivo actualizado con éxito en Google Drive (ID: {updated_file.get('id')}).")
    
    # Liberar media y borrar archivo temporal de manera segura
    del media
    try:
        if os.path.exists(temp_excel_path):
            os.remove(temp_excel_path)
    except Exception:
        pass

        
    return {
        "status": "ok",
        "dni": dni,
        "estudiante": estudiante_nombre,
        "campo": campo,
        "valor_anterior": valor_anterior,
        "valor_nuevo": nuevo_valor,
        "fecha": dt.now().strftime("%Y-%m-%d %H:%M"),
        "codigo": codigo_solicitud
    }
