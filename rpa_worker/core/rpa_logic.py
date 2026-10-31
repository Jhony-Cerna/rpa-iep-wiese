import os
import re
import uuid
import sys
import time
from datetime import datetime
import argparse
import email.utils
import requests
import traceback
from dotenv import load_dotenv

# Cargar variables de entorno desde rpa_worker/.env si existe
load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env')))

# Ajuste de PYTHONPATH para imports absolutos
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')


from integrations.gmail_api import fetch_unread_requests, send_email_with_pdf, send_plain_email, mark_as_read
from integrations.drive_api import search_excel_file_by_name, download_excel_file
from integrations.padron_updater import update_student_padron
from excel_processor.pdf_exporter import export_sheet_to_pdf

TEMP_FOLDER = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'temp_files'))

_raw_api_url = os.getenv("API_BASE_URL", "http://127.0.0.1:8000/api").strip().rstrip("/")
if not _raw_api_url.endswith("/api"):
    _raw_api_url = f"{_raw_api_url}/api"
API_BASE_URL = _raw_api_url


def extract_dni_and_grade_from_subject(subject: str, snippet: str = ""):
    text = f"{subject} {snippet}"
    dni = None
    grado = None
    
    dni_match = re.search(r'\b\d{8}\b', text)
    if dni_match:
        dni = dni_match.group(0)
        
    grado_match = re.search(r'([1-5])(ro|do|ero|to|vo|°|er|\.º|\.o)?\s+(de\s+|grado\s+de\s+|grado\s+)?secundaria', text, re.IGNORECASE)
    if grado_match:
        grado_num = grado_match.group(1)
        grado = f"{grado_num}.º de secundaria.xlsx"
        
    return dni, grado


def extract_actualizacion_data(text: str):
    """
    Extrae DNI, tipo de campo y nuevo valor de un texto (asunto + cuerpo del correo).
    """
    # 1. DNI (8 dígitos continuos)
    dni_match = re.search(r'\b\d{8}\b', text)
    dni = dni_match.group(0) if dni_match else None

    campo = "Teléfono"
    nuevo_valor = None

    # 2. Buscar Teléfono / Celular
    tel_match = re.search(r'(?:tel[eé]fono|celular|movil|móvil|número|numero)[\s:=]+(\d{7,11})', text, re.IGNORECASE)
    if tel_match:
        campo = "Teléfono"
        nuevo_valor = tel_match.group(1).strip()

    # 3. Buscar Correo / Email
    if not nuevo_valor:
        correo_match = re.search(r'(?:correo|email|nuevo correo)[\s:=]+([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)', text, re.IGNORECASE)
        if correo_match:
            campo = "Correo"
            nuevo_valor = correo_match.group(1).strip()

    # 4. Buscar Dirección / Domicilio
    if not nuevo_valor:
        dir_match = re.search(r'(?:direcci[oó]n|domicilio)[\s:=]+([^\n\r]+)', text, re.IGNORECASE)
        if dir_match:
            campo = "Dirección"
            nuevo_valor = dir_match.group(1).strip()

    # Si hay un número suelto de 9 dígitos que no sea el DNI, inferir teléfono
    if not nuevo_valor:
        numeros = re.findall(r'\b9\d{8}\b', text)
        for n in numeros:
            if n != dni:
                campo = "Teléfono"
                nuevo_valor = n
                break

    return dni, campo, nuevo_valor


def classify_request(subject: str, snippet: str = ""):
    """
    Clasifica el tipo de solicitud analizando el asunto y el contenido del correo.
    Retorna (tipo_solicitud, area_responsable)
    """
    text = f"{subject} {snippet}".lower()

    # 1. Entrevistas / Citas / Reuniones (Alta prioridad de intención)
    if any(k in text for k in ["entrevista", "cita", "reunion", "reunión", "reunirme"]):
        area = "Tutoría"
        if "direcci" in text:
            area = "Dirección"
        elif "psicol" in text:
            area = "Psicología"
        elif "secretar" in text:
            area = "Secretaría"
        elif "tutor" in text or "profesor" in text or "docente" in text:
            area = "Tutoría"
        return "Entrevista", area

    # 2. Reclamos / Disconformidad
    if any(k in text for k in ["reclamo", "reclamar", "disconformidad", "queja formal", "cobro indebido"]):
        area = "Dirección"
        if any(k in text for k in ["cobro", "pension", "pensión", "pago", "cuota", "caja", "tesoreria", "tesorería", "dinero", "banco", "transferencia", "duplicidad"]):
            area = "Tesorería"
        elif any(k in text for k in ["docente", "profesor", "profesora", "nota", "examen", "tarea", "clase"]):
            area = "Coordinación Académica"
        elif any(k in text for k in ["infraestructura", "baño", "limpieza", "aula", "mantenimiento"]):
            area = "Mantenimiento"
        elif any(k in text for k in ["secretar", "certificado", "constancia", "tramite", "trámite"]):
            area = "Secretaría"
        return "Reclamo", area

    # 3. Quejas o Sugerencias
    if any(k in text for k in ["sugerencia", "sugiero", "queja", "propuesta", "buzon", "buzón", "felicitacion", "felicitación", "mejora"]):
        area = "Dirección"
        if any(k in text for k in ["docente", "profesor", "profesora", "clase", "enseñanza"]):
            area = "Coordinación Académica"
        elif any(k in text for k in ["limpieza", "baño", "infraestructura", "mantenimiento", "patio"]):
            area = "Mantenimiento"
        elif any(k in text for k in ["cobro", "pension", "pensión", "pago", "cuota"]):
            area = "Tesorería"
        elif any(k in text for k in ["horario", "atencion", "atención", "ventanilla", "secretar"]):
            area = "Secretaría"
        return "Queja o Sugerencia", area

    # 4. Actualización de datos
    if any(k in text for k in ["actualiz", "corregir dato", "cambio de dato", "rectific", "modificar dato", "cambiar dato", "cambio de telefono", "cambio de correo", "cambio de direccion"]):
        return "Actualizacion de Datos", "Secretaría"

    # 5. Libreta de notas (Solo si pide explícitamente "libreta", "boleta", o tiene DNI + grado en asunto)
    dni, grado = extract_dni_and_grade_from_subject(subject)
    if "libreta" in text or "boleta" in text or (dni and grado):
        return "Libreta de Notas", "Secretaría"

    # 6. Consultas (orientación general, preguntas sobre matrícula, pensión, notas, etc.)
    if any(k in text for k in ["consulta", "pregunta", "duda", "informacion", "información", "matricula", "matrícula", "costo", "pension", "pensión", "requisito", "notas"]):
        return "Consulta", "Secretaría"

    # Por defecto
    return "Consulta", "Secretaría"


def notify_backend_status(request_data):
    """
    Envía los datos de la solicitud y su estado actual al Backend para 
    alimentar el Dashboard y los módulos correspondientes.
    """
    try:
        url = f"{API_BASE_URL}/requests/rpa-sync"
        response = requests.post(url, json=request_data, timeout=60)
        if response.status_code == 200:
            res_json = response.json()
            codigo = res_json.get("codigo", "")
            print(f"📦 [AUDITORÍA DB] Sincronizado: {request_data.get('estado')} | Código: {codigo}")
            return res_json
        else:
            print(f"⚠️ Error del servidor al sincronizar: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error comunicando con backend: {e}")
        return None


def process_libreta_flow(correo_info, dni, excel_filename):
    """
    Flujo RPA completo automatizado para emisión y envío de libreta de notas.
    """
    request_data = {
        "gmail_message_id": correo_info['id'],
        "correo_solicitante": correo_info['remitente'],
        "tipo_solicitud": "Libreta de Notas",
        "dni_estudiante": dni or "DESCONOCIDO",
        "grado": excel_filename or "DESCONOCIDO",
        "asunto": correo_info['asunto'],
        "estado": "En proceso",
        "area_responsable": "Secretaría",
    }
    notify_backend_status(request_data)

    if not dni or not excel_filename:
        print("❌ Error: No se pudo extraer DNI o Grado del asunto. Requiere revisión manual.")
        request_data["estado"] = "Requiere revisión manual"
        request_data["error"] = "DNI o Grado no detectado en el asunto."
        notify_backend_status(request_data)
        mark_as_read(correo_info['id'])
        return False

    print(f"Buscando archivo en Drive: {excel_filename} para DNI: {dni}")
    drive_file = search_excel_file_by_name(excel_filename)
    if not drive_file:
        print(f"❌ Error: Archivo '{excel_filename}' inexistente en Drive.")
        request_data["estado"] = "Error"
        request_data["error"] = "Archivo de Excel no encontrado en Drive."
        notify_backend_status(request_data)
        return False

    temp_excel_path = os.path.join(TEMP_FOLDER, f"{uuid.uuid4()}_{excel_filename}")
    print(f"Descargando archivo {drive_file['id']}...")
    download_excel_file(drive_file['id'], temp_excel_path)

    pdf_filename = f"Libreta_{dni}.pdf"
    temp_pdf_path = os.path.join(TEMP_FOLDER, pdf_filename)

    try:
        print(f"Exportando pestaña {dni} a PDF...")
        export_sheet_to_pdf(temp_excel_path, dni, temp_pdf_path)
    except Exception as e:
        print(f"❌ Error en la generación del PDF: {e}")
        request_data["estado"] = "Error"
        request_data["error"] = f"Fallo al exportar PDF: Pestaña no encontrada o error de Excel. ({str(e)})"
        notify_backend_status(request_data)
        if os.path.exists(temp_excel_path): os.remove(temp_excel_path)
        return False

    try:
        print(f"Enviando correo a {correo_info['remitente']}...")
        body = (
            f"Estimado(a) Padre/Madre/Apoderado,\n\n"
            f"Se adjunta la libreta de notas oficial correspondiente al estudiante "
            f"con DNI {dni}.\n\n"
            f"Institución Educativa Particular Augusto Wiese.\n"
            f"Atención automatizada por sistema RPA-IEP."
        )
        send_email_with_pdf(
            to_email=correo_info['remitente'],
            subject=f"Libreta de Notas - DNI {dni}",
            body=body,
            pdf_path=temp_pdf_path,
            pdf_filename=pdf_filename
        )
        print("✅ Correo enviado con éxito.")

        request_data["estado"] = "Atendida"
        notify_backend_status(request_data)
        mark_as_read(correo_info['id'])
        print("✅ Correo marcado como leído.")
        return True

    except Exception as e:
        print(f"❌ Error al enviar el correo: {e}")
        request_data["estado"] = "Error"
        request_data["error"] = f"Fallo al enviar correo: {str(e)}"
        notify_backend_status(request_data)
        return False

    finally:
        import time
        for p in [temp_excel_path, temp_pdf_path]:
            if p and os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    time.sleep(0.3)
                    try:
                        os.remove(p)
                    except Exception:
                        pass


def process_actualizacion_flow(correo_info):
    """
    Flujo RPA completo para Actualización de Datos:
    1. Extrae DNI, campo y nuevo valor.
    2. Modifica el Padrón oficial en Google Drive.
    3. Registra en base de datos como Atendida.
    4. Envía correo de confirmación con los datos actualizados.
    """
    print(f"🔄 Iniciando procesamiento RPA de Actualización de Datos...")
    full_text = f"{correo_info['asunto']} {correo_info.get('snippet', '')}"
    dni, campo, nuevo_valor = extract_actualizacion_data(full_text)

    request_data = {
        "gmail_message_id": correo_info['id'],
        "correo_solicitante": correo_info['remitente'],
        "tipo_solicitud": "Actualizacion de Datos",
        "dni_estudiante": dni or "—",
        "asunto": correo_info['asunto'],
        "estado": "En proceso",
        "area_responsable": "Secretaría",
        "canal_origen": "Gmail",
    }

    res = notify_backend_status(request_data)
    codigo = res.get("codigo", "") if res else ""

    if not dni or not nuevo_valor:
        print(f"⚠️ Datos insuficientes en el correo: DNI={dni}, Campo={campo}, Valor={nuevo_valor}")
        request_data["estado"] = "Requiere revisión manual"
        request_data["error"] = "DNI o nuevo valor no especificado claramente en el correo."
        notify_backend_status(request_data)
        mark_as_read(correo_info['id'])
        return False

    try:
        print(f"✏️ Modificando Padrón oficial en Drive para DNI {dni} -> {campo}: '{nuevo_valor}'...")
        update_res = update_student_padron(dni=dni, campo=campo, nuevo_valor=nuevo_valor, codigo_solicitud=codigo)

        estudiante_nombre = update_res.get("estudiante", "Estudiante")
        valor_ant = update_res.get("valor_anterior", "—")

        # Actualizar estado a Atendida en base de datos
        request_data["estado"] = "Atendida"
        request_data["observaciones"] = f"Campo {campo} actualizado de '{valor_ant}' a '{nuevo_valor}'."
        notify_backend_status(request_data)

        # Enviar confirmación al solicitante
        body = (
            f"Estimado(a) Padre/Madre/Apoderado,\n\n"
            f"Le confirmamos que su solicitud de actualización de datos ha sido PROCESADA Y REGISTRADA EXITOSAMENTE en el Padrón Oficial de la institución.\n\n"
            f"Detalle de la actualización:\n"
            f"- Código de solicitud: {codigo}\n"
            f"- Estudiante: {estudiante_nombre}\n"
            f"- DNI: {dni}\n"
            f"- Campo modificado: {campo}\n"
            f"- Nuevo valor registrado: {nuevo_valor}\n"
            f"- Fecha y hora de atención: {update_res.get('fecha')}\n\n"
            f"Atentamente,\n"
            f"Secretaría Académica — I.E.P. Augusto Wiese\n"
            f"Atención automatizada por Sistema RPA-IEP."
        )
        send_plain_email(
            to_email=correo_info['remitente'],
            subject=f"Confirmación de Actualización de Datos - {codigo}",
            body=body
        )
        print(f"✅ Correo de confirmación enviado a {correo_info['remitente']}.")
        mark_as_read(correo_info['id'])
        print("✅ Correo marcado como leído.")
        return True

    except Exception as e:
        print(f"❌ Error al actualizar padrón en Drive: {e}")
        request_data["estado"] = "Error"
        request_data["error"] = str(e)
        notify_backend_status(request_data)
        return False


def process_other_module_flow(correo_info, tipo_solicitud, area_responsable):
    """
    Clasifica y registra solicitudes de otros módulos administrativos (Consultas, Entrevistas, Reclamos, Quejas).
    Registra en BD, envía acuse de recibo y marca como leído.
    """
    print(f"Clasificado automáticamente como: '{tipo_solicitud}' → Área: '{area_responsable}'")

    nombre_limpio, correo_limpio = email.utils.parseaddr(correo_info['remitente'])
    if not correo_limpio:
        correo_limpio = correo_info['remitente']
    if not nombre_limpio:
        nombre_limpio = correo_limpio.split('@')[0].replace('.', ' ').title()

    descripcion_correo = correo_info.get('snippet', '') or correo_info['asunto']

    request_data = {
        "gmail_message_id": correo_info['id'],
        "correo_solicitante": correo_limpio,
        "nombre_solicitante": nombre_limpio,
        "tipo_solicitud": tipo_solicitud,
        "asunto": correo_info['asunto'],
        "descripcion": descripcion_correo,
        "estado": "Recibida" if tipo_solicitud != "Reclamo" else "Recibido",
        "area_responsable": area_responsable,
        "canal_origen": "Gmail",
    }

    res = notify_backend_status(request_data)
    codigo = res.get("codigo", "") if res else ""

    # Enviar acuse de recibo al usuario
    try:
        if tipo_solicitud == "Queja o Sugerencia":
            tipo_label = "su sugerencia o queja institucional"
            estado_texto = "Recibida / En revisión"
        elif tipo_solicitud == "Reclamo":
            tipo_label = "su reclamo formal"
            estado_texto = "Recibido / En evaluación"
        elif tipo_solicitud == "Entrevista":
            tipo_label = "su solicitud de entrevista / reunión"
            estado_texto = "Recibida / En coordinación"
        else:
            tipo_label = f"su solicitud de tipo '{tipo_solicitud}'"
            estado_texto = "Recibida / En evaluación"

        subject_reply = f"Constancia de recepción - {codigo or tipo_solicitud}"
        body_reply = (
            f"Estimado(a) {nombre_limpio},\n\n"
            f"Hemos recibido {tipo_label} enviada a nuestra institución.\n\n"
            f"Detalles registrados:\n"
            f"- Código de seguimiento: {codigo or 'En asignación'}\n"
            f"- Asunto: {correo_info['asunto']}\n"
            f"- Área derivada: {area_responsable}\n"
            f"- Estado actual: {estado_texto}\n\n"
            f"Detalle recibido:\n"
            f"\"{descripcion_correo}\"\n\n"
            f"Nuestro personal evaluará su comunicación y le brindará respuesta formal a la brevedad.\n\n"
            f"Atentamente,\n"
            f"Secretaría Académica — I.E.P. Augusto Wiese\n"
            f"Atención automatizada por Sistema RPA-IEP."
        )
        send_plain_email(
            to_email=correo_limpio,
            subject=subject_reply,
            body=body_reply
        )
        print(f"✉️ Acuse de recibo enviado al remitente ({correo_limpio}).")
    except Exception as e:
        print(f"⚠️ No se pudo enviar el acuse de recibo: {e}")

    mark_as_read(correo_info['id'])
    print("✅ Correo marcado como leído.")
    return True


def process_single_request(correo_info):
    print(f"\n--- Procesando correo ID: {correo_info['id']} ---")
    print(f"Remitente: {correo_info['remitente']}")
    print(f"Asunto: {correo_info['asunto']}")

    tipo_solicitud, area_responsable = classify_request(correo_info['asunto'], correo_info.get('snippet', ''))

    if tipo_solicitud == "Libreta de Notas":
        dni, excel_filename = extract_dni_and_grade_from_subject(correo_info['asunto'], correo_info.get('snippet', ''))
        return process_libreta_flow(correo_info, dni, excel_filename)
    elif tipo_solicitud == "Actualizacion de Datos":
        return process_actualizacion_flow(correo_info)
    else:
        return process_other_module_flow(correo_info, tipo_solicitud, area_responsable)


def run_rpa_cycle():
    """
    Ejecuta un ciclo individual de escaneo y procesamiento de solicitudes.
    """
    if not os.path.exists(TEMP_FOLDER):
        os.makedirs(TEMP_FOLDER)

    print("Buscando nuevas solicitudes en Gmail...")
    try:
        correos = fetch_unread_requests()
        if not correos:
            print("No hay nuevas solicitudes pendientes.")
            return

        print(f"Se encontraron {len(correos)} solicitudes nuevas.")
        for correo in correos:
            process_single_request(correo)
    except Exception as e:
        print(f"Error general en el ciclo RPA: {e}")
        traceback.print_exc()


def run_continuous_daemon(interval: int = 15):
    """
    Mantiene el robot en ejecución continua, sondeando Gmail cada `interval` segundos.
    Permite atender automáticamente cualquier solicitud sin intervención manual.
    Se detiene limpiamente presionando Ctrl + C.
    """
    if not os.path.exists(TEMP_FOLDER):
        os.makedirs(TEMP_FOLDER)

    print("=" * 65)
    print("🤖 SERVICIO RPA-IEP — MODO MONITOREO CONTINUO ACTIVO")
    print("=" * 65)
    print(f"🌐 Backend API conectado: {API_BASE_URL}")
    print(f"📡 Monitoreando bandeja de entrada en Gmail cada {interval} segundos...")
    print(f"🎯 Módulos activos: Libreta de Notas, Actualización, Consultas,")
    print(f"                   Entrevistas, Reclamos, Quejas y Sugerencias")
    print(f"⏹️ Para detener el robot presiona [Ctrl + C] en cualquier momento.")
    print("=" * 65)

    ciclo = 1
    while True:
        try:
            ahora = datetime.now().strftime("%H:%M:%S")
            print(f"\n[{ahora} | Ciclo #{ciclo}] 🔍 Verificando nuevas solicitudes en Gmail...")

            correos = fetch_unread_requests()
            if not correos:
                print(f"[{ahora}] 💤 No hay nuevas solicitudes pendientes.")
            else:
                print(f"[{ahora}] 📥 Se encontraron {len(correos)} solicitudes nuevas para procesar:")
                for correo in correos:
                    process_single_request(correo)

            ciclo += 1

        except KeyboardInterrupt:
            print("\n\n🛑 [APAGADO] Robot RPA detenido de manera segura por el usuario.")
            break
        except Exception as e:
            print(f"⚠️ Error inesperado en el ciclo de monitoreo: {e}")
            traceback.print_exc()

        # Intervalo de espera con interrupción instantánea en Ctrl+C
        try:
            for _ in range(interval):
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n\n🛑 [APAGADO] Robot RPA detenido de manera segura por el usuario.")
            break


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Robot RPA - I.E.P. Augusto Wiese")
    parser.add_argument(
        "--once",
        action="store_true",
        help="Ejecutar un solo escaneo y terminar (modo prueba manual)"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=15,
        help="Segundos de espera entre cada sondeo a Gmail (por defecto: 15s)"
    )
    args = parser.parse_args()

    if args.once:
        run_rpa_cycle()
    else:
        run_continuous_daemon(interval=args.interval)
