# Sistema de Gestión Administrativa y RPA (IEP)

Este proyecto automatiza la recepción de solicitudes de libretas de notas vía Gmail, procesa archivos Excel almacenados en Google Drive, y genera documentos PDF conservando estrictamente el diseño institucional para finalmente enviarlos al solicitante.

## Estructura del Proyecto

- `backend/`: API construida con FastAPI y PostgreSQL. Maneja la persistencia, usuarios, solicitudes y estadísticas.
- `frontend/`: Interfaz web (Dashboard) construida con React, TypeScript y Tailwind CSS.
- `rpa_worker/`: Microservicio en Python que contiene la lógica core de automatización (Celery / Loop), manejo de Gmail API, Drive API y Excel COM (vía `pywin32`).

## Requisitos del Sistema

1. **PostgreSQL** (Para la base de datos).
2. **Microsoft Excel** instalado (El RPA utiliza la interfaz COM para imprimir a PDF de manera 100% fidedigna).
3. **Node.js y npm** (Para compilar el frontend).
4. **Python 3.10+** (Para el backend y el RPA).
5. Archivo **`credentials.json`** de Google Cloud Console (Habilitar Gmail API y Drive API).

---

## 1. Instalación del Backend

1. Ingresa a la carpeta `backend/`.
2. Crea y activa el entorno virtual:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Instala dependencias:
   ```bash
   pip install -r requirements.txt
   ```
4. Configura `.env` o modifica `backend/app/core/config.py` con tu conexión a PostgreSQL.
5. Genera y aplica migraciones de BD:
   ```bash
   alembic upgrade head
   ```
6. Crea el usuario administrador:
   ```bash
   python initial_data.py
   ```
7. Inicia el servidor:
   ```bash
   uvicorn app.main:app --reload
   ```

---

## 2. Instalación del Frontend

1. Ingresa a la carpeta `frontend/`.
2. Instala dependencias:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```

---

## 3. Instalación del RPA Worker

1. Ingresa a la carpeta `rpa_worker/`.
2. Crea y activa su entorno virtual:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Instala dependencias:
   ```bash
   pip install -r requirements.txt
   ```
4. **IMPORTANTE:** Coloca tu archivo `credentials.json` en la carpeta `rpa_worker/`.
5. Ejecuta las pruebas de conexión por primera vez (abrirá el navegador para login de Google):
   ```bash
   python test_connection.py
   ```
6. Para iniciar el ciclo de RPA (buscar correos y procesar):
   ```bash
   python core/rpa_logic.py
   ```

---

## Flujo del RPA
1. Lee bandeja de entrada (asuntos con "Solicitud Libreta - DNI XXXXXXXX - Yro Secundaria").
2. Avisa a FastAPI que la solicitud está "En proceso".
3. Descarga de Google Drive el archivo Excel del grado.
4. Exporta usando MS Excel local la pestaña correspondiente al DNI.
5. Envía el PDF a través de Gmail y marca el correo original como leído.
6. Avisa a FastAPI que la solicitud fue "Atendida" o si hubo "Error".
